import ko from 'knockout';
import { AFTER_CALLBACK, ERROR_MSG, PROMISE_STATUS, NO_RESULT } from './constants/global-constants';
import { IAnyObject } from './interfaces/i-any-object';

type PromiseStatus = typeof PROMISE_STATUS[keyof typeof PROMISE_STATUS];

export class PromiseBatchStatus {
  public statusObject: IAnyObject;

  constructor() {
    this.statusObject = {
      Status: {},
      Cache: {}
    };
  }

  public initStatus(key: string): void {
    if (!this.isStatusInitialized(key) || !this.isStatusInitialized(`${key}${AFTER_CALLBACK}`)) {
      this.createStatus(key);
    }
  }

  public resetStatus(key: string): void {
    if (this.isStatusInitialized(key) && this.isStatusInitialized(`${key}${AFTER_CALLBACK}`)) {
      this.createStatus(key);
    }
  }

  public updateStatus(key: string, status: PromiseStatus): void {
    if (this.isStatusInitialized(key) && this.isStatusValid(key, status)) {
      this.statusObject.Status[key](status);
    }
  }

  public observeStatus(key: string): string {
    return this.isStatusInitialized(key) ? this.statusObject.Status[key]() : NO_RESULT;
  }

  public getCachedResponse<T>(key: string): T {
    return this.statusObject.Cache[key] ?? ERROR_MSG.NO_CACHED_VALUE;
  }

  public addCachedResponse<T>(key: string, data: T): void {
    this.statusObject.Cache[key] = data;
  }

  public getStatusList(): IAnyObject {
    return this.statusObject.Status;
  }

  public getCacheList(): IAnyObject {
    return this.statusObject.Cache;
  }

  public getRejectedPromiseNames(): string[] {
    return Object.keys(this.statusObject.Status).filter(key => this.observeStatus(key) === PROMISE_STATUS.REJECTED);
  }

  public resetRejectedPromises(): void {
    this.getRejectedPromiseNames().forEach(promiseName => {
      this.resetStatus(promiseName);
    });
  }

  public notifyAsFinished(key: string): void {
    this.updateStatus(`${key}${AFTER_CALLBACK}`, PROMISE_STATUS.FULFILLED);
  }

  public reset(): void {
    this.statusObject = {
      Status: {},
      Cache: {}
    };
  }

  // Private functions

  private createStatus(key: string): void {
    this.statusObject.Status[key] = ko.observable(PROMISE_STATUS.PENDING);
    this.statusObject.Status[`${key}${AFTER_CALLBACK}`] = ko.observable(PROMISE_STATUS.PENDING);
  }

  private isStatusValid(key: string, status: PromiseStatus): boolean {
    // AfterCallback status can't be rejected, it only can be Fulfilled or Pending
    return !key.includes(AFTER_CALLBACK) || status !== PROMISE_STATUS.REJECTED;
  }

  private isStatusInitialized(key: string): boolean {
    return this.statusObject.Status.hasOwnProperty(key) && typeof this.statusObject.Status[key] === 'function';
  }
}
