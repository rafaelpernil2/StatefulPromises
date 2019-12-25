import { DataUtil, ICustomPromise, PromiseBatchStatus } from '../index';
import { SIMPLE_TEST } from '../utils/promise-util';

(async () => {
  const pbs = new PromiseBatchStatus();
  const cp1: ICustomPromise<string> = {
    name: SIMPLE_TEST,
    function: () => Promise.resolve('')
  };
  const cp2: ICustomPromise<string> = {
    name: `${SIMPLE_TEST}2`,
    function: () => Promise.resolve('')
  };

  try {
    await DataUtil.buildStatefulPromise(cp1, pbs);
  } catch (error) {
    // Do nothing
  }
  try {
    await DataUtil.buildStatefulPromise(cp2, pbs);
  } catch (error) {
    // Do nothing
  }
  const checkFulfilled = DataUtil.isPromiseBatchFulfilled(pbs);
  pbs.notifyAsFinished(SIMPLE_TEST);

  if (process && process.send) {
    process.send(await checkFulfilled);
  }
})();