import { CustomObservable } from '../custom-observable/custom-observable';
import { ICustomPromise } from './i-custom-promise';
import { PromiseStatus } from './promise-status';

export interface ICustomPromiseData<T> {
  customPromise: ICustomPromise<T>;
  response?: T;
  cache?: T;
  // This tuple represents "promiseStatus" and "afterProcessingStatus"
  status: [CustomObservable<PromiseStatus>, CustomObservable<PromiseStatus>];
}
