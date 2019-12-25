import { DataUtil, ICustomPromise, PromiseBatchStatus } from '../index';
import { PromiseUtil, SIMPLE_TEST } from '../utils/promise-util';

(async () => {
  const pbs = new PromiseBatchStatus();
  const cp1: ICustomPromise<string> = {
    name: SIMPLE_TEST,
    function: () => Promise.resolve('')
  };
  const cp2: ICustomPromise<string> = {
    name: `${SIMPLE_TEST}2`,
    function: () => Promise.reject('')
  };

  try {
    await DataUtil.buildStatefulPromise(cp1, pbs);
  } catch (error) {
    // Even if the promise is rejected, we save the error value;
    // return error;
  }
  try {
    await DataUtil.buildStatefulPromise(cp2, pbs);
  } catch (error) {
    // Even if the promise is rejected, we save the error value;
    // return error;
  }
  const checkCompleted = DataUtil.isPromiseBatchCompleted(pbs);
  pbs.notifyAsFinished(SIMPLE_TEST);

  if (process && process.send) {
    process.send(await checkCompleted);
  }
})();
