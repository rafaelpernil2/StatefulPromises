import { BATCH_MODE, ERROR_MSG, NO_RESULT, PROMISE_STATUS } from './constants/global-constants';
import { IAnyObject } from './interfaces/i-any-object';
import { ICustomPromise } from './interfaces/i-custom-promise';
import { PromiseBatchStatus } from './promise-batch-status';
import { DataUtil } from './utils/data-util';

type BatchMode = typeof BATCH_MODE[keyof typeof BATCH_MODE];

export class PromiseBatch {
  public statusObject: PromiseBatchStatus;
  public customPromiseList: IAnyObject;
  public batchResponse: IAnyObject;

  constructor(statusObject?: PromiseBatchStatus) {
    this.statusObject = statusObject ?? new PromiseBatchStatus();
    this.customPromiseList = {};
    this.batchResponse = {};
  }

  public add<T>(customPromise: ICustomPromise<T>) {
    if (!this.customPromiseList.hasOwnProperty(customPromise.name)) {
      this.customPromiseList[customPromise.name] = customPromise;
    }
  }

  public addList(customPromiseList: Array<ICustomPromise<unknown>>) {
    customPromiseList.forEach(promise => {
      this.add(promise);
    });
  }

  public async exec<T>(nameOrCustomPromise: string | ICustomPromise<T>): Promise<T> {
    const customPromise = DataUtil.getPromiseData(this.customPromiseList, nameOrCustomPromise);
    this.add(customPromise);
    const result = await this.doExec<T>(customPromise);
    return this.buildDataPromiseByStatus(customPromise, result);
  }

  public async promiseAll(concurrentLimit?: number): Promise<IAnyObject> {
    return this.doExecAll(this.customPromiseList, BATCH_MODE.ALL, concurrentLimit);
  }

  public async promiseAny(concurrentLimit?: number): Promise<IAnyObject> {
    return this.doExecAll(this.customPromiseList, BATCH_MODE.ANY, concurrentLimit);
  }

  public async retryFailed(concurrentLimit?: number): Promise<IAnyObject> {
    const failedPromises = this.filterFulfilledPromises();
    this.statusObject.resetFailedPromises();
    const result = await this.doExecAll(failedPromises, BATCH_MODE.ALL, concurrentLimit);
    return result;
  }

  public finishPromise<T>(nameOrCustomPromise: string | ICustomPromise<T>) {
    const promiseName = DataUtil.getPromiseName(nameOrCustomPromise);
    // This makes sure the done callback is executed without race conditions
    if (!this.customPromiseList[promiseName].doneCallback) {
      this.statusObject.notifyAsFinished(promiseName);
    }
  }

  public finishAllPromises() {
    Object.keys(this.customPromiseList).forEach(promise => {
      if (this.statusObject.getStatusList()[promise]) {
        this.finishPromise(promise);
      }
    });
  }

  public async isBatchCompleted(): Promise<boolean> {
    return await DataUtil.isPromiseBatchCompleted(this.statusObject);
  }

  public async isBatchFulfilled(): Promise<boolean> {
    return await DataUtil.isPromiseBatchFulfilled(this.statusObject);
  }

  public resetPromise<T>(nameOrCustomPromise: string | ICustomPromise<T>) {
    const promiseName = DataUtil.getPromiseName(nameOrCustomPromise);
    this.statusObject.resetStatus(promiseName);
  }

  public reset() {
    this.batchResponse = {};
    this.statusObject.reset();
  }

  // Private functions

  private isPromiseInBatch<T>(promiseName: string) {
    return this.batchResponse.hasOwnProperty(promiseName);
  }

  private isPromiseReset<T>(promiseName: string) {
    const promiseStatus = this.statusObject.observeStatus(promiseName);
    return this.isPromiseInBatch(promiseName) && promiseStatus === PROMISE_STATUS.PENDING;
  }

  private shouldExecPromise<T>(customPromise: ICustomPromise<T>) {
    const promiseName = DataUtil.getPromiseName(customPromise);
    return !this.isPromiseInBatch(promiseName) || this.isPromiseReset(promiseName);
  }

  private buildDataPromiseByStatus<T>(customPromise: ICustomPromise<T>, data: T | undefined): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const promiseStatus = this.statusObject.observeStatus(customPromise.name);
      switch (promiseStatus) {
        case PROMISE_STATUS.FULFILLED:
          resolve(data);
          break;
        case PROMISE_STATUS.REJECTED:
          reject(data);
          break;
        default:
          reject(ERROR_MSG.PENDING_STATUS);
          break;
      }
    });
  }

  private async doExec<T>(customPromise: ICustomPromise<T>): Promise<T | undefined> {
    let result;
    // Check if the stateful promise should be executed (i.e, it's the first time or it was reset)
    if (this.shouldExecPromise(customPromise)) {
      // Call the executor and wait until promise ends
      result = await this.execTryCatch(customPromise);
      // Save the response to batchResponse
      this.batchResponse[customPromise.name] = result;
    } else {
      result = NO_RESULT;
    }
    return result;
  }

  private async doExecAll(customPromiseList: IAnyObject, mode: BatchMode, concurrentLimit?: number): Promise<IAnyObject> {
    await this.execAll(customPromiseList, concurrentLimit);
    let response: IAnyObject = {};
    switch (mode) {
      case BATCH_MODE.ALL:
        if (await this.isBatchFulfilled()) {
          response = this.batchResponse;
        } else {
          throw new Error(`${ERROR_MSG.SOME_PROMISE_REJECTED}: ${this.statusObject.getFailedPromisesList()}`);
        }
        break;
      case BATCH_MODE.ANY:
        if (await this.isBatchCompleted()) {
          response = this.batchResponse;
        } else {
          throw new Error(ERROR_MSG.SOME_PROMISE_STILL_RUNNING);
        }
        break;
      default:
        throw new Error(ERROR_MSG.INVALID_BATCH_MODE);
    }
    return response;
  }

  private async execAll(customPromiseList: IAnyObject, concurrentLimit?: number) {
    const promisesInProgress = [];
    const promiseList = Object.keys(customPromiseList);
    // Initialize the status in all promises because they cannot be handled otherwise
    promiseList.forEach(promiseName => {
      this.statusObject.initStatus(promiseName);
    });
    // Throw error if the concurrentLimit has an invalid value
    if (concurrentLimit !== undefined && concurrentLimit <= 0) {
      throw new Error(ERROR_MSG.NO_NEGATIVE_CONC_LIMIT);
    }
    // Set concurrent limit if provided and make sure it is within the amount of promises to process
    const execLimit = concurrentLimit && concurrentLimit <= promiseList.length ? concurrentLimit : promiseList.length;
    // We remove the initial promises are going to queue
    const awaitingPromises = promiseList.slice(execLimit);
    // Initialization of promises
    for (let index = 0; index < execLimit; index++) {
      const promise = customPromiseList[promiseList[index]];
      promisesInProgress.push(this.execAllRec(customPromiseList, promise, awaitingPromises));
    }
    // Await promises
    for (const promise of promisesInProgress) {
      // No data processing here
      await promise;
    }
  }

  private async execAllRec<T>(customPromiseList: IAnyObject, customPromise: ICustomPromise<T>, promiseNameList: string[]) {
    const awaitingPromiseList = promiseNameList;
    if (!customPromise || !customPromise.function) {
      throw new Error(ERROR_MSG.NO_PROMISE_FUNCTION);
    }

    await this.doExec(customPromise);

    // If there any left promises to process...
    if (awaitingPromiseList.length) {
      // The next promise is loaded and removed from promiseList and if it was provided successfully, it is queued
      const nextPromiseName = awaitingPromiseList.shift();
      if (nextPromiseName) {
        const nextPromise = customPromiseList[nextPromiseName];
        await this.execAllRec(customPromiseList, nextPromise, awaitingPromiseList);
      }
    }
  }

  private filterFulfilledPromises() {
    const failedList = this.statusObject.getFailedPromisesList();
    const result: IAnyObject = {};
    Object.keys(this.customPromiseList).forEach(promiseName => {
      if (failedList.includes(promiseName)) {
        result[promiseName] = this.customPromiseList[promiseName];
      }
    });
    return result;
  }

  private async execTryCatch<T>(customPromise: ICustomPromise<T>): Promise<T> {
    try {
      return await DataUtil.execStatefulPromise<T>(customPromise, this.statusObject);
    } catch (error) {
      // Even if the promise is rejected, we save the error value;
      return error;
    }
  }
}
