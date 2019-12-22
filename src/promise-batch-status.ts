import ko from 'knockout';
import { AFTER_CALLBACK, ERROR_MSG, PROMISE_STATUS } from './constants/global-constants';
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

  public initStatus(key: string) {
    if (!this.statusObject.Status[key] || !this.statusObject.Status[`${key}${AFTER_CALLBACK}`]) {
      this.resetStatus(key);
    }
  }

  public resetStatus(key: string) {
    this.statusObject.Status[key] = ko.observable(PROMISE_STATUS.PENDING);
    this.statusObject.Status[`${key}${AFTER_CALLBACK}`] = ko.observable(PROMISE_STATUS.PENDING);
  }

  public updateStatus(key: string, status: PromiseStatus) {
    if (this.statusObject.Status[key] && this.statusObject.Status[key]()) {
      this.statusObject.Status[key](status);
    }
  }

  public observeStatus(key: string) {
    if (this.statusObject.Status[key] && this.statusObject.Status[key]()) {
      return this.statusObject.Status[key]();
    }
  }

  public getCachedResponse(key: string) {
    return this.statusObject.Cache[key] ?? ERROR_MSG.NO_CACHED_VALUE;
  }

  public addCachedResponse<T>(key: string, data: T) {
    this.statusObject.Cache[key] = data;
  }

  public getStatusList(): IAnyObject {
    return this.statusObject.Status;
  }

  public getCacheList(): IAnyObject {
    return this.statusObject.Cache;
  }

  public getFailedPromisesList(): string[] {
    const failedList: string[] = [];
    Object.keys(this.statusObject.Status).forEach(key => {
      if (this.observeStatus(key) === PROMISE_STATUS.REJECTED) {
        failedList.push(key);
      }
    });
    return failedList;
  }

  public resetFailedPromises() {
    this.getFailedPromisesList().forEach(promiseName => {
      this.resetStatus(promiseName);
    });
  }

  public notifyAsFinished(key: string) {
    this.updateStatus(`${key}${AFTER_CALLBACK}`, PROMISE_STATUS.FULFILLED);
  }

  public reset() {
    this.statusObject = {
      Status: {},
      Cache: {}
    };
  }
}
