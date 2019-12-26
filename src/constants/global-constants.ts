export const PROMISE_STATUS = {
  PENDING: 'p',
  FULFILLED: 'f',
  REJECTED: 'r'
};

export const BATCH_MODE = {
  ALL: 'all',
  ANY: 'any'
};

export const ERROR_MSG = {
  NO_CACHED_VALUE: 'There is not cached value for this promise',
  NO_PROMISE_FUNCTION: 'Cannot read function of promise',
  SOME_PROMISE_STILL_RUNNING: 'Some promise is still running. You should not be seeing this',
  SOME_PROMISE_REJECTED: 'Some promise was rejected',
  NO_NEGATIVE_CONC_LIMIT: 'You cannot provide a concurrent limit below 1'
};

export const NO_RESULT = undefined;

export const AFTER_CALLBACK = 'AfterCallback';
