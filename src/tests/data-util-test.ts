import { expect } from 'chai';
import * as cp from 'child_process';
import ko from 'knockout';
import 'mocha';
import * as path from 'path';
import { NO_RESULT } from '../constants/global-constants';
import { DataUtil, ICustomPromise, PromiseBatch, PromiseBatchStatus } from '../index';
import { IAnyObject } from '../interfaces/i-any-object';
import { DUMMY_MESSAGES, PromiseUtil, SIMPLE_TEST } from '../utils/promise-util';

describe('DataUtil.isPromiseBatchCompleted(batchStatus: PromiseBatchStatus): Given a "batchStatus", it checks if all properties have a value different than pending and waits for changes until all are different than pending', () => {
  it('Given a set of two customPromises built under the same batchStatus, once they are completed this function returns true', async () => {
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
    pbs.notifyAsFinished(`${SIMPLE_TEST}2`);
    const result = await checkCompleted;
    expect(result).to.eq(true);
  });
  it('Given a set of two customPromises built under the same batchStatus, when at least one of them is not notified as finished, the function waits forever', async () => {
    // Create the child
    const child = cp.fork(path.join(__dirname, '../workers/batch-completed-worker.ts'), [], { execArgv: ['-r', 'ts-node/register'] });
    // Use an observable variable to refresh the value once the worker finishes
    const isCompleted = ko.observable(false);
    child.on('message', data => isCompleted(data));
    // Kill after 5000 ms
    setTimeout(() => {
      child.kill();
    }, 5000);
    await PromiseUtil.setTimeout(5000);

    expect(isCompleted()).to.eq(false);
  });
});

describe('DataUtil.isPromiseBatchFulfilled(batchStatus: PromiseBatchStatus): Given a "batchStatus", it checks if all properties have a value equal to fulfilled and waits for changes until all are fulfilled', () => {
  it('Given a set of two customPromises built and completed under the same batchStatus, once both are fulfilled this function returns true', async () => {
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
    const checkCompleted = DataUtil.isPromiseBatchFulfilled(pbs);
    pbs.notifyAsFinished(SIMPLE_TEST);
    pbs.notifyAsFinished(`${SIMPLE_TEST}2`);
    const result = await checkCompleted;
    expect(result).to.eq(true);
  });
  it('Given a set of two customPromises built and completed under the same batchStatus, once any of them is rejected this function returns false', async () => {
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
    const checkCompleted = DataUtil.isPromiseBatchFulfilled(pbs);
    pbs.notifyAsFinished(SIMPLE_TEST);
    pbs.notifyAsFinished(`${SIMPLE_TEST}2`);
    const result = await checkCompleted;
    expect(result).to.eq(false);
  });
  it('Given a set of two customPromises built under the same batchStatus, when at least one of them is not notified as finished, the function waits forever', async () => {
    // Create the child
    const child = cp.fork(path.join(__dirname, '../workers/batch-fulfilled-worker.ts'), [], { execArgv: ['-r', 'ts-node/register'] });
    // Use an observable variable to refresh the value once the worker finishes
    const isFulfilled = ko.observable(false);
    child.on('message', data => isFulfilled(data));
    // Kill after 5000 ms
    setTimeout(() => {
      child.kill();
    }, 5000);
    await PromiseUtil.setTimeout(5000);

    expect(isFulfilled()).to.eq(false);
  });
});

describe('DataUtil.buildStatefulPromise<T>(customPromise: ICustomPromise<T>, promiseStatus: PromiseBatchStatus): Given a "customPromise" and a "promiseStatus", it calls the "customPromise" function and saves the status inside promiseStatus and its result if it were cached', () => {
  it('First execution - Simple OK: Given that "promiseStatus" is empty and customPromise contains "name" and "function" only, it resolves with "Resolved"', async () => {
    const pbs = new PromiseBatchStatus();
    const p: ICustomPromise<string> = {
      name: SIMPLE_TEST,
      function: PromiseUtil.buildFixedTimeNoParamPromise(0, true)
    };
    const result = await DataUtil.buildStatefulPromise(p, pbs);
    expect(result).to.equal(DUMMY_MESSAGES.RESOLVED);
  });

  it('First execution - Simple NOT-OK: Given that "promiseStatus" is empty and customPromise contains "name" and "function" only, it rejects with "Rejected"', async () => {
    const pbs = new PromiseBatchStatus();
    const p: ICustomPromise<string> = {
      name: SIMPLE_TEST,
      function: PromiseUtil.buildFixedTimeNoParamPromise(0, false)
    };
    let result;
    try {
      await DataUtil.buildStatefulPromise(p, pbs);
    } catch (error) {
      result = error;
    }
    expect(result).to.equal(DUMMY_MESSAGES.REJECTED);
  });

  // tslint:disable-next-line: max-line-length
  it('First execution - Simple thisArg OK: Given that "promiseStatus" is empty and customPromise contains "name", "function" and "thisArg", it resolves with "Resolved"', async () => {
    const pbs = new PromiseBatchStatus();
    const pu = new PromiseUtil(DUMMY_MESSAGES.RESOLVED);
    const p: ICustomPromise<string> = {
      name: SIMPLE_TEST,
      thisArg: pu,
      function: pu.buildNoParamFixedTimePromise(0)
    };
    const result = await DataUtil.buildStatefulPromise(p, pbs);
    expect(result).to.equal(DUMMY_MESSAGES.RESOLVED);
  });

  // tslint:disable-next-line: max-line-length
  it('First execution - Simple thisArg NOT-OK: Given that "promiseStatus" is empty and customPromise contains "name", "function" and "thisArg", it rejects with "Rejected"', async () => {
    const pbs = new PromiseBatchStatus();
    const pu = new PromiseUtil(DUMMY_MESSAGES.REJECTED);
    const p: ICustomPromise<string> = {
      name: SIMPLE_TEST,
      thisArg: pu,
      function: pu.buildNoParamFixedTimePromise(0)
    };
    let result;
    try {
      await DataUtil.buildStatefulPromise(p, pbs);
    } catch (error) {
      result = error;
    }
    expect(result).to.equal(DUMMY_MESSAGES.REJECTED);
  });

  // tslint:disable-next-line: max-line-length
  it('First execution - Simple thisArg|args OK: Given that "promiseStatus" is empty and customPromise contains "name", "function", "thisArgs" and "args", it resolves with "Resolved"', async () => {
    const pbs = new PromiseBatchStatus();
    const pu = new PromiseUtil();
    const p: ICustomPromise<string> = {
      name: SIMPLE_TEST,
      thisArg: pu,
      function: pu.buildSingleParamFixedTimeCheckedPromise(0),
      args: [DUMMY_MESSAGES.RESOLVED]
    };
    const result = await DataUtil.buildStatefulPromise(p, pbs);
    expect(result).to.equal(DUMMY_MESSAGES.RESOLVED);
  });

  // tslint:disable-next-line: max-line-length
  it('First execution - Simple thisArg| Multiple args OK: Given that "promiseStatus" is empty and customPromise contains "name", "function", "thisArgs" and "args", it resolves with "Resolved"', async () => {
    const pbs = new PromiseBatchStatus();
    const pu = new PromiseUtil();
    const p: ICustomPromise<string> = {
      name: SIMPLE_TEST,
      thisArg: pu,
      function: pu.buildPassthroughPromise(0),
      args: [DUMMY_MESSAGES.RESOLVED, 'dummy', 'another']
    };
    const result = await DataUtil.buildStatefulPromise(p, pbs);
    expect(result).to.eql(p.args);
  });

  // tslint:disable-next-line: max-line-length
  it('First execution - Simple thisArg|args NOT-OK: Given that "promiseStatus" is empty and customPromise contains "name", "function", "thisArgs" and "args", it rejects with "Rejected"', async () => {
    const pbs = new PromiseBatchStatus();
    const pu = new PromiseUtil();
    const p: ICustomPromise<string> = {
      name: SIMPLE_TEST,
      thisArg: pu,
      function: pu.buildSingleParamFixedTimeCheckedPromise(0),
      args: [DUMMY_MESSAGES.REJECTED]
    };
    let result;
    try {
      await DataUtil.buildStatefulPromise(p, pbs);
    } catch (error) {
      result = error;
    }
    expect(result).to.equal(DUMMY_MESSAGES.REJECTED);
  });

  // tslint:disable-next-line: max-line-length
  it('First execution - Validated OK: Given that "promiseStatus" is empty and customPromise contains "name", "function", "thisArgs", "args" and "validate", it resolves with "Resolved" given that the input is valid', async () => {
    const pbs = new PromiseBatchStatus();
    const pu = new PromiseUtil();
    let validatorExecuted = false;
    const p: ICustomPromise<string> = {
      name: SIMPLE_TEST,
      thisArg: pu,
      function: pu.buildSingleParamFixedTimeUncheckedPromise(0),
      args: [DUMMY_MESSAGES.RESOLVED],
      validate: data => {
        validatorExecuted = true;
        return PromiseUtil.dummyValidator(data);
      }
    };
    const result = await DataUtil.buildStatefulPromise(p, pbs);
    expect(validatorExecuted).to.equal(true);
    expect(result).to.equal(DUMMY_MESSAGES.RESOLVED);
  });

  // tslint:disable-next-line: max-line-length
  it('First execution - Validated NOT-OK: Given that "promiseStatus" is empty and customPromise contains "name", "function", "thisArgs", "args" and "validate", it rejects with "Rejected" given that the input is invalid', async () => {
    const pbs = new PromiseBatchStatus();
    const pu = new PromiseUtil();
    let validatorExecuted = false;
    const p: ICustomPromise<string> = {
      name: SIMPLE_TEST,
      thisArg: pu,
      function: pu.buildSingleParamFixedTimeUncheckedPromise(0),
      args: [DUMMY_MESSAGES.REJECTED],
      validate: data => {
        validatorExecuted = true;
        return PromiseUtil.dummyValidator(data);
      }
    };
    let result;
    try {
      await DataUtil.buildStatefulPromise(p, pbs);
    } catch (error) {
      result = error;
    }
    expect(validatorExecuted).to.equal(true);
    expect(result).to.equal(DUMMY_MESSAGES.REJECTED);
  });

  // tslint:disable-next-line: max-line-length
  it('First execution - DoneCallback: Given that "promiseStatus" is empty and customPromise contains "name", "function", "thisArgs", "args", "validate" and "doneCallback", it resolves with "Resolved2"', async () => {
    const pbs = new PromiseBatchStatus();
    const pu = new PromiseUtil();
    const p: ICustomPromise<string> = {
      name: SIMPLE_TEST,
      thisArg: pu,
      function: pu.buildSingleParamFixedTimeUncheckedPromise(0),
      args: [DUMMY_MESSAGES.RESOLVED],
      validate: PromiseUtil.dummyValidator,
      doneCallback: data => (data += '2')
    };
    const result = await DataUtil.buildStatefulPromise(p, pbs);
    expect(result).to.equal(`${DUMMY_MESSAGES.RESOLVED}2`);
  });

  // tslint:disable-next-line: max-line-length
  it('First execution - CatchCallback: Given that "promiseStatus" is empty and customPromise contains "name", "function", "thisArgs", "args", "validate" and "catchCallback", it rejects with "Rejected2"', async () => {
    const pbs = new PromiseBatchStatus();
    const pu = new PromiseUtil();
    const p: ICustomPromise<string> = {
      name: SIMPLE_TEST,
      thisArg: pu,
      function: pu.buildSingleParamFixedTimeUncheckedPromise(0),
      args: [DUMMY_MESSAGES.REJECTED],
      validate: PromiseUtil.dummyValidator,
      catchCallback: data => (data += '2')
    };
    let result;
    try {
      await DataUtil.buildStatefulPromise(p, pbs);
    } catch (error) {
      result = error;
    }
    expect(result).to.equal(`${DUMMY_MESSAGES.REJECTED}2`);
  });

  // tslint:disable-next-line: max-line-length
  it('First execution - DoneCallback | CatchCallback: Given that "promiseStatus" is empty and customPromise contains "name", "function", "thisArgs", "args", "validate", "doneCallback" and "catchCallback", it resolves with "Resolved1" given that the input is valid', async () => {
    const pbs = new PromiseBatchStatus();
    const pu = new PromiseUtil();
    const p: ICustomPromise<string> = {
      name: SIMPLE_TEST,
      thisArg: pu,
      function: pu.buildSingleParamFixedTimeUncheckedPromise(0),
      args: [DUMMY_MESSAGES.RESOLVED],
      validate: PromiseUtil.dummyValidator,
      doneCallback: data => (data += '1'),
      catchCallback: data => (data += '2')
    };
    const result = await DataUtil.buildStatefulPromise(p, pbs);
    expect(result).to.equal(`${DUMMY_MESSAGES.RESOLVED}1`);
  });

  // tslint:disable-next-line: max-line-length
  it('First execution - DoneCallback | CatchCallback NOT-OK: Given that "promiseStatus" is empty and customPromise contains "name", "function", "thisArgs", "args", "validate", "doneCallback" and "catchCallback", it rejects with "Rejected2" given that the input is invalid', async () => {
    const pbs = new PromiseBatchStatus();
    const pu = new PromiseUtil();
    const p: ICustomPromise<string> = {
      name: SIMPLE_TEST,
      thisArg: pu,
      function: pu.buildSingleParamFixedTimeUncheckedPromise(0),
      args: [DUMMY_MESSAGES.REJECTED],
      validate: PromiseUtil.dummyValidator,
      doneCallback: data => (data += '1'),
      catchCallback: data => (data += '2')
    };
    let result;
    try {
      await DataUtil.buildStatefulPromise(p, pbs);
    } catch (error) {
      result = error;
    }
    expect(result).to.equal(`${DUMMY_MESSAGES.REJECTED}2`);
  });

  // tslint:disable-next-line: max-line-length
  it('First execution - DoneCallback | CatchCallback FULL REJECTION: Given that "promiseStatus" is empty and customPromise contains "name", "function", "thisArgs", "args", "validate", "doneCallback" and "catchCallback", it rejects with "Rejected2" given that the promise rejects without executing validate', async () => {
    const pbs = new PromiseBatchStatus();
    const pu = new PromiseUtil();
    let validatorExecuted = false;
    const p: ICustomPromise<string> = {
      name: SIMPLE_TEST,
      thisArg: pu,
      function: pu.buildSingleParamFixedTimeCheckedPromise(0),
      args: [DUMMY_MESSAGES.REJECTED],
      validate: data => {
        validatorExecuted = true;
        return PromiseUtil.dummyValidator(data);
      },
      doneCallback: data => (data += '1'),
      catchCallback: data => (data += '2')
    };
    let result;
    try {
      await DataUtil.buildStatefulPromise(p, pbs);
    } catch (error) {
      result = error;
    }
    expect(validatorExecuted).to.equal(false);
    expect(result).to.equal(`${DUMMY_MESSAGES.REJECTED}2`);
  });

  // tslint:disable-next-line: max-line-length
  it('Second and up executions - Cache enabled: Given that "promiseStatus" has a fullfilled promise and customPromise contains "name", "function", "thisArgs", "args", "cached" as true, "validate", "doneCallback" and "catchCallback" and the previously fulfilled promise resolved "Resolved1" now it returns "Resolved1" without calling the promise nor calling validate, doneCallback or catchCallback', async () => {
    const pbs = new PromiseBatchStatus();
    const pu = new PromiseUtil();
    let validatorExecuted = false;
    let doneCallbackExecuted = false;
    let catchCallbackExecuted = false;
    const p: ICustomPromise<string> = {
      name: SIMPLE_TEST,
      thisArg: pu,
      function: pu.buildSingleParamFixedTimeCheckedPromise(0),
      args: [DUMMY_MESSAGES.RESOLVED],
      cached: true,
      validate: data => {
        validatorExecuted = true;
        return PromiseUtil.dummyValidator(data);
      },
      doneCallback: data => {
        doneCallbackExecuted = true;
        return (data += '1');
      },
      catchCallback: data => {
        catchCallbackExecuted = true;
        return (data += '2');
      }
    };
    const result = await DataUtil.buildStatefulPromise(p, pbs);
    expect(validatorExecuted).to.equal(true);
    expect(doneCallbackExecuted).to.equal(true);
    expect(catchCallbackExecuted).to.equal(false);
    expect(result).to.equal(`${DUMMY_MESSAGES.RESOLVED}1`);

    validatorExecuted = false;
    doneCallbackExecuted = false;
    catchCallbackExecuted = false;

    const result2 = await DataUtil.buildStatefulPromise(p, pbs);
    expect(validatorExecuted).to.equal(false);
    expect(doneCallbackExecuted).to.equal(false);
    expect(catchCallbackExecuted).to.equal(false);
    expect(result2).to.equal(`${DUMMY_MESSAGES.RESOLVED}1`);
  });

  // tslint:disable-next-line: max-line-length
  it('Second and up executions - Cache disabled: Given that "promiseStatus" has a fullfilled promise and customPromise contains "name", "function", "thisArgs", "args", "cached" as false, "validate", "doneCallback" and "catchCallback" and the previously fulfilled promise resolved "Resolved1" now it returns NO_RESULT (undefined) without calling the promise nor calling validate, doneCallback or catchCallback', async () => {
    const pbs = new PromiseBatchStatus();
    const pu = new PromiseUtil();
    let validatorExecuted = false;
    let doneCallbackExecuted = false;
    let catchCallbackExecuted = false;
    const p: ICustomPromise<string> = {
      name: SIMPLE_TEST,
      thisArg: pu,
      function: pu.buildSingleParamFixedTimeCheckedPromise(0),
      args: [DUMMY_MESSAGES.RESOLVED],
      cached: false,
      validate: data => {
        validatorExecuted = true;
        return PromiseUtil.dummyValidator(data);
      },
      doneCallback: data => {
        doneCallbackExecuted = true;
        return (data += '1');
      },
      catchCallback: data => {
        catchCallbackExecuted = true;
        return (data += '2');
      }
    };
    const result = await DataUtil.buildStatefulPromise(p, pbs);
    expect(validatorExecuted).to.equal(true);
    expect(doneCallbackExecuted).to.equal(true);
    expect(catchCallbackExecuted).to.equal(false);
    expect(result).to.equal(`${DUMMY_MESSAGES.RESOLVED}1`);

    validatorExecuted = false;
    doneCallbackExecuted = false;
    catchCallbackExecuted = false;

    const result2 = await DataUtil.buildStatefulPromise(p, pbs);
    expect(validatorExecuted).to.equal(false);
    expect(doneCallbackExecuted).to.equal(false);
    expect(catchCallbackExecuted).to.equal(false);
    expect(result2).to.equal(NO_RESULT);
  });
});
