import { BATCH_MODE, ERROR_MSG, PROMISE_STATUS } from './constants/global-constants';
import { IAnyObject } from './interfaces/i-any-object';
import { ICustomPromise } from './interfaces/i-custom-promise';
import { DataUtil } from './utils/data-util';
import { PromiseBatchStatus } from './utils/promise-batch-status';

type BatchMode = typeof BATCH_MODE[keyof typeof BATCH_MODE];

export class PromiseBatch {
  public customPromiseList: IAnyObject;
  public batchResponse: IAnyObject;
  private statusObject: PromiseBatchStatus;

  constructor(customPromiseList?: Array<ICustomPromise<unknown>>) {
    this.customPromiseList = {};
    this.batchResponse = {};
    this.statusObject = new PromiseBatchStatus();
    if (customPromiseList) {
      this.addList(customPromiseList);
    }
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
    if (customPromise) {
      this.add(customPromise);
      const result = await this.doExec<T>(customPromise);
      return this.buildDataPromiseByStatus(customPromise, result);
    } else {
      throw new Error(`${ERROR_MSG.INVALID_PROMISE_NAME}: ${nameOrCustomPromise}`);
    }
  }

  public async promiseAll(concurrentLimit?: number): Promise<IAnyObject> {
    return this.doExecAll(this.customPromiseList, BATCH_MODE.ALL, concurrentLimit);
  }

  public async promiseAny(concurrentLimit?: number): Promise<IAnyObject> {
    return this.doExecAll(this.customPromiseList, BATCH_MODE.ANY, concurrentLimit);
  }

  public async retryRejected(concurrentLimit?: number): Promise<IAnyObject> {
    const rejectedPromises = this.getRejectedPromises();
    this.statusObject.resetRejectedPromises();
    return this.doExecAll(rejectedPromises, BATCH_MODE.ALL, concurrentLimit);
  }

  public finishPromise<T>(nameOrCustomPromise: string | ICustomPromise<T>) {
    const promiseName = DataUtil.getPromiseName(nameOrCustomPromise);
    // This makes sure the done callback is executed without race conditions
    if (this.customPromiseList.hasOwnProperty(promiseName) && !this.customPromiseList[promiseName].hasOwnProperty('doneCallback')) {
      this.statusObject.notifyAsFinished(promiseName);
    }
  }

  public finishAllPromises() {
    const statusList = this.statusObject.getStatusList();
    Object.keys(this.customPromiseList).forEach(promiseName => {
      if (statusList.hasOwnProperty(promiseName)) {
        this.finishPromise(promiseName);
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

  public observeStatus(promiseName: string) {
    return this.statusObject.observeStatus(promiseName);
  }

  public getStatusList(): IAnyObject {
    return this.statusObject.getStatusList();
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

  private shouldSaveResult<T>(customPromise: ICustomPromise<T>) {
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
    // Check if the stateful promise should be saved (i.e, it's the first time or it was reset)
    const shouldSave = this.shouldSaveResult(customPromise);
    // Call the executor and wait until promise ends
    const result = await this.execTryCatch(customPromise);
    if (shouldSave) {
      // Save the response to batchResponse
      this.batchResponse[customPromise.name] = result;
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
          throw new Error(`${ERROR_MSG.SOME_PROMISE_REJECTED}: ${this.statusObject.getRejectedPromiseNames()}`);
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

  private getRejectedPromises() {
    const rejectedNames = this.statusObject.getRejectedPromiseNames();
    const result: IAnyObject = {};
    Object.keys(this.customPromiseList).forEach(promiseName => {
      if (rejectedNames.includes(promiseName)) {
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
