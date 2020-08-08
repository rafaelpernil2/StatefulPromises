import ko from 'knockout';
import { ICustomPromise } from './types/i-custom-promise';
import { PromiseStatus } from './types/promise-status';
import { BatchMode } from './types/batch-mode';
import { IStatefulResponse } from './types/i-stateful-response';
import { IPromiseState } from './types/i-promise-state';
import { ERROR_MSG } from './constants/error-messages';
import { GLOBAL_CONSTANTS } from './constants/global-constants';
import { STATUS_CALLBACK_MAP } from './constants/promise-status-maps';

export class PromiseBatch {
  public customPromiseList: Record<string, ICustomPromise<unknown>>;
  public batchResponse: Record<string, unknown>;
  private statusObject: {
    Status: Record<string, ko.Observable<PromiseStatus>>;
    Cache: Record<string, unknown>;
  };

  constructor(customPromiseList?: ICustomPromise<unknown>[]) {
    this.customPromiseList = {};
    this.batchResponse = {};
    this.statusObject = {
      Status: {},
      Cache: {}
    };
    if (customPromiseList) {
      this.addList(customPromiseList);
    }
  }

  /**
   *  Adds a customPromise to this PromiseBatch instance
   * @param customPromise A custom promise using ICustomPromise<T> type
   */
  public add<T>(customPromise: ICustomPromise<T>): void {
    if (!this.customPromiseList.hasOwnProperty(customPromise.name)) {
      this.customPromiseList[customPromise.name] = customPromise;
    }
  }

  /**
   * Adds a list of customPromises with unknown type
   * @param customPromiseList A custom promise list
   */
  public addList(customPromiseList: ICustomPromise<unknown>[]): void {
    customPromiseList.forEach(promise => this.add(promise));
  }

  /**
   * Removes a custom promise found by name, either reading its name property or by providing a string
   * @param nameOrCustomPromise Either the name of the custom promise or the custom promise whose "name" property will be used
   */
  public remove(nameOrCustomPromise: string | ICustomPromise<unknown>): void {
    const name = this.getPromiseName(nameOrCustomPromise);
    if (this.customPromiseList.hasOwnProperty(name)) {
      delete this.customPromiseList[name];
    }
  }

  /**
   * Executes a promise existing or not existing in this instance and adds the result to the batch
   * @param nameOrCustomPromise Either the name of the custom promise to look up in the batch or the custom promise itself
   */
  public async exec<T>(nameOrCustomPromise: string | ICustomPromise<T>): Promise<T | undefined> {
    const customPromise = this.getPromiseData<T>(this.customPromiseList, nameOrCustomPromise);
    if (customPromise) {
      this.add(customPromise);
      const response = await this.doExec<T>(customPromise);
      return this.buildStatefulResponsePromise({ status: this.observeStatus(customPromise)?.promiseStatus, response });
    } else {
      throw new Error(`${ERROR_MSG.INVALID_PROMISE_NAME}: ${nameOrCustomPromise}`);
    }
  }

  /**
   * Like Promise.all(): Executes the whole list of custom promises and appends the fulfilled results in an object
   * @param concurrentLimit Limits how many promises are executed at the same time
   */
  public async all(concurrentLimit?: number): Promise<Record<string, unknown>> {
    return this.doExecAll(this.customPromiseList, BatchMode.All, concurrentLimit);
  }

  /**
   * Like Promise.allSettled(): Executes the whole lsit of custom promises and appends the fulfilled and rejected results in an object
   * @param concurrentLimit Limits how many promises are executed at the same time
   */
  public async allSettled(concurrentLimit?: number): Promise<Record<string, unknown>> {
    return this.doExecAll(this.customPromiseList, BatchMode.AllSettled, concurrentLimit);
  }

  /**
   * If some promises were rejected executing .all, this method retries those rejected promises and returns the ones that fail again
   * @param concurrentLimit Limits how many promises are executed at the same time
   */
  public async retryRejected(concurrentLimit?: number): Promise<Record<string, unknown>> {
    const rejectedPromises = this.getRejectedPromises();
    this.resetRejectedPromises();
    return this.doExecAll(rejectedPromises, BatchMode.All, concurrentLimit);
  }

  /**
   * Marks a customPromise as finished (i.e. all processing is done)
   * @param nameOrCustomPromise Either the name of the custom promise or the custom promise whose "name" property will be used
   */
  public finishPromise<T>(nameOrCustomPromise: string | ICustomPromise<T>): void {
    const promiseName = this.getPromiseName(nameOrCustomPromise);
    // This makes sure the done and catch callbacks are executed without race conditions
    const propertiesToCheck: Partial<keyof ICustomPromise<unknown>>[] = ['doneCallback', 'catchCallback'];
    if (!propertiesToCheck.some(property => this.customPromiseList?.[promiseName]?.hasOwnProperty(property))) {
      this.notifyAsFinished(promiseName);
    }
  }

  /**
   * Marks as finished all promises of this instance
   */
  public finishAllPromises(): void {
    Object.keys(this.customPromiseList).forEach(promiseName => this.finishPromise(promiseName));
  }

  /**
   * Returns a promise that resolves once all promises are fulfilled or rejected, including "after processing" promise status (see finishPromise)
   */
  public isBatchCompleted(): Promise<boolean> {
    // Initial check
    const statusObject = this.statusObject.Status;
    const arePromisesCompleted = Object.values(statusObject).every(value => [PromiseStatus.Fulfilled, PromiseStatus.Rejected].includes(value()));
    const promisesFinished = ko.pureComputed(() => Object.values(statusObject).every(value => value() !== PromiseStatus.Pending));
    return new Promise<boolean>(resolve => {
      if (arePromisesCompleted) {
        resolve(true);
      } else {
        promisesFinished.subscribe(newValue => (newValue ? resolve(newValue) : GLOBAL_CONSTANTS.NO_RESULT));
      }
    });
  }

  /**
   * Returns a promise that returns if all the promises were fulfilled once all of them are not pending,
   * including "after processing" promise status (see finishPromise)
   *
   * e.g:
   * If some promise was rejected but all are finished (not pending) => false
   * If all promises are fulfilled (ergo they are not pending) => true
   */
  public async isBatchFulfilled(): Promise<boolean> {
    // First make sure all promises are completed
    await this.isBatchCompleted();
    // Then, check if they are fulfilled
    return Object.values(this.statusObject.Status).every(value => value() === PromiseStatus.Fulfilled);
  }

  /**
   * Resets the status of a customPromise to pending. This way, the promise is executed again when calling .all, .allSettled or .exec
   * @param nameOrCustomPromise Either the name of the custom promise or the custom promise whose "name" property will be used
   */
  public resetPromise<T>(nameOrCustomPromise: string | ICustomPromise<T>): void {
    this.resetStatus(this.getPromiseName(nameOrCustomPromise));
  }

  /**
   * Returns an object with the status of every customPromise of this PromiseBatch indexed by their "name" propeprty
   */
  public getStatusList(): Record<string, ko.Observable<PromiseStatus>> {
    return this.statusObject.Status;
  }

  /**
   * Returns the cache object of every customPromise previously executed in this instance. It is indexed by their "name" property
   */
  public getCacheList(): Record<string, unknown> {
    return this.statusObject.Cache;
  }

  /**
   * Returns the current statuses of a customPromise, the promise status and the "after processing" status
   * @param promiseName Either the name of the custom promise or the custom promise whose "name" property will be used
   */
  public observeStatus(nameOrCustomPromise: string | ICustomPromise<unknown>): IPromiseState {
    const promiseName = this.getPromiseName(nameOrCustomPromise);
    const afterProcessingName = `${promiseName}${GLOBAL_CONSTANTS.AFTER_PROCESSING}`;
    return {
      promiseStatus: this.isStatusInitialized(promiseName) ? this.statusObject.Status[promiseName]() : GLOBAL_CONSTANTS.NO_RESULT,
      afterProcessingStatus: this.isStatusInitialized(afterProcessingName) ? this.statusObject.Status[afterProcessingName]() : GLOBAL_CONSTANTS.NO_RESULT
    };
  }

  /**
   * Resets the whole instance to the the state prior to the first execution.
   * No cache, all status pending but with all previously added promises
   */
  public reset(): void {
    this.batchResponse = {};
    this.statusObject = {
      Status: {},
      Cache: {}
    };
  }

  // Private functions

  private initStatus(key: string): void {
    if (!this.isStatusInitialized(key) || !this.isStatusInitialized(`${key}${GLOBAL_CONSTANTS.AFTER_PROCESSING}`)) {
      this.createStatus(key);
    }
  }

  private resetStatus(key: string): void {
    if (this.isStatusInitialized(key) && this.isStatusInitialized(`${key}${GLOBAL_CONSTANTS.AFTER_PROCESSING}`)) {
      this.createStatus(key);
    }
  }

  private createStatus(key: string): void {
    this.statusObject.Status[key] = ko.observable(PromiseStatus.Pending);
    this.statusObject.Status[`${key}${GLOBAL_CONSTANTS.AFTER_PROCESSING}`] = ko.observable(PromiseStatus.Pending);
  }

  private updateStatus(key: string, status: PromiseStatus): void {
    if (this.isStatusInitialized(key) && this.isStatusValid(key, status)) {
      this.statusObject.Status[key](status);
    }
  }

  private getCachedResponse<T>(key: string): T | string {
    return (this.statusObject.Cache[key] as T) ?? ERROR_MSG.NO_CACHED_VALUE;
  }

  private addCachedResponse<T>(customPromise: ICustomPromise<T>, response: T): void {
    if (customPromise?.cached) {
      this.statusObject.Cache[customPromise.name] = response;
    }
  }

  private getRejectedPromiseNames(): string[] {
    return Object.keys(this.statusObject.Status).filter(key => this.observeStatus(key)?.promiseStatus === PromiseStatus.Rejected);
  }

  private resetRejectedPromises(): void {
    this.getRejectedPromiseNames().forEach(promiseName => {
      this.resetStatus(promiseName);
    });
  }

  private notifyAsFinished(key: string): void {
    this.updateStatus(`${key}${GLOBAL_CONSTANTS.AFTER_PROCESSING}`, PromiseStatus.Fulfilled);
  }

  private isStatusValid(key: string, status: PromiseStatus): boolean {
    // afterProcessing status can't be rejected, it only can be Fulfilled or Pending
    return !key.includes(GLOBAL_CONSTANTS.AFTER_PROCESSING) || status !== PromiseStatus.Rejected;
  }

  private isStatusInitialized(key: string): boolean {
    return typeof this.statusObject?.Status?.[key] === 'function';
  }

  private isPromiseInBatch<T>(promiseName: string): boolean {
    return this.batchResponse.hasOwnProperty(promiseName);
  }

  private isPromiseReset<T>(promiseName: string): boolean {
    const promiseStatus = this.observeStatus(promiseName)?.promiseStatus;
    return this.isPromiseInBatch(promiseName) && promiseStatus === PromiseStatus.Pending;
  }

  private shouldSaveResult<T>(customPromise: ICustomPromise<T>): boolean {
    const promiseName = this.getPromiseName(customPromise);
    return !this.isPromiseInBatch(promiseName) || this.isPromiseReset(promiseName);
  }

  private async doExec<T>(customPromise: ICustomPromise<T>): Promise<T | undefined> {
    // Check if the stateful promise should be saved (i.e, it's the first time or it was reset)
    const shouldSave = this.shouldSaveResult(customPromise);
    // Call the executor and wait until promise ends
    const result = await this.wrapPromise<T | undefined>(this.execStatefulPromise<T>(customPromise));
    if (shouldSave) {
      // Save the response to batchResponse
      this.batchResponse[customPromise.name] = result;
    }
    return result;
  }

  private async doExecAll(customPromiseList: Record<string, ICustomPromise<unknown>>, mode: BatchMode, concurrentLimit?: number): Promise<Record<string, unknown>> {
    await this.execAll(customPromiseList, concurrentLimit);
    let response: Record<string, unknown> = {};
    const awaitedStatus = mode === BatchMode.All ? await this.isBatchFulfilled() : await this.isBatchCompleted();
    const errors = { [BatchMode.All]: `${ERROR_MSG.SOME_PROMISE_REJECTED}: ${this.getRejectedPromiseNames()} `, [BatchMode.AllSettled]: ERROR_MSG.SOME_PROMISE_STILL_RUNNING };
    if (awaitedStatus) {
      response = this.batchResponse;
    } else {
      throw new Error(errors[mode] ?? ERROR_MSG.INVALID_BATCH_MODE);
    }
    return response;
  }

  private async execAll(customPromiseList: Record<string, ICustomPromise<unknown>>, concurrentLimit?: number): Promise<void> {
    const promisesInProgress = [];
    const promiseList = Object.keys(customPromiseList);
    // Initialize the status in all promises because they cannot be handled otherwise
    promiseList.forEach(promiseName => this.initStatus(promiseName));
    const execLimit = this.checkConcurrentLimit(promiseList, concurrentLimit);
    for (let index = 0; index < execLimit; index++) {
      promisesInProgress.push(this.execAllRec(customPromiseList, customPromiseList[promiseList[index]], promiseList.slice(execLimit)));
    }
    for (const promise of promisesInProgress) {
      await promise;
    }
  }

  private async execAllRec<T>(customPromiseList: Record<string, ICustomPromise<unknown>>, customPromise: ICustomPromise<T>, awaitingPromiseNameList: string[]): Promise<void> {
    if (!customPromise?.function) {
      throw new Error(ERROR_MSG.NO_PROMISE_FUNCTION);
    }
    await this.doExec(customPromise);
    this.finishPromise(customPromise);
    if (awaitingPromiseNameList.length) {
      const nextPromiseName = awaitingPromiseNameList.shift();
      if (nextPromiseName) {
        await this.execAllRec(customPromiseList, customPromiseList[nextPromiseName], awaitingPromiseNameList);
      }
    }
  }

  private getRejectedPromises(): Record<string, ICustomPromise<unknown>> {
    const rejectedNames = this.getRejectedPromiseNames();
    const result: Record<string, ICustomPromise<unknown>> = {};
    Object.keys(this.customPromiseList)
      .filter(promiseName => rejectedNames.includes(promiseName))
      .forEach(promiseName => (result[promiseName] = this.customPromiseList[promiseName]));
    return result;
  }

  private getPromiseName<T>(nameOrCustomPromise: string | ICustomPromise<T>): string {
    return typeof nameOrCustomPromise === 'string' ? nameOrCustomPromise : nameOrCustomPromise.name;
  }

  private getPromiseData<T>(customPromiseList: Record<string, ICustomPromise<unknown>>, nameOrCustomPromise: string | ICustomPromise<T>): ICustomPromise<T> {
    return typeof nameOrCustomPromise === 'string' ? (customPromiseList[nameOrCustomPromise] as ICustomPromise<T>) : nameOrCustomPromise;
  }

  private async execStatefulPromise<T>(customPromise: ICustomPromise<T>): Promise<T | undefined> {
    let result: Promise<T | undefined>;
    const args = customPromise?.args ?? [];
    if (this.observeStatus(customPromise.name)?.promiseStatus === PromiseStatus.Fulfilled) {
      result = Promise.resolve(customPromise?.cached ? (this.getCachedResponse<T>(customPromise.name) as T) : GLOBAL_CONSTANTS.NO_RESULT);
    }
    this.initStatus(customPromise.name);
    try {
      result = this.processFulfillment(customPromise, { response: await customPromise.function.call(customPromise.thisArg, ...args) });
    } catch (error) {
      result = this.processRejection(customPromise, { status: PromiseStatus.Rejected, response: error });
    }
    return result;
  }

  private execCallbacks<T>(customPromise: ICustomPromise<T>, data: IStatefulResponse<T>): void {
    this.updateStatus(customPromise.name, data.status ?? PromiseStatus.Pending);
    const statusRelCallback = STATUS_CALLBACK_MAP[data.status ?? PromiseStatus.Pending];
    if (statusRelCallback) {
      data.response = this.isDoneOrCatch(statusRelCallback) ? customPromise?.[statusRelCallback]?.call(GLOBAL_CONSTANTS.NO_RESULT, data.response) ?? data.response : data.response;
      data.response = customPromise?.finallyCallback?.(data.response) ?? data.response;
      if ((this.isDoneOrCatch(statusRelCallback) && customPromise?.[statusRelCallback]) || customPromise?.finallyCallback) {
        this.notifyAsFinished(customPromise.name);
      }
    }
  }

  private isDoneOrCatch<T>(callback: Partial<keyof ICustomPromise<T>>): callback is 'doneCallback' | 'catchCallback' {
    return callback === 'doneCallback' || callback === 'catchCallback';
  }

  private execValidate<T>(customPromise: ICustomPromise<T>, doneData: Record<string, unknown>): void {
    // Validate response if a validator was provided
    if (customPromise.validate) {
      // If the variable is an object, it must be cloned to avoid modifications
      const clonedResponse = typeof doneData.response === 'object' ? JSON.parse(JSON.stringify(doneData.response)) : doneData.response;
      // If valid, the status is fulfilled, else it is rejected
      doneData.status = customPromise.validate(clonedResponse) ? PromiseStatus.Fulfilled : PromiseStatus.Rejected;
    } else {
      doneData.status = PromiseStatus.Fulfilled;
    }
  }

  private buildStatefulResponsePromise<T>(statefulResponse: IStatefulResponse<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      switch (statefulResponse?.status) {
        case PromiseStatus.Fulfilled:
          resolve(statefulResponse.response);
          break;
        case PromiseStatus.Rejected:
          reject(statefulResponse.response);
          break;
        default:
          reject(ERROR_MSG.PENDING_STATUS);
          break;
      }
    });
  }

  private async wrapPromise<T>(promise: Promise<T>): Promise<T> {
    let result: T;
    try {
      result = await promise;
    } catch (error) {
      result = error;
    }
    return result;
  }

  private checkConcurrentLimit(promiseList: string[], concurrentLimit?: number): number {
    // Throw error if the concurrentLimit has an invalid value
    if (concurrentLimit !== GLOBAL_CONSTANTS.NO_RESULT && concurrentLimit <= 0) {
      throw new Error(ERROR_MSG.NO_NEGATIVE_CONC_LIMIT);
    }
    // Set concurrent limit if provided and make sure it is within the amount of promises to process
    return concurrentLimit && concurrentLimit <= promiseList.length ? concurrentLimit : promiseList.length;
  }

  private processFulfillment<T>(customPromise: ICustomPromise<T>, statefulResponse: IStatefulResponse<T>): Promise<T> {
    this.execValidate(customPromise, statefulResponse);
    this.execCallbacks(customPromise, statefulResponse);
    this.addCachedResponse(customPromise, statefulResponse.response);
    return this.buildStatefulResponsePromise<T>(statefulResponse);
  }

  private processRejection<T>(customPromise: ICustomPromise<T>, statefulResponse: IStatefulResponse<T>): Promise<T> {
    this.execCallbacks(customPromise, statefulResponse);
    return Promise.reject(statefulResponse.response);
  }
}
