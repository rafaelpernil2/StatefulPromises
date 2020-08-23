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
  private customPromiseList: Record<string, ICustomPromise<unknown>>;
  private batchResponse: Record<string, unknown>;
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
    if (this.customPromiseList.hasOwnProperty(customPromise.name)) {
      return;
    }
    this.customPromiseList[customPromise.name] = customPromise;
  }

  /**
   * Adds a list of customPromises with unknown type
   * @param customPromiseList A custom promise list
   */
  public addList(customPromiseList: ICustomPromise<unknown>[]): void {
    customPromiseList.forEach(customPromise => this.add(customPromise));
  }

  /**
   * Removes a custom promise found by name, either reading its name property or by providing a string
   * @param nameOrCustomPromise Either the name of the custom promise or the custom promise whose "name" property will be used
   */
  public remove(nameOrCustomPromise: string | ICustomPromise<unknown>): void {
    const customPromiseName = this.getCustomPromiseName(nameOrCustomPromise);
    if (!this.customPromiseList.hasOwnProperty(customPromiseName)) {
      return;
    }
    delete this.customPromiseList[customPromiseName];
  }

  /**
   * Return the custom promise list in the batch
   */
  public getCustomPromiseList(): ICustomPromise<unknown>[] {
    return Object.keys(this.customPromiseList).map(customPromiseName => this.customPromiseList[customPromiseName]);
  }

  /**
   * Executes a promise existing or not existing in this instance and adds the result to the batch
   * @param nameOrCustomPromise Either the name of the custom promise to look up in the batch or the custom promise itself
   */
  public async exec<T>(nameOrCustomPromise: string | ICustomPromise<T>): Promise<T | undefined> {
    const customPromise = this.getCustomPromiseData<T>(nameOrCustomPromise);
    this.add(customPromise);
    return this.buildStatefulResponsePromise(await this.doExec<T>(customPromise));
  }

  /**
   * Like Promise.all(): Executes the whole list of custom promises and appends the fulfilled results in an object
   * @param concurrencyLimit Limits how many promises are executed at the same time
   */
  public all(concurrencyLimit?: number): Promise<Record<string, unknown>> {
    return this.doExecAll(this.customPromiseList, BatchMode.All, concurrencyLimit);
  }

  /**
   * Like Promise.allSettled(): Executes the whole lsit of custom promises and appends the fulfilled and rejected results in an object
   * @param concurrencyLimit Limits how many promises are executed at the same time
   */
  public allSettled(concurrencyLimit?: number): Promise<Record<string, unknown>> {
    return this.doExecAll(this.customPromiseList, BatchMode.AllSettled, concurrencyLimit);
  }

  /**
   * If some promises were rejected executing .all, this method retries those rejected promises and returns the ones that failed this time
   * @param concurrencyLimit Limits how many promises are executed at the same time
   */
  public retryRejected(concurrencyLimit?: number): Promise<Record<string, unknown>> {
    const rejectedCustomPromiseList = this.getRejectedCustomPromiseList();
    this.resetRejectedCustomPromises();
    return this.doExecAll(rejectedCustomPromiseList, BatchMode.All, concurrencyLimit);
  }

  /**
   * Marks a customPromise as finished (i.e. all processing is done)
   * @param nameOrCustomPromise Either the name of the custom promise or the custom promise whose "name" property will be used
   */
  public finishPromise<T>(nameOrCustomPromise: string | ICustomPromise<T>): void {
    const customPromise = this.getCustomPromiseData<T>(nameOrCustomPromise);
    // This makes sure the done and catch callbacks are executed without race conditions
    if (customPromise?.doneCallback || customPromise?.catchCallback) {
      return;
    }
    this.notifyAsFinished(customPromise.name);
  }

  /**
   * Marks as finished all promises of this instance
   */
  public finishAllPromises(): void {
    Object.keys(this.customPromiseList).forEach(customPromiseName => this.finishPromise(customPromiseName));
  }

  /**
   * Returns a promise that resolves once all promises are fulfilled or rejected, including "after processing" promise status (see finishPromise)
   */
  public async isBatchCompleted(): Promise<boolean> {
    const checkIsBatchCompleted: () => boolean = () => Object.values(this.statusObject.Status).every(value => value() !== PromiseStatus.Pending);
    if (checkIsBatchCompleted()) {
      return true;
    }
    return new Promise<boolean>(resolve => ko.pureComputed(checkIsBatchCompleted).subscribe(completed => completed && resolve(completed)));
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
    await this.isBatchCompleted();
    return Object.values(this.statusObject.Status).every(value => value() === PromiseStatus.Fulfilled);
  }

  /**
   * Resets the status of a customPromise to pending. This way, the promise is executed again when calling .all, .allSettled or .exec
   * @param nameOrCustomPromise Either the name of the custom promise or the custom promise whose "name" property will be used
   */
  public resetPromise<T>(nameOrCustomPromise: string | ICustomPromise<T>): void {
    const customPromiseName = this.getCustomPromiseName(nameOrCustomPromise);
    if (!(this.isStatusInitialized(customPromiseName) && this.isStatusInitialized(`${customPromiseName}${GLOBAL_CONSTANTS.AFTER_PROCESSING}`))) {
      return;
    }
    this.createStatus(customPromiseName);
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
   * Returns the response of all executions in the batch
   */
  public getBatchResponse(): Record<string, unknown> {
    return this.batchResponse;
  }

  /**
   * Returns the current statuses of a customPromise, the promise status and the "after processing" status
   * @param customPromiseName Either the name of the custom promise or the custom promise whose "name" property will be used
   */
  public observeStatus(nameOrCustomPromise: string | ICustomPromise<unknown>): IPromiseState {
    const customPromiseName = this.getCustomPromiseName(nameOrCustomPromise);
    const afterProcessingName = `${customPromiseName}${GLOBAL_CONSTANTS.AFTER_PROCESSING}`;
    return {
      ...(this.isStatusInitialized(customPromiseName) && { promiseStatus: this.statusObject.Status[customPromiseName]() }),
      ...(this.isStatusInitialized(afterProcessingName) && { afterProcessingStatus: this.statusObject.Status[afterProcessingName]() })
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

  private initStatus(customPromiseName: string): void {
    if (this.isStatusInitialized(customPromiseName) && this.isStatusInitialized(`${customPromiseName}${GLOBAL_CONSTANTS.AFTER_PROCESSING}`)) {
      return;
    }
    this.createStatus(customPromiseName);
  }

  private createStatus(customPromiseName: string): void {
    this.statusObject.Status[customPromiseName] = ko.observable(PromiseStatus.Pending);
    this.statusObject.Status[`${customPromiseName}${GLOBAL_CONSTANTS.AFTER_PROCESSING}`] = ko.observable(PromiseStatus.Pending);
  }

  private updateStatus(customPromiseName: string, newStatus: PromiseStatus): void {
    if (!(this.isStatusInitialized(customPromiseName) && this.isStatusValid(customPromiseName, newStatus))) {
      return;
    }
    this.statusObject.Status[customPromiseName](newStatus);
  }

  private getCachedResponse<T>(customPromiseName: string): T {
    if (!this.statusObject.Cache?.[customPromiseName]) {
      throw new Error(ERROR_MSG.NO_CACHED_VALUE);
    }
    return this.statusObject.Cache[customPromiseName] as T;
  }

  private addCachedResponse<T>(customPromise: ICustomPromise<T>, response: T): void {
    if (!customPromise?.cached) {
      return;
    }
    this.statusObject.Cache[customPromise.name] = typeof response === 'object' ? JSON.parse(JSON.stringify(response)) : response;
  }

  private getRejectedCustomPromisesNameList(): string[] {
    return Object.keys(this.customPromiseList).filter(customPromiseName => this.observeStatus(customPromiseName)?.promiseStatus === PromiseStatus.Rejected);
  }

  private resetRejectedCustomPromises(): void {
    this.getRejectedCustomPromisesNameList().forEach(customPromiseName => this.resetPromise(customPromiseName));
  }

  private notifyAsFinished(customPromiseName: string): void {
    this.updateStatus(`${customPromiseName}${GLOBAL_CONSTANTS.AFTER_PROCESSING}`, PromiseStatus.Fulfilled);
  }

  private isStatusValid(customPromiseName: string, status: PromiseStatus): boolean {
    // afterProcessing status can't be rejected, it only can be Fulfilled or Pending
    return !customPromiseName.endsWith(GLOBAL_CONSTANTS.AFTER_PROCESSING) || status !== PromiseStatus.Rejected;
  }

  private isStatusInitialized(customPromiseName: string): boolean {
    // A Knockouut obervable has a function to set and observe its value when it is initialized
    return typeof this.statusObject?.Status?.[customPromiseName] === 'function';
  }

  private isPromiseInResponse(customPromiseName: string): boolean {
    return this.batchResponse.hasOwnProperty(customPromiseName);
  }

  private isPromiseReset(customPromiseName: string): boolean {
    return this.isPromiseInResponse(customPromiseName) && this.observeStatus(customPromiseName)?.promiseStatus === PromiseStatus.Pending;
  }

  private shouldSaveResult(customPromiseName: string): boolean {
    return !this.isPromiseInResponse(customPromiseName) || this.isPromiseReset(customPromiseName);
  }

  private async doExec<T>(customPromise: ICustomPromise<T>): Promise<IStatefulResponse<T | undefined>> {
    const shouldSave = this.shouldSaveResult(customPromise.name);
    const result = await this.execStatefulPromise<T>(customPromise);
    if (!shouldSave) {
      return result;
    }
    this.batchResponse[customPromise.name] = result.value;
    return result;
  }

  private async doExecAll(customPromiseList: Record<string, ICustomPromise<unknown>>, mode: BatchMode, concurrencyLimit?: number): Promise<Record<string, unknown>> {
    await this.execAll(customPromiseList, concurrencyLimit);
    const awaitedStatus = mode === BatchMode.All ? await this.isBatchFulfilled() : await this.isBatchCompleted();
    const errors = {
      [BatchMode.All]: `${ERROR_MSG.SOME_PROMISE_REJECTED}: ${this.getRejectedCustomPromisesNameList()} `,
      [BatchMode.AllSettled]: ERROR_MSG.SOME_PROMISE_STILL_RUNNING
    };
    if (!awaitedStatus) {
      throw new Error(errors[mode] ?? ERROR_MSG.INVALID_BATCH_MODE);
    }
    return this.batchResponse;
  }

  private async execAll(customPromiseList: Record<string, ICustomPromise<unknown>>, concurrencyLimit?: number): Promise<void> {
    const promisesInProgress = [];
    const promiseNameList = Object.keys(customPromiseList);
    // Initialize the status in all promises because they cannot be handled otherwise
    promiseNameList.forEach(customPromiseName => this.initStatus(customPromiseName));
    const execLimit = this.checkconcurrencyLimit(promiseNameList, concurrencyLimit);
    for (let index = 0; index < execLimit; index++) {
      promisesInProgress.push(this.execAllRec(customPromiseList, customPromiseList[promiseNameList[index]], promiseNameList.slice(execLimit)));
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
    const nextPromiseName = awaitingPromiseNameList.shift();
    if (!nextPromiseName) {
      return;
    }
    await this.execAllRec(customPromiseList, customPromiseList[nextPromiseName], awaitingPromiseNameList);
  }

  private getRejectedCustomPromiseList(): Record<string, ICustomPromise<unknown>> {
    const rejectedNames = this.getRejectedCustomPromisesNameList();
    return Object.keys(this.customPromiseList)
      .filter(customPromiseName => rejectedNames.includes(customPromiseName))
      .map(customPromiseName => ({ [customPromiseName]: this.customPromiseList[customPromiseName] }))
      .reduce((acc, curr) => ({ ...acc, ...curr }), {});
  }

  private getCustomPromiseName<T>(nameOrCustomPromise: string | ICustomPromise<T>): string {
    return typeof nameOrCustomPromise === 'string' ? nameOrCustomPromise : nameOrCustomPromise.name;
  }

  private getCustomPromiseData<T>(nameOrCustomPromise: string | ICustomPromise<T>): ICustomPromise<T> {
    if (typeof nameOrCustomPromise === 'object') {
      return nameOrCustomPromise;
    }
    if (!this.customPromiseList.hasOwnProperty(nameOrCustomPromise)) {
      throw new Error(`${ERROR_MSG.INVALID_PROMISE_NAME}: ${nameOrCustomPromise}`);
    }
    return this.customPromiseList[nameOrCustomPromise] as ICustomPromise<T>;
  }

  private async execStatefulPromise<T>(customPromise: ICustomPromise<T>): Promise<IStatefulResponse<T | undefined>> {
    if (customPromise?.cached && this.observeStatus(customPromise)?.promiseStatus === PromiseStatus.Fulfilled) {
      return { status: PromiseStatus.Fulfilled, value: this.getCachedResponse<T>(customPromise.name) };
    }
    try {
      this.initStatus(customPromise.name);
      return this.processFulfillment<T>(customPromise, await customPromise.function.call(customPromise.thisArg, ...(customPromise?.args ?? [])));
    } catch (error) {
      return this.processRejection<T>(customPromise, error);
    }
  }

  private execCallbacks<T>(customPromise: ICustomPromise<T>, statefulResponse: IStatefulResponse<T>): void {
    this.updateStatus(customPromise.name, statefulResponse.status ?? PromiseStatus.Pending);
    const statusRelCallback = STATUS_CALLBACK_MAP[statefulResponse.status ?? PromiseStatus.Pending];
    const { hasDoneOrCatch, hasFinally } = this.checkCallbacks(customPromise, statusRelCallback);
    if (!statusRelCallback || !(hasDoneOrCatch || hasFinally)) {
      return;
    }
    if (hasDoneOrCatch) {
      statefulResponse.value = customPromise[statusRelCallback]?.call(null, statefulResponse.value);
    }
    if (hasFinally) {
      statefulResponse.value = customPromise.finallyCallback?.(statefulResponse.value);
    }
    this.notifyAsFinished(customPromise.name);
  }

  private checkCallbacks<T>(customPromise: ICustomPromise<T>, statusRelCallback?: Partial<keyof ICustomPromise<unknown>>): { hasDoneOrCatch: boolean; hasFinally: boolean } {
    return {
      hasDoneOrCatch: !!statusRelCallback && this.isDoneOrCatch(statusRelCallback) && !!customPromise?.[statusRelCallback],
      hasFinally: !!customPromise?.finallyCallback
    };
  }

  private isDoneOrCatch<T>(callback: Partial<keyof ICustomPromise<T>>): callback is 'doneCallback' | 'catchCallback' {
    return callback === 'doneCallback' || callback === 'catchCallback';
  }

  private execValidate<T>(customPromise: ICustomPromise<T>, statefulResponse: IStatefulResponse<T>): void {
    if (!customPromise?.validate) {
      statefulResponse.status = PromiseStatus.Fulfilled;
      return;
    }
    const clonedResponse = typeof statefulResponse.value === 'object' ? JSON.parse(JSON.stringify(statefulResponse.value)) : statefulResponse.value;
    statefulResponse.status = customPromise.validate(clonedResponse) ? PromiseStatus.Fulfilled : PromiseStatus.Rejected;
  }

  private buildStatefulResponsePromise<T>({ status, value }: IStatefulResponse<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      switch (status) {
        case PromiseStatus.Fulfilled:
          resolve(value);
          break;
        case PromiseStatus.Rejected:
          reject(value);
          break;
        default:
          reject(ERROR_MSG.PENDING_STATUS);
          break;
      }
    });
  }

  private checkconcurrencyLimit(promiseNameList: string[], concurrencyLimit?: number): number {
    if (concurrencyLimit === undefined || concurrencyLimit > promiseNameList.length) {
      return promiseNameList.length;
    }
    if (concurrencyLimit <= 0) {
      throw new Error(ERROR_MSG.NO_NEGATIVE_CONC_LIMIT);
    }
    return concurrencyLimit;
  }

  private processFulfillment<T>(customPromise: ICustomPromise<T>, value: T): IStatefulResponse<T> {
    const statefulResponse = { status: PromiseStatus.Fulfilled, value };
    this.execValidate(customPromise, statefulResponse);
    this.execCallbacks(customPromise, statefulResponse);
    this.addCachedResponse(customPromise, statefulResponse.value);
    return statefulResponse;
  }

  private processRejection<T>(customPromise: ICustomPromise<T>, value: T): IStatefulResponse<T> {
    const statefulResponse = { status: PromiseStatus.Rejected, value };
    this.execCallbacks(customPromise, statefulResponse);
    return statefulResponse;
  }
}
