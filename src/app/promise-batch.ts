import { IAnyObject } from '../interfaces/i-any-object';
import { ICustomPromise, ICustomPromise as object } from '../interfaces/i-custom-promise';
import { DataUtil } from '../utils/data-util';
import { PromiseBatchStatus } from './promise-batch-status';

export class PromiseBatch {
  public statusObject: PromiseBatchStatus;
  public customPromiseList: IAnyObject;
  public batchResponse: IAnyObject;
  constructor(statusObject: PromiseBatchStatus) {
    this.statusObject = statusObject;
    this.customPromiseList = {} as IAnyObject;
    this.batchResponse = {} as IAnyObject;
  }

  public add<T>(customPromise: ICustomPromise<T>) {
    this.customPromiseList[customPromise.name] = customPromise;
  }

  // This is untyped because each function could return a different type
  // tslint:disable-next-line: no-any
  public addList(customPromiseList: Array<ICustomPromise<any>>) {
    customPromiseList.forEach(promise => {
      this.customPromiseList[promise.name] = promise;
    });
  }

  public build<T>(nameOrCustomPromise: string | ICustomPromise<T>): PromiseLike<T> {
    const customPromise = typeof nameOrCustomPromise === 'string' ? this.customPromiseList[nameOrCustomPromise] : nameOrCustomPromise;
    return DataUtil.buildStatefulPromise<T>(customPromise, this.statusObject);
  }

  public async buildAll(concurrentLimit?: number) {
    const promisesInProgress = [];
    const results = {};
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
      // tslint:disable-next-line: no-any
      promisesInProgress.push(this.concurrentPromiseExecRec<any>(promise, awaitingPromises));
    }

    // Await promises
    for (const promise of promisesInProgress) {
      // No data processing here
      await promise;
    }
    return results;
  }

  public promiseAll(concurrentLimit?: number): Promise<IAnyObject> {
    this.buildAll(concurrentLimit);
    return new Promise<IAnyObject>(async (resolve, reject) => {
      if (await this.isFulfilled()) {
        resolve(this.getBatchResponse());
      } else {
        reject('Some promise failed');
      }
    });
  }

  public promiseAny(concurrentLimit?: number): Promise<IAnyObject> {
    this.buildAll(concurrentLimit);
    return new Promise<IAnyObject>(async (resolve, reject) => {
      if (await this.isCompleted()) {
        resolve(this.getBatchResponse());
      } else {
        reject('Some promise is still running. You should not be seeing this');
      }
    });
  }

  public getBatchResponse(): IAnyObject {
    return this.batchResponse;
  }

  public finishAllPromises() {
    Object.keys(this.customPromiseList).forEach(promise => {
      if (this.statusObject.getStatusList()[promise]) {
        this.finishPromiseOfBatch(promise, this.statusObject);
      }
    });
  }

  public finishPromiseOfBatch<T>(nameOrCustomPromise: string | ICustomPromise<T>, promiseStatusObject: PromiseBatchStatus) {
    const promiseName = typeof nameOrCustomPromise === 'string' ? nameOrCustomPromise : nameOrCustomPromise.name;
    // This makes sure the done callback is executed without race conditions
    if (!this.customPromiseList[promiseName].doneCallback) {
      promiseStatusObject.notifyAsFinished(promiseName);
    }
  }

  public async isCompleted(): Promise<boolean> {
    return await DataUtil.isPromiseBatchCompleted(this.statusObject);
  }

  public async isFulfilled(): Promise<boolean> {
    return await DataUtil.isPromiseBatchFulfilled(this.statusObject);
  }

  private concurrentPromiseExecRec = async <T>(customPromise: ICustomPromise<T>, promiseNameList: string[]): Promise<IAnyObject> => {
    let promise;
    let result = {} as Promise<IAnyObject> | IAnyObject;
    const awaitingPromiseList = promiseNameList;

    if (!customPromise || !customPromise.function) {
      throw new Error('Cannot read function of promise');
    }

    // Call the builder
    promise = this.build<T>(customPromise);

    // Wait until promise ends
    const promiseResult = await promise;

    // Add property to batchResponse
    this.batchResponse[customPromise.name] = promiseResult;

    // If there any left promises to process...
    if (awaitingPromiseList.length) {
      // The next promise is loaded and removed from promiseList and if it was provided successfully, it is queued
      const nextPromiseName = awaitingPromiseList.shift();

      if (nextPromiseName) {
        const nextPromise = this.customPromiseList[nextPromiseName];
        result = this.concurrentPromiseExecRec(nextPromise, awaitingPromiseList);
      }
    } else {
      result = promiseResult;
    }

    return result;
  };
}
