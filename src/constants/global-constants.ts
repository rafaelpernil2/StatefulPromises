import { IAnyObject } from 'src/interfaces/i-any-object';
import { ICustomPromise } from '../interfaces/i-custom-promise';

export const PROMISE_STATUS = {
  PENDING: 'p',
  FULFILLED: 'f',
  REJECTED: 'r'
};

export const STATUS_CALLBACK_MAP: { [key: string]: Partial<keyof ICustomPromise<IAnyObject>> } = {
  [PROMISE_STATUS.FULFILLED]: 'doneCallback',
  [PROMISE_STATUS.REJECTED]: 'catchCallback'
};

export const BATCH_MODE = {
  ALL: 'all',
  ANY: 'any'
};

export const ERROR_MSG = {
  NO_CACHED_VALUE: 'There is not cached value for this promise',
  INVALID_PROMISE_NAME: 'This batch does not have a not a promise with this name',
  NO_PROMISE_FUNCTION: 'Cannot read function of promise',
  SOME_PROMISE_STILL_RUNNING: 'Some promise is still running. You should not be seeing this',
  PENDING_STATUS: 'The status of this promise is pending. You should not be seeing this',
  SOME_PROMISE_REJECTED: 'Some promise was rejected',
  NO_NEGATIVE_CONC_LIMIT: 'You cannot provide a concurrent limit below 1',
  INVALID_BATCH_MODE: 'This batch mode is invalid. You should not be seeing this'
};

// eslint-disable-next-line id-blacklist
export const NO_RESULT = undefined;

export const AFTER_CALLBACK = 'AfterCallback';
