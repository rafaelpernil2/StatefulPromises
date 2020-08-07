import { ICustomPromise } from '../interfaces/i-custom-promise';
import { SIMPLE_TEST } from '../utils/promise-util';
import { PromiseBatch } from '../promise-batch';

(async (): Promise<void> => {
  const cp1: ICustomPromise<string> = {
    name: SIMPLE_TEST,
    function: () => Promise.resolve('')
  };
  const cp2: ICustomPromise<string> = {
    name: `${SIMPLE_TEST}2`,
    function: () => Promise.resolve('')
  };

  const promiseBatch = new PromiseBatch();

  try {
    await promiseBatch.exec(cp1);
  } catch (error) {
    // Do nothing
  }
  try {
    await promiseBatch.exec(cp2);
  } catch (error) {
    // Do nothing
  }
  const checkFulfilled = promiseBatch.isBatchFulfilled();
  promiseBatch.finishPromise(SIMPLE_TEST);

  if (process && process.send) {
    process.send(await checkFulfilled);
  }
})();
