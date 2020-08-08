import { ICustomPromise } from '../types/i-custom-promise';
import { PromiseStatus } from '../types/promise-status';
import { GLOBAL_CONSTANTS } from './global-constants';

export const STATUS_CALLBACK_MAP: Record<PromiseStatus, Partial<keyof ICustomPromise<unknown>> | undefined> = {
  [PromiseStatus.Pending]: GLOBAL_CONSTANTS.NO_RESULT,
  [PromiseStatus.Fulfilled]: 'doneCallback',
  [PromiseStatus.Rejected]: 'catchCallback'
};

export const STATUS_PROMISE_METHODM_MAP: Record<PromiseStatus, 'resolve' | 'reject' | undefined> = {
  [PromiseStatus.Pending]: GLOBAL_CONSTANTS.NO_RESULT,
  [PromiseStatus.Fulfilled]: 'resolve',
  [PromiseStatus.Rejected]: 'reject'
};
