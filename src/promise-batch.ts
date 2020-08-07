import ko from 'knockout';
import { ERROR_MSG, NO_RESULT, STATUS_CALLBACK_MAP, AFTER_CALLBACK } from './constants/global-constants';
import { ICustomPromise } from './interfaces/i-custom-promise';
import { PromiseStatus } from './interfaces/i-promise-status';

enum BatchMode {
  All,
  Any
}

export class PromiseBatch {
  public customPromiseList: Record<string, ICustomPromise<unknown>>;
  public batchResponse: Record<string, unknown>;
  public statusObject: {
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

  public add<T>(customPromise: ICustomPromise<T>): void {
    if (!this.customPromiseList.hasOwnProperty(customPromise.name)) {
      this.customPromiseList[customPromise.name] = customPromise;
    }
  }

  public addList(customPromiseList: ICustomPromise<unknown>[]): void {
    customPromiseList.forEach(promise => this.add(promise));
  }

  //NEW
  public remove(nameOrCustomPromise: string | ICustomPromise<unknown>): void {
    const name = this.getPromiseName(nameOrCustomPromise);
    if (this.customPromiseList.hasOwnProperty(name)) {
      delete this.customPromiseList[name];
    }
  }

  public async exec<T>(nameOrCustomPromise: string | ICustomPromise<T>): Promise<T | undefined> {
    const customPromise = this.getPromiseData(this.customPromiseList, nameOrCustomPromise);
    if (customPromise) {
      this.add(customPromise);
      const result = await this.doExec<T>(customPromise as ICustomPromise<T>);
      const status = this.observeStatus(customPromise.name);
      return new Promise<T>((resolve, reject) => {
        switch (status) {
          case PromiseStatus.Fulfilled:
            resolve(result);
            break;
          case PromiseStatus.Rejected:
            reject(result);
            break;
          default:
            reject(ERROR_MSG.PENDING_STATUS);
            break;
        }
      });
    } else {
      throw new Error(`${ERROR_MSG.INVALID_PROMISE_NAME}: ${nameOrCustomPromise}`);
    }
  }

  public async promiseAll(concurrentLimit?: number): Promise<Record<string, unknown>> {
    return this.doExecAll(this.customPromiseList, BatchMode.All, concurrentLimit);
  }

  public async promiseAny(concurrentLimit?: number): Promise<Record<string, unknown>> {
    return this.doExecAll(this.customPromiseList, BatchMode.Any, concurrentLimit);
  }

  public async retryRejected(concurrentLimit?: number): Promise<Record<string, unknown>> {
    const rejectedPromises = this.getRejectedPromises();
    this.resetRejectedPromises();
    return this.doExecAll(rejectedPromises, BatchMode.All, concurrentLimit);
  }

  public finishPromise<T>(nameOrCustomPromise: string | ICustomPromise<T>): void {
    const promiseName = this.getPromiseName(nameOrCustomPromise);
    // This makes sure the done and catch callbacks are executed without race conditions
    const propertiesToCheck: Partial<keyof ICustomPromise<unknown>>[] = ['doneCallback', 'catchCallback'];
    if (this.customPromiseList.hasOwnProperty(promiseName) && !propertiesToCheck.some(property => this.customPromiseList[promiseName].hasOwnProperty(property))) {
      this.notifyAsFinished(promiseName);
    }
  }

  public finishAllPromises(): void {
    Object.keys(this.customPromiseList).forEach(promiseName => {
      if (this.statusObject.Status.hasOwnProperty(promiseName)) {
        this.finishPromise(promiseName);
      }
    });
  }

  public async isBatchCompleted(): Promise<boolean> {
    // Initial check
    const arePromisesCompleted = Object.values(this.statusObject.Status).every((value: ko.Observable<PromiseStatus>) => {
      return value() === PromiseStatus.Fulfilled || value() === PromiseStatus.Rejected;
    });
    const promisesFinished = ko.pureComputed(() => {
      return Object.values(this.statusObject.Status).every((value: ko.Observable<PromiseStatus>) => {
        return value() !== PromiseStatus.Pending;
      });
    });
    return new Promise<boolean>(resolve => {
      if (arePromisesCompleted) {
        resolve(true);
      } else {
        promisesFinished.subscribe(newValue => {
          if (newValue) {
            resolve(newValue);
          }
        });
      }
    });
  }

  public async isBatchFulfilled(): Promise<boolean> {
    // First make sure all promises are completed
    await this.isBatchCompleted();
    // Then, check if they are fulfilled
    return Object.values(this.statusObject.Status).every((value: ko.Observable<PromiseStatus>) => {
      return value() === PromiseStatus.Fulfilled;
    });
  }

  public resetPromise<T>(nameOrCustomPromise: string | ICustomPromise<T>): void {
    this.resetStatus(this.getPromiseName(nameOrCustomPromise));
  }

  public getStatusList(): Record<string, ko.Observable<PromiseStatus>> {
    return this.statusObject.Status;
  }

  public getCacheList(): Record<string, unknown> {
    return this.statusObject.Cache;
  }

  public observeStatus(key: string): PromiseStatus | undefined {
    return this.isStatusInitialized(key) ? this.statusObject.Status[key]() : NO_RESULT;
  }

  public reset(): void {
    this.batchResponse = {};
    this.statusObject = {
      Status: {},
      Cache: {}
    };
  }

  // Private functions

  private initStatus(key: string): void {
    if (!this.isStatusInitialized(key) || !this.isStatusInitialized(`${key}${AFTER_CALLBACK}`)) {
      this.createStatus(key);
    }
  }

  private resetStatus(key: string): void {
    if (this.isStatusInitialized(key) && this.isStatusInitialized(`${key}${AFTER_CALLBACK}`)) {
      this.createStatus(key);
    }
  }

  private createStatus(key: string): void {
    this.statusObject.Status[key] = ko.observable(PromiseStatus.Pending);
    this.statusObject.Status[`${key}${AFTER_CALLBACK}`] = ko.observable(PromiseStatus.Pending);
  }

  private updateStatus(key: string, status: PromiseStatus): void {
    if (this.isStatusInitialized(key) && this.isStatusValid(key, status)) {
      this.statusObject.Status[key](status);
    }
  }

  private getCachedResponse<T>(key: string): T | string {
    return (this.statusObject.Cache[key] as T) ?? ERROR_MSG.NO_CACHED_VALUE;
  }

  private addCachedResponse<T>(key: string, data: T): void {
    this.statusObject.Cache[key] = data;
  }

  private getRejectedPromiseNames(): string[] {
    return Object.keys(this.statusObject.Status).filter(key => this.observeStatus(key) === PromiseStatus.Rejected);
  }

  private resetRejectedPromises(): void {
    this.getRejectedPromiseNames().forEach(promiseName => {
      this.resetStatus(promiseName);
    });
  }

  private notifyAsFinished(key: string): void {
    this.updateStatus(`${key}${AFTER_CALLBACK}`, PromiseStatus.Fulfilled);
  }

  private isStatusValid(key: string, status: PromiseStatus): boolean {
    // AfterCallback status can't be rejected, it only can be Fulfilled or Pending
    return !key.includes(AFTER_CALLBACK) || status !== PromiseStatus.Rejected;
  }

  private isStatusInitialized(key: string): boolean {
    return this.statusObject.Status.hasOwnProperty(key) && typeof this.statusObject.Status[key] === 'function';
  }

  private isPromiseInBatch<T>(promiseName: string): boolean {
    return this.batchResponse.hasOwnProperty(promiseName);
  }

  private isPromiseReset<T>(promiseName: string): boolean {
    const promiseStatus = this.observeStatus(promiseName);
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
    let result: T | undefined;
    try {
      result = await this.execStatefulPromise<T>(customPromise);
    } catch (error) {
      result = error;
    }
    if (shouldSave) {
      // Save the response to batchResponse
      this.batchResponse[customPromise.name] = result;
    }
    return result;
  }

  private async doExecAll(customPromiseList: Record<string, ICustomPromise<unknown>>, mode: BatchMode, concurrentLimit?: number): Promise<Record<string, unknown>> {
    await this.execAll(customPromiseList, concurrentLimit);
    let response: Record<string, unknown> = {};
    switch (mode) {
      case BatchMode.All:
        if (await this.isBatchFulfilled()) {
          response = this.batchResponse;
        } else {
          throw new Error(`${ERROR_MSG.SOME_PROMISE_REJECTED}: ${this.getRejectedPromiseNames()}`);
        }
        break;
      case BatchMode.Any:
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

  private async execAll(customPromiseList: Record<string, ICustomPromise<unknown>>, concurrentLimit?: number): Promise<void> {
    const promisesInProgress = [];
    const promiseList = Object.keys(customPromiseList);
    // Initialize the status in all promises because they cannot be handled otherwise
    promiseList.forEach(promiseName => this.initStatus(promiseName));
    // Throw error if the concurrentLimit has an invalid value
    if (typeof concurrentLimit !== 'undefined' && concurrentLimit <= 0) {
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

  private async execAllRec<T>(customPromiseList: Record<string, ICustomPromise<unknown>>, customPromise: ICustomPromise<T>, promiseNameList: string[]): Promise<void> {
    const awaitingPromiseList = promiseNameList;
    const functionProperty: Partial<keyof ICustomPromise<unknown>> = 'function';
    if (!customPromise || !customPromise.hasOwnProperty(functionProperty)) {
      throw new Error(ERROR_MSG.NO_PROMISE_FUNCTION);
    }

    await this.doExec(customPromise);

    // When executing promises in a batch, they are finished automatically
    this.finishPromise(customPromise);

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

  private getRejectedPromises(): Record<string, ICustomPromise<unknown>> {
    const rejectedNames = this.getRejectedPromiseNames();
    const result: Record<string, ICustomPromise<unknown>> = {};
    Object.keys(this.customPromiseList).forEach(promiseName => {
      if (rejectedNames.includes(promiseName)) {
        result[promiseName] = this.customPromiseList[promiseName];
      }
    });
    return result;
  }

  private getPromiseName<T>(nameOrCustomPromise: string | ICustomPromise<T>): string {
    return typeof nameOrCustomPromise === 'string' ? nameOrCustomPromise : nameOrCustomPromise.name;
  }

  private getPromiseData<T>(customPromiseList: Record<string, ICustomPromise<T>>, nameOrCustomPromise: string | ICustomPromise<T>): ICustomPromise<T> {
    return typeof nameOrCustomPromise === 'string' ? customPromiseList[nameOrCustomPromise] : nameOrCustomPromise;
  }

  private execStatefulPromise<T>(customPromise: ICustomPromise<T>): Promise<T | undefined> {
    // Return cached value if available
    if (this.observeStatus(customPromise.name) === PromiseStatus.Fulfilled) {
      const response = customPromise?.cached ? (this.getCachedResponse<T>(customPromise.name) as T) : NO_RESULT;
      return Promise.resolve(response);
    }
    const args = customPromise && customPromise.args ? customPromise.args : [];
    // Initialize status as pending if it wasn't created before.
    // .initStatus takes care of that
    this.initStatus(customPromise.name);

    return new Promise<T>((resolve, reject) => {
      customPromise.function.call(customPromise.thisArg, ...args).then(
        (response: T) => {
          // Save the response
          const doneData: { status?: PromiseStatus; response: unknown } = {
            response
          };
          // Validate response if a validator was provided
          this.execValidateIfProvided(customPromise, doneData);
          // Execute done or catch callback depending on the status in doneData
          this.execCallbacks(customPromise, doneData);
          // If cache is enabled, the response has to be saved in cache
          if (customPromise?.cached) {
            this.addCachedResponse(customPromise.name, doneData.response);
          }
          // If fulfilled...
          if (doneData.status === PromiseStatus.Fulfilled) {
            resolve(doneData.response as T);
          } else {
            reject(doneData.response);
          }
        },
        (error: unknown) => {
          const catchData: { status: PromiseStatus; response: unknown } = {
            status: PromiseStatus.Rejected,
            response: error
          };
          this.execCallbacks(customPromise, catchData);
          reject(catchData.response);
        }
      );
    });
  }

  private execCallbacks<T>(customPromise: ICustomPromise<T>, data: { status?: PromiseStatus; response: unknown }): void {
    this.updateStatus(customPromise.name, data.status ?? PromiseStatus.Pending);
    const statusRelCallback = STATUS_CALLBACK_MAP[data.status ?? PromiseStatus.Pending];
    if (statusRelCallback) {
      const callback = customPromise[statusRelCallback];
      let hasToBeFinished = false;
      if (this.isDoneOrCatch(statusRelCallback) && callback) {
        data.response = callback.call(undefined, data.response);
        hasToBeFinished = true;
      }
      // Execute finally callback
      if (customPromise.finallyCallback) {
        data.response = customPromise.finallyCallback(data.response);
        hasToBeFinished = true;
      }
      // Notify as finished
      if (hasToBeFinished) {
        this.notifyAsFinished(customPromise.name);
      }
    }
  }

  private isDoneOrCatch<T>(callback: Partial<keyof ICustomPromise<T>>): callback is 'doneCallback' | 'catchCallback' {
    return callback === 'doneCallback' || callback === 'catchCallback';
  }

  private execValidateIfProvided<T>(customPromise: ICustomPromise<T>, doneData: Record<string, unknown>): void {
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
}
