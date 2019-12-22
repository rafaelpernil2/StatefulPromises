import { ERROR_MSG } from './constants/global-constants';
import { IAnyObject } from './interfaces/i-any-object';
import { ICustomPromise } from './interfaces/i-custom-promise';
import { PromiseBatchStatus } from './promise-batch-status';
import { DataUtil } from './utils/data-util';

export class PromiseBatch {
  public statusObject: PromiseBatchStatus;
  public customPromiseList: IAnyObject;
  public batchResponse: IAnyObject;

  constructor(statusObject?: PromiseBatchStatus) {
    this.statusObject = statusObject ?? new PromiseBatchStatus();
    this.customPromiseList = {} as IAnyObject;
    this.batchResponse = {} as IAnyObject;
  }

  public add<T>(customPromise: ICustomPromise<T>) {
    if (!this.customPromiseList.hasOwnProperty(customPromise.name)) {
      this.customPromiseList[customPromise.name] = customPromise;
    }
  }

  public addList(customPromiseList: Array<ICustomPromise<unknown>>) {
    customPromiseList.forEach(promise => {
      this.customPromiseList[promise.name] = promise;
    });
  }

  public build<T>(nameOrCustomPromise: string | ICustomPromise<T>): PromiseLike<T> {
    const customPromise = typeof nameOrCustomPromise === 'string' ? this.customPromiseList[nameOrCustomPromise] : nameOrCustomPromise;
    this.add(customPromise);
    return DataUtil.buildStatefulPromise<T>(customPromise, this.statusObject);
  }

  public promiseAll(concurrentLimit?: number): Promise<IAnyObject> {
    this.buildAll(concurrentLimit);
    return new Promise<IAnyObject>(async (resolve, reject) => {
      if (await this.isFulfilled()) {
        resolve(this.getBatchResponse());
      } else {
        reject(`${ERROR_MSG.SOME_PROMISE_REJECTED}: ${this.statusObject.getFailedPromisesList()}`);
      }
    });
  }

  public promiseAny(concurrentLimit?: number): Promise<IAnyObject> {
    this.buildAll(concurrentLimit);
    return new Promise<IAnyObject>(async (resolve, reject) => {
      if (await this.isCompleted()) {
        resolve(this.getBatchResponse());
      } else {
        reject(ERROR_MSG.SOME_PROMISE_STILL_RUNNING);
      }
    });
  }

  public retryFailed(concurrentLimit?: number): Promise<IAnyObject> {
    this.filterFulfilledPromises();
    this.statusObject.resetFailedPromises();
    return this.promiseAll(concurrentLimit);
  }

  public getBatchResponse(): IAnyObject {
    return this.batchResponse;
  }

  public finishAllPromises() {
    Object.keys(this.customPromiseList).forEach(promise => {
      if (this.statusObject.getStatusList()[promise]) {
        this.finishPromise(promise);
      }
    });
  }

  public finishPromise<T>(nameOrCustomPromise: string | ICustomPromise<T>) {
    const promiseName = typeof nameOrCustomPromise === 'string' ? nameOrCustomPromise : nameOrCustomPromise.name;
    // This makes sure the done callback is executed without race conditions
    if (!this.customPromiseList[promiseName].doneCallback) {
      this.statusObject.notifyAsFinished(promiseName);
    }
  }

  public async isCompleted(): Promise<boolean> {
    return await DataUtil.isPromiseBatchCompleted(this.statusObject);
  }

  public async isFulfilled(): Promise<boolean> {
    return await DataUtil.isPromiseBatchFulfilled(this.statusObject);
  }

  public reset() {
    this.batchResponse = {};
    this.statusObject.reset();
  }

  private async buildAll(concurrentLimit?: number) {
    const promisesInProgress = [];
    const promiseList = Object.keys(this.customPromiseList);
    // Initialize the status in all promises because they cannot be handled otherwise
    promiseList.forEach(promiseName => {
      this.statusObject.initStatus(promiseName);
    });
    // Set concurrent limit if provided and make sure it is within the amount of promises to process
    const execLimit = concurrentLimit && concurrentLimit <= promiseList.length ? concurrentLimit : promiseList.length;
    // We remove the initial promises are going to queue
    const awaitingPromises = promiseList.slice(execLimit, promiseList.length);
    // Initialization of promises
    for (let index = 0; index < execLimit; index++) {
      const promise = this.customPromiseList[promiseList[index]];
      promisesInProgress.push(this.buildAllRec(promise, awaitingPromises));
    }
    // Await promises
    for (const promise of promisesInProgress) {
      // No data processing here
      await promise;
    }
  }

  private async buildAllRec<T>(customPromise: ICustomPromise<T>, promiseNameList: string[]): Promise<IAnyObject> {
    let result = {} as Promise<IAnyObject> | IAnyObject;
    const awaitingPromiseList = promiseNameList;
    if (!customPromise || !customPromise.function) {
      throw new Error(ERROR_MSG.NO_PROMISE_FUNCTION);
    }
    // Call the builder and wait until promise ends
    const promiseResult = await this.promiseTryCatch(customPromise);
    // Add property to batchResponse if the property does not exist or if the result was cached
    if (!this.batchResponse.hasOwnProperty(customPromise.name) || !customPromise.lazyMode) {
      this.batchResponse[customPromise.name] = promiseResult;
    }
    // If there any left promises to process...
    if (awaitingPromiseList.length) {
      // The next promise is loaded and removed from promiseList and if it was provided successfully, it is queued
      const nextPromiseName = awaitingPromiseList.shift();
      if (nextPromiseName) {
        const nextPromise = this.customPromiseList[nextPromiseName];
        result = this.buildAllRec(nextPromise, awaitingPromiseList);
      }
    } else {
      result = promiseResult;
    }
    return result;
  }

  private async promiseTryCatch<T>(customPromise: ICustomPromise<T>) {
    try {
      return await this.build<T>(customPromise);
    } catch (error) {
      // Even if the promise is rejected, we save the error value;
      return error;
    }
  }

  private filterFulfilledPromises() {
    const failedList = this.statusObject.getFailedPromisesList();
    Object.keys(this.customPromiseList).forEach(promiseName => {
      if (!failedList.includes(promiseName)) {
        delete this.customPromiseList[promiseName];
      }
    });
  }
}
