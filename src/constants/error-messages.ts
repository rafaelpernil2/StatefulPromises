export const ERROR_MSG = {
  NO_CACHED_VALUE: 'There is no cached value for this promise',
  INVALID_PROMISE_NAME: 'This batch does not have a promise with this name',
  NO_PROMISE_FUNCTION: 'A custom promise must have a "function" property',
  NO_PROMISE_NAME: 'A custom promise must have a "name" property',
  SOME_PROMISE_STILL_RUNNING: 'Some promise is still running. You should not be seeing this',
  PENDING_STATUS: 'The status of this promise is pending. You should not be seeing this',
  SOME_PROMISE_REJECTED: 'Some promise was rejected',
  NO_NEGATIVE_CONC_LIMIT: 'You cannot provide a concurrent limit below 1',
  INVALID_BATCH_MODE: 'This batch mode is invalid. You should not be seeing this'
};
