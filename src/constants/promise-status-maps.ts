import { ICustomPromise } from '../types/i-custom-promise';
import { PromiseStatus } from '../types/promise-status';

export const STATUS_CALLBACK_MAP: Record<PromiseStatus, Partial<keyof ICustomPromise<unknown>> | undefined> = {
  [PromiseStatus.Pending]: undefined,
  [PromiseStatus.Fulfilled]: 'doneCallback',
  [PromiseStatus.Rejected]: 'catchCallback'
};

export const STATUS_PROMISE_METHODM_MAP: Record<PromiseStatus, 'resolve' | 'reject' | undefined> = {
  [PromiseStatus.Pending]: undefined,
  [PromiseStatus.Fulfilled]: 'resolve',
  [PromiseStatus.Rejected]: 'reject'
};
