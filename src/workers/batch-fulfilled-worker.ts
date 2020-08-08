import { SIMPLE_TEST } from '../utils/test-util';
import { PromiseBatch } from '../promise-batch';
import { ICustomPromise } from '../types/i-custom-promise';
(async (): Promise<void> => {
  const cp1: ICustomPromise<string> = { name: SIMPLE_TEST, function: () => Promise.resolve('') };
  const cp2: ICustomPromise<string> = { name: `${SIMPLE_TEST}2`, function: () => Promise.resolve('') };
  const promiseBatch = new PromiseBatch();
  await promiseBatch.exec(cp1).catch(error => error);
  await promiseBatch.exec(cp2).catch(error => error);
  const checkFulfilled = promiseBatch.isBatchFulfilled();
  promiseBatch.finishPromise(SIMPLE_TEST);
  if (process && process.send) {
    process.send(await checkFulfilled);
  }
})();
