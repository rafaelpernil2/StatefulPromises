import { ICustomPromise } from '../interfaces/i-custom-promise';
import { PromiseBatchStatus } from '../promise-batch-status';
import { DataUtil } from '../utils/data-util';
import { SIMPLE_TEST } from '../utils/promise-util';

(async (): Promise<void> => {
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
    await DataUtil.execStatefulPromise(cp1, pbs);
  } catch (error) {
    // Do nothing
  }
  try {
    await DataUtil.execStatefulPromise(cp2, pbs);
  } catch (error) {
    // Do nothing
  }
  const checkFulfilled = DataUtil.isPromiseBatchFulfilled(pbs);
  pbs.notifyAsFinished(SIMPLE_TEST);

  if (process && process.send) {
    process.send(await checkFulfilled);
  }
})();
