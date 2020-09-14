import ko from 'knockout';
import { ICustomPromise } from './types/i-custom-promise';
import { PromiseStatus } from './types/promise-status';
import { BatchMode } from './types/batch-mode';
import { IStatefulResponse } from './types/i-stateful-response';
import { IPromiseState } from './types/i-promise-state';
import { ERROR_MSG } from './constants/error-messages';
import { STATUS_CALLBACK_MAP } from './constants/promise-status-maps';
import { ICustomPromiseData } from './types/i-custom-promise-map';

export class PromiseBatch {
  private customPromiseDataMap: Map<string, ICustomPromiseData<unknown>>;

  constructor(customPromiseList?: ICustomPromise<unknown>[]) {
    this.customPromiseDataMap = new Map();
    if (customPromiseList) {
      this.addList(customPromiseList);
    }
  }

  /**
   *  Adds a customPromise to this PromiseBatch instance
   * @param customPromise A custom promise using ICustomPromise<T> type
   */
  public add<T>(customPromise: ICustomPromise<T>): void {
    if (!customPromise.function) {
      throw new Error(ERROR_MSG.NO_PROMISE_FUNCTION);
    }
    if (customPromise.name == null) {
      throw new Error(ERROR_MSG.NO_PROMISE_NAME);
    }
    if (this.customPromiseDataMap.has(customPromise.name)) {
      return;
    }
    this.customPromiseDataMap.set(customPromise.name, { customPromise, status: this.resetStatus() });
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
    this.customPromiseDataMap.delete(this.getCustomPromiseName(nameOrCustomPromise));
  }

  /**
   * Return the custom promise list in the batch
   */
  public getCustomPromiseList(): ICustomPromise<unknown>[] {
    return Array.from(this.customPromiseDataMap.values()).map(({ customPromise }) => customPromise);
  }

  /**
   * Executes a promise existing or not existing in this instance and adds the result to the batch
   * @param nameOrCustomPromise Either the name of the custom promise to look up in the batch or the custom promise itself
   */
  public async exec<T>(nameOrCustomPromise: string | ICustomPromise<T>): Promise<T | undefined> {
    const customPromise = this.getCustomPromise<T>(nameOrCustomPromise);
    this.add(customPromise);
    return this.buildStatefulResponsePromise(await this.doExec<T>(customPromise));
  }

  /**
   * Like Promise.all(): Executes the whole list of custom promises and appends the fulfilled results in an object
   * @param concurrencyLimit Limits how many promises are executed at the same time
   */
  public all(concurrencyLimit?: number): Promise<Record<string, unknown>> {
    return this.doExecAll(Array.from(this.customPromiseDataMap.keys()), BatchMode.All, concurrencyLimit);
  }

  /**
   * Like Promise.allSettled(): Executes the whole lsit of custom promises and appends the fulfilled and rejected results in an object
   * @param concurrencyLimit Limits how many promises are executed at the same time
   */
  public allSettled(concurrencyLimit?: number): Promise<Record<string, unknown>> {
    return this.doExecAll(Array.from(this.customPromiseDataMap.keys()), BatchMode.AllSettled, concurrencyLimit);
  }

  /**
   * If some promises were rejected executing .all, this method retries those rejected promises and returns the ones that failed this time
   * @param concurrencyLimit Limits how many promises are executed at the same time
   */
  public retryRejected(concurrencyLimit?: number): Promise<Record<string, unknown>> {
    const rejectedCustomPromiseNameList = this.getRejectedCustomPromiseNameList();
    rejectedCustomPromiseNameList.forEach(customPromiseName => this.resetPromise(customPromiseName));
    return this.doExecAll(rejectedCustomPromiseNameList, BatchMode.All, concurrencyLimit);
  }

  /**
   * Marks a customPromise as finished (i.e. all processing is done)
   * @param nameOrCustomPromise Either the name of the custom promise or the custom promise whose "name" property will be used
   */
  public finishPromise<T>(nameOrCustomPromise: string | ICustomPromise<T>): void {
    const { name, doneCallback, catchCallback } = this.getCustomPromise<T>(nameOrCustomPromise);
    // This makes sure the done and catch callbacks are executed without race conditions
    if (doneCallback || catchCallback) {
      return;
    }
    this.notifyAsFinished(name);
  }

  /**
   * Marks as finished all promises of this instance
   */
  public finishAllPromises(): void {
    for (const customPromiseName of this.customPromiseDataMap.keys()) {
      this.finishPromise(customPromiseName);
    }
  }

  /**
   * Returns a promise that resolves once all promises are fulfilled or rejected, including "after processing" promise status (see finishPromise)
   */
  public async isBatchCompleted(): Promise<boolean> {
    const checkIsBatchCompleted: () => boolean = () =>
      Array.from(this.customPromiseDataMap.values()).every(({ status }) => status.every(innerStatus => this.isStatusSettled(innerStatus())));
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
    return Array.from(this.customPromiseDataMap.values()).every(({ status }) => status.every(innerStatus => innerStatus() === PromiseStatus.Fulfilled));
  }

  /**
   * Resets the status of a customPromise to pending. This way, the promise is executed again when calling .all, .allSettled or .exec
   * @param nameOrCustomPromise Either the name of the custom promise or the custom promise whose "name" property will be used
   */
  public resetPromise<T>(nameOrCustomPromise: string | ICustomPromise<T>): void {
    this.getCustomPromiseData(this.getCustomPromiseName(nameOrCustomPromise)).status = this.resetStatus();
  }

  /**
   * Returns an object with the status of every customPromise of this PromiseBatch indexed by their "name" propeprty
   */
  public getStatusList(): Record<string, IPromiseState> {
    return Array.from(this.customPromiseDataMap.keys())
      .map(key => ({ [key]: this.observeStatus(key) }))
      .reduce((statusMap, currentStatus) => ({ ...statusMap, ...currentStatus }), {});
  }

  /**
   * Returns the cache object of every customPromise previously executed in this instance. It is indexed by their "name" property
   */
  public getCacheList(): Record<string, unknown> {
    return Array.from(this.customPromiseDataMap.entries())
      .filter(([, { cache }]) => cache != null)
      .map(([key, { cache }]) => ({ [key]: cache }))
      .reduce((cacheMap, currentCachedResult) => ({ ...cacheMap, ...currentCachedResult }), {});
  }

  /**
   * Returns the response of all executions in the batch
   */
  public getBatchResponse(): Record<string, unknown> {
    return Array.from(this.customPromiseDataMap.entries())
      .filter(([, { response }]) => response != null)
      .map(([key, { response }]) => ({ [key]: response }))
      .reduce((responseMap, currentResponse) => ({ ...responseMap, ...currentResponse }), {});
  }

  /**
   * Returns the current statuses of a customPromise, the promise status and the "after processing" status
   * @param customPromiseName Either the name of the custom promise or the custom promise whose "name" property will be used
   */
  public observeStatus(nameOrCustomPromise: string | ICustomPromise<unknown>): IPromiseState {
    const [promiseStatus, afterProcessingStatus] = this.getCustomPromiseData(this.getCustomPromiseName(nameOrCustomPromise)).status.map(innerStatus => innerStatus());
    return { promiseStatus, afterProcessingStatus };
  }

  /**
   * Resets the whole instance to the the state prior to the first execution.
   * No cache, all status pending but with all previously added promises
   */
  public reset(): void {
    for (const [key, { customPromise }] of this.customPromiseDataMap.entries()) {
      this.customPromiseDataMap.set(key, { customPromise, status: this.resetStatus() });
    }
  }

  // Private functions

  private initStatus<T>({ name }: ICustomPromise<T>): void {
    const [promiseStatus, afterProcessingStatus] = this.getCustomPromiseData(name).status;
    promiseStatus(PromiseStatus.Pending);
    afterProcessingStatus(PromiseStatus.Pending);
  }

  private resetStatus(): [ko.Observable<PromiseStatus>, ko.Observable<PromiseStatus>] {
    return [ko.observable(PromiseStatus.Uninitialized), ko.observable(PromiseStatus.Uninitialized)];
  }

  private updateStatus(customPromiseName: string, newStatus: PromiseStatus): void {
    const [promiseStatus] = this.getCustomPromiseData(customPromiseName).status;
    promiseStatus(newStatus);
  }

  private notifyAsFinished(customPromiseName: string): void {
    const [, afterProcessingStatus] = this.getCustomPromiseData(customPromiseName).status;
    afterProcessingStatus(PromiseStatus.Fulfilled);
  }

  private addCachedResponse<T>({ name, cached }: ICustomPromise<T>, { status, value }: IStatefulResponse<T>): void {
    if (!cached || status !== PromiseStatus.Fulfilled) {
      return;
    }
    this.getCustomPromiseData(name).cache = typeof value === 'object' ? JSON.parse(JSON.stringify(value)) : value;
  }

  private getRejectedCustomPromiseNameList(): string[] {
    return Array.from(this.customPromiseDataMap.keys()).filter(customPromiseName => this.observeStatus(customPromiseName).promiseStatus === PromiseStatus.Rejected);
  }

  private async doExec<T>({ name, ...restOfCustomPromise }: ICustomPromise<T>): Promise<IStatefulResponse<T | undefined>> {
    const shouldSave = this.getCustomPromiseData(name).response == null || this.observeStatus(name).promiseStatus === PromiseStatus.Uninitialized;
    const response = await this.execStatefulPromise<T>({ name, ...restOfCustomPromise });
    if (!shouldSave) {
      return response;
    }
    this.getCustomPromiseData(name).response = response.value;
    return response;
  }

  private async doExecAll(promiseNameList: string[], mode: BatchMode, concurrencyLimit?: number): Promise<Record<string, unknown>> {
    await this.execAll(promiseNameList, concurrencyLimit);
    const awaitedStatus = mode === BatchMode.All ? await this.isBatchFulfilled() : await this.isBatchCompleted();
    const errors = {
      [BatchMode.All]: `${ERROR_MSG.SOME_PROMISE_REJECTED}: ${this.getRejectedCustomPromiseNameList()}`,
      [BatchMode.AllSettled]: ERROR_MSG.SOME_PROMISE_STILL_RUNNING
    };
    if (!awaitedStatus) {
      throw new Error(errors[mode]);
    }
    return this.getBatchResponse();
  }

  private async execAll(promiseNameList: string[], concurrencyLimit?: number): Promise<void> {
    const promisesInProgress = [];
    const execLimit = this.checkConcurrencyLimit(promiseNameList, concurrencyLimit);
    const awaitedPromiseNameList = promiseNameList.slice(execLimit);
    for (let index = 0; index < execLimit; index++) {
      promisesInProgress.push(this.execAllRec(this.getCustomPromiseData(promiseNameList[index]).customPromise, awaitedPromiseNameList));
    }
    await Promise.all(promisesInProgress);
  }

  private async execAllRec<T>(customPromise: ICustomPromise<T>, awaitingPromiseNameList: string[]): Promise<void> {
    await this.doExec(customPromise);
    this.finishPromise(customPromise);
    const nextPromiseName = awaitingPromiseNameList.shift();
    if (!nextPromiseName) {
      return;
    }
    await this.execAllRec(this.getCustomPromiseData(nextPromiseName).customPromise, awaitingPromiseNameList);
  }

  private getCustomPromiseName<T>(nameOrCustomPromise: string | ICustomPromise<T>): string {
    return typeof nameOrCustomPromise === 'string' ? nameOrCustomPromise : nameOrCustomPromise.name;
  }

  private getCustomPromiseData<T>(customPromiseName: string): ICustomPromiseData<T> {
    const customPromiseData = this.customPromiseDataMap.get(customPromiseName);
    if (!customPromiseData) {
      throw new Error(`${ERROR_MSG.INVALID_PROMISE_NAME}: ${customPromiseName}`);
    }
    return customPromiseData as ICustomPromiseData<T>;
  }

  private getCustomPromise<T>(nameOrCustomPromise: string | ICustomPromise<T>): ICustomPromise<T> {
    if (typeof nameOrCustomPromise === 'object') {
      return nameOrCustomPromise;
    }
    return this.getCustomPromiseData(nameOrCustomPromise).customPromise as ICustomPromise<T>;
  }

  private isStatusSettled(status: PromiseStatus): boolean {
    return ![PromiseStatus.Uninitialized, PromiseStatus.Pending].includes(status);
  }

  private async isCustomPromiseCompleted<T>({ name }: ICustomPromise<T>): Promise<boolean> {
    const [promiseStatus] = this.getCustomPromiseData(name).status;
    const checkIsCustomPromiseCompleted: () => boolean = () => this.isStatusSettled(promiseStatus());
    if (checkIsCustomPromiseCompleted()) {
      return true;
    }
    return new Promise<boolean>(resolve => ko.pureComputed(checkIsCustomPromiseCompleted).subscribe(completed => completed && resolve(completed)));
  }

  private async execStatefulPromise<T>(customPromise: ICustomPromise<T>): Promise<IStatefulResponse<T | undefined>> {
    if (customPromise.cached && this.observeStatus(customPromise).promiseStatus !== PromiseStatus.Uninitialized) {
      await this.isCustomPromiseCompleted(customPromise);
    }
    if (this.observeStatus(customPromise).promiseStatus === PromiseStatus.Fulfilled) {
      return { status: PromiseStatus.Fulfilled, value: this.getCustomPromiseData<T>(customPromise.name).cache };
    }
    try {
      this.initStatus(customPromise);
      return this.processFulfillment<T>(customPromise, await customPromise.function.call(customPromise.thisArg, ...(customPromise.args ?? [])));
    } catch (error) {
      return this.processRejection<T>(customPromise, error);
    }
  }

  private execCallbacks<T>(customPromise: ICustomPromise<T>, statefulResponse: IStatefulResponse<T>): void {
    this.updateStatus(customPromise.name, statefulResponse.status);
    const callbackNameByStatus = STATUS_CALLBACK_MAP[statefulResponse.status];
    const hasDoneOrCatch = this.hasDoneOrCatch(customPromise, callbackNameByStatus);
    if (!callbackNameByStatus || !(hasDoneOrCatch || customPromise.finallyCallback)) {
      return;
    }
    if (hasDoneOrCatch) {
      statefulResponse.value = customPromise[callbackNameByStatus].call(null, statefulResponse.value);
    }
    if (customPromise.finallyCallback) {
      statefulResponse.value = customPromise.finallyCallback(statefulResponse.value);
    }
    this.notifyAsFinished(customPromise.name);
  }

  private hasDoneOrCatch<T>(customPromise: ICustomPromise<T>, callback?: Partial<keyof ICustomPromise<T>>): boolean {
    return (callback === 'doneCallback' || callback === 'catchCallback') && Boolean(customPromise[callback]);
  }

  private execValidate<T>(customPromise: ICustomPromise<T>, statefulResponse: IStatefulResponse<T>): void {
    if (!customPromise.validate) {
      statefulResponse.status = PromiseStatus.Fulfilled;
      return;
    }
    const clonedResponse = typeof statefulResponse.value === 'object' ? JSON.parse(JSON.stringify(statefulResponse.value)) : statefulResponse.value;
    statefulResponse.status = customPromise.validate(clonedResponse) ? PromiseStatus.Fulfilled : PromiseStatus.Rejected;
  }

  private buildStatefulResponsePromise<T>({ status, value }: IStatefulResponse<T>): Promise<T> {
    if (status !== PromiseStatus.Fulfilled) {
      throw value;
    }
    return Promise.resolve(value);
  }

  private checkConcurrencyLimit(promiseNameList: string[], concurrencyLimit?: number): number {
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
    this.addCachedResponse(customPromise, statefulResponse);
    return statefulResponse;
  }

  private processRejection<T>(customPromise: ICustomPromise<T>, value: T): IStatefulResponse<T> {
    const statefulResponse = { status: PromiseStatus.Rejected, value };
    this.execCallbacks(customPromise, statefulResponse);
    return statefulResponse;
  }
}
