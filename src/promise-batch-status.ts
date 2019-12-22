import ko from 'knockout';
import { PROMISE_STATUS } from './constants/global-constants';
import { IAnyObject } from './interfaces/i-any-object';

type PromiseStatus = typeof PROMISE_STATUS[keyof typeof PROMISE_STATUS];

export class PromiseBatchStatus {
  private statusObj: IAnyObject;
  constructor() {
    this.statusObj = {
      Status: {},
      Cache: {}
    };
  }

  public initStatus(key: string) {
    if (!this.statusObj.Status[key] || !this.statusObj.Status[`${key}AfterCallback`]) {
      this.statusObj.Status[key] = ko.observable(PROMISE_STATUS.PENDING);
      this.statusObj.Status[`${key}AfterCallback`] = ko.observable(PROMISE_STATUS.PENDING);
    }
  }

  public updateStatus(key: string, status: PromiseStatus) {
    if (this.statusObj.Status[key] && this.statusObj.Status[key]()) {
      this.statusObj.Status[key](status);
    }
  }

  public observeStatus(key: string) {
    if (this.statusObj.Status[key] && this.statusObj.Status[key]()) {
      return this.statusObj.Status[key]();
    }
  }

  public getCachedResponse(key: string) {
    return this.statusObj.Cache[key] ?? 'You should not be seeing this';
  }

  public addCachedResponse<T>(key: string, data: T) {
    this.statusObj.Cache[key] = data;
  }

  public getStatusList(): IAnyObject {
    return this.statusObj.Status;
  }

  public getCacheList(): IAnyObject {
    return this.statusObj.Cache;
  }

  public notifyAsFinished(key: string) {
    this.statusObj.Status[`${key}AfterCallback`](PROMISE_STATUS.FULFILLED);
  }

  public reset() {
    this.statusObj = {
      Status: {},
      Cache: {}
    };
  }
}
