import { ICustomPromise } from '../types/i-custom-promise';
import { PromiseStatus } from '../types/promise-status';

export const STATUS_CALLBACK_MAP: Record<PromiseStatus, Partial<keyof ICustomPromise<unknown>> | undefined> = {
  [PromiseStatus.Uninitialized]: undefined,
  [PromiseStatus.Pending]: undefined,
  [PromiseStatus.Fulfilled]: 'doneCallback',
  [PromiseStatus.Rejected]: 'catchCallback'
};
