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
    function: () => Promise.reject('')
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
  const checkCompleted = DataUtil.isPromiseBatchCompleted(pbs);

  pbs.notifyAsFinished(SIMPLE_TEST);

  if (process && process.send) {
    process.send(await checkCompleted);
  }
})();
