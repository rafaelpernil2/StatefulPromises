import { expect } from 'chai';
import ko from 'knockout';
import 'mocha';
import { AFTER_CALLBACK, ERROR_MSG, PROMISE_STATUS } from '../constants/global-constants';
import { PromiseBatch } from '../index';
import { PromiseBatchStatus } from '../index';
import { IAnyObject } from '../interfaces/i-any-object';
import { ICustomPromise } from '../interfaces/i-custom-promise';
import { DUMMY_MESSAGES, PromiseUtil } from '../utils/promise-util';

const cp: ICustomPromise<object[]> = {
  name: 'GetSomething',
  function: PromiseUtil.buildFixedTimePromise(100),
  thisArg: undefined,
  validate: data => {
    return true;
  },
  doneCallback: data => {
    const res = ((data[0] as IAnyObject).result += 'd');
    return [{ result: res }];
  },
  catchCallback: reason => {
    const res = ((reason[0] as IAnyObject).result += 'c');
    return [{ result: res }];
  },
  args: [{ result: 'Result' }],
  cached: true
};

const cpl: Array<ICustomPromise<unknown>> = [
  {
    name: 'ExternalAPI2',
    function: PromiseUtil.buildFixedTimePromise(0)
  },
  {
    name: 'LoadJSON',
    function: PromiseUtil.buildFixedTimePromise(0)
  }
];

describe('new PromiseBatch(statusObject?: PromiseBatchStatus): Initializes the statusObject as the given statusObject if provided or a new PromiseBatchStatus and customPromiseList and batchResponse as empty object', () => {
  const pbs = new PromiseBatchStatus();

  it('Given an statusObject is provided, it sets status object as that provided object and customPromiseList and batchResponse as empty object', async () => {
    const pb = new PromiseBatch(pbs);
    expect(pb.statusObject).to.eql(pbs);
    expect(pb.customPromiseList).to.eql({});
    expect(pb.batchResponse).to.eql({});
  });
  it('Given no statusObject is provided, it sets status object as a new PromiseBatchStats and customPromiseList and batchResponse as empty object', async () => {
    const pb = new PromiseBatch();
    expect(pbs.statusObject).to.not.eql(pbs);
    expect(pb.customPromiseList).to.eql({});
    expect(pb.batchResponse).to.eql({});
  });
});

describe('PromiseBatch.add<T>(customPromise: ICustomPromise<T>): Given a customPromise, if it does not exist already, it is added to customPromiseList', () => {
  it('Inserts customPromise inside customPromiseList given it was not added before', async () => {
    const pb = new PromiseBatch();
    pb.add(cp);
    expect(pb.customPromiseList[cp.name]).to.eql(cp);
  });
  it('Does not insert customPromise inside customPromiseList another is found with the same name', async () => {
    const pb = new PromiseBatch();
    const cp2: ICustomPromise<number> = {
      name: 'GetSomething',
      function: PromiseUtil.buildSingleParamFixedTimePromise<number>(5000)
    };
    pb.add(cp);
    pb.add(cp2);
    expect(pb.customPromiseList[cp.name]).to.eql(cp);
    expect(pb.customPromiseList[cp.name]).to.not.eql(cp2);
  });
});

describe('PromiseBatch.addList(customPromiseList: Array<ICustomPromise<unknown>>): Given a "customPromiseList", each value is added to "customPromiseList"', () => {
  it('Inserts each customPromise inside customPromiseList', async () => {
    const pb = new PromiseBatch();
    pb.addList(cpl);
    cpl.forEach(p => {
      expect(pb.customPromiseList[p.name]).to.eql(p);
    });
  });
  it('Inserts no customPromise inside customPromiseList when an empty list is provided ', async () => {
    const pb = new PromiseBatch();
    pb.addList([]);
    expect(pb.customPromiseList).to.eql({});
  });
});

describe('PromiseBatch.exec<T>(nameOrCustomPromise: string | ICustomPromise<T>): Given the name of a promise inside this instance of PromiseBatch or a custom promise, it calls add(customPromise) and DataUtil.execStatefulPromise passing this customPromise as parameter and the inbuilt PromiseBatchStatus object "statusObject"', () => {
  it('Given a promise name and a promise with that name is included in the PromiseBatch, it finds it and calls DataUtil.execStatefulPromise', async () => {
    const pbs = new PromiseBatchStatus();
    const pb = new PromiseBatch(pbs);
    pb.add(cp);
    const result = await pb.exec(cp.name);
    expect(result).to.eql(cp.args);
  });
  it('Given a customPromise not included in the PromiseBatch, it adds it and calls DataUtil.execStatefulPromise', async () => {
    const pbs = new PromiseBatchStatus();
    const pb = new PromiseBatch(pbs);
    const result = await pb.exec(cp);
    expect(result).to.eql(cp.args);
  });
});

describe('PromiseBatch.promiseAll(concurrentLimit?: number): Given a list of customPromises contained in the instance of PromiseBatch and an optional concurrentLimit, it calls all promises and when all are finished, if all were fullfilled, it returns an object with all results', () => {
  it('Given no promise list was previously added and no concurrencyLimit is passed, it returns an empty object inmediately', async () => {
    const pbs = new PromiseBatchStatus();
    const pb = new PromiseBatch(pbs);
    const result = await pb.promiseAll();
    expect(result).to.eql({});
  });
  it('Given no promise list was previously added and a positive concurrencyLimit is passed, it returns an empty object inmediately', async () => {
    const pbs = new PromiseBatchStatus();
    const pb = new PromiseBatch(pbs);
    const result = await pb.promiseAll(100);
    expect(result).to.eql({});
  });
  it('Given no promise list was previously added and a negative concurrencyLimit is passed, it throws an error', async () => {
    const pbs = new PromiseBatchStatus();
    const pb = new PromiseBatch(pbs);
    let result;
    try {
      const call = pb.promiseAll(-3);
      pb.finishAllPromises();
      result = await call;
    } catch (error) {
      result = error;
    }
    expect(result.message).to.equal(ERROR_MSG.NO_NEGATIVE_CONC_LIMIT);
  });
  it('Given no promise list was previously added and a zero concurrencyLimit is passed, it throws an error', async () => {
    const pbs = new PromiseBatchStatus();
    const pb = new PromiseBatch(pbs);
    let result;
    try {
      const call = pb.promiseAll(0);
      pb.finishAllPromises();
      result = await call;
    } catch (error) {
      result = error;
    }
    expect(result.message).to.equal(ERROR_MSG.NO_NEGATIVE_CONC_LIMIT);
  });
  it('Given a promise list was previously added and no concurrencyLimit is passed, it returns the results in an object once finished', async () => {
    const pbs = new PromiseBatchStatus();
    const pb = new PromiseBatch(pbs);
    pb.addList(cpl);
    const call = pb.promiseAll();
    pb.finishAllPromises();
    const result = await call;
    const expectedRes = {
      ExternalAPI2: PromiseUtil.NO_INPUT_PROVIDED,
      LoadJSON: PromiseUtil.NO_INPUT_PROVIDED
    };
    expect(result).to.eql(expectedRes);
  });
  it('Given a promise list was previously added and a positive concurrencyLimit is passed, it returns the results in an object once finished', async () => {
    const pbs = new PromiseBatchStatus();
    const pb = new PromiseBatch(pbs);
    pb.addList(cpl);
    const call = pb.promiseAll(3);
    pb.finishAllPromises();
    const result = await call;
    const expectedRes = {
      ExternalAPI2: PromiseUtil.NO_INPUT_PROVIDED,
      LoadJSON: PromiseUtil.NO_INPUT_PROVIDED
    };
    expect(result).to.eql(expectedRes);
  });
  it('Given a promise list was previously added and a negative concurrencyLimit is passed, it throws an execption regarding the negative concurrencyLimit', async () => {
    const pbs = new PromiseBatchStatus();
    const pb = new PromiseBatch(pbs);
    pb.addList(cpl);
    let result;
    try {
      const call = pb.promiseAll(-3);
      pb.finishAllPromises();
      result = await call;
    } catch (error) {
      result = error;
    }
    expect(result.message).to.equal(ERROR_MSG.NO_NEGATIVE_CONC_LIMIT);
  });
  it('Given a promise list was previously added and a zero concurrencyLimit is passed, it throws an execption regarding the negative concurrencyLimit', async () => {
    const pbs = new PromiseBatchStatus();
    const pb = new PromiseBatch(pbs);
    pb.addList(cpl);
    let result;
    try {
      const call = pb.promiseAll(0);
      pb.finishAllPromises();
      result = await call;
    } catch (error) {
      result = error;
    }
    expect(result.message).to.equal(ERROR_MSG.NO_NEGATIVE_CONC_LIMIT);
  });
  it('Given a promise list was previously added, one promise rejects and a positive concurrencyLimit is passed, it throws a rejection but contains the result of the promise either way', async () => {
    const pbs = new PromiseBatchStatus();
    const pb = new PromiseBatch(pbs);
    const newCpl = [...cpl];
    newCpl.push({
      name: 'FailPromise',
      function: () => Promise.reject('Rejected')
    });
    pb.addList(newCpl);
    let result;
    try {
      const call = pb.promiseAll(5);
      pb.finishAllPromises();
      result = await call;
    } catch (error) {
      result = error;
    }

    const expectedRes = {
      ExternalAPI2: PromiseUtil.NO_INPUT_PROVIDED,
      LoadJSON: PromiseUtil.NO_INPUT_PROVIDED,
      FailPromise: 'Rejected'
    };

    expect(pb.getBatchResponse()).to.eql(expectedRes);
    expect(result.message).to.contain(ERROR_MSG.SOME_PROMISE_REJECTED);
  });
  it('Given a promise list with callbacks inside was previously added, one promise rejects and a positive concurrencyLimit is passed, it throws a rejection but contains the result of the promise either way', async () => {
    const pbs = new PromiseBatchStatus();
    const pb = new PromiseBatch(pbs);
    const pu = new PromiseUtil();
    const newCpl = [
      {
        name: 'Promise1',
        thisArg: pu,
        function: pu.buildSingleParamFixedTimeCheckedPromise(0),
        args: [DUMMY_MESSAGES.RESOLVED],
        cached: false,
        validate: (data: string) => {
          return PromiseUtil.dummyValidator(data);
        },
        doneCallback: (data: string) => {
          return (data += '1');
        },
        catchCallback: (data: string) => {
          return (data += '2');
        }
      },
      {
        name: 'Promise2',
        thisArg: pu,
        function: pu.buildSingleParamFixedTimeCheckedPromise(0),
        args: [DUMMY_MESSAGES.REJECTED],
        cached: false,
        validate: (data: string) => {
          return PromiseUtil.dummyValidator(data);
        },
        doneCallback: (data: string) => {
          return (data += '1');
        },
        catchCallback: (data: string) => {
          return (data += '2');
        }
      }
    ];
    pb.addList(newCpl);
    let result;
    try {
      const call = pb.promiseAll(5);
      pb.finishAllPromises();
      result = await call;
    } catch (error) {
      result = error;
    }

    const expectedRes = {
      Promise1: `${DUMMY_MESSAGES.RESOLVED}1`,
      Promise2: `${DUMMY_MESSAGES.REJECTED}2`
    };

    expect(pb.getBatchResponse()).to.eql(expectedRes);
    expect(result.message).to.contain(ERROR_MSG.SOME_PROMISE_REJECTED);
  });
  it('Given a promise list with callbacks inside was previously added, one promise rejects and a positive concurrencyLimit is passed, when testing with a concurrency limit of 1 and 2, the second one takes less time', async () => {
    const pu = new PromiseUtil();
    const newCpl = [
      {
        name: 'Promise1',
        thisArg: pu,
        function: pu.buildSingleParamFixedTimeCheckedPromise(1000),
        args: [DUMMY_MESSAGES.RESOLVED],
        cached: false,
        validate: (data: string) => {
          return PromiseUtil.dummyValidator(data);
        },
        doneCallback: (data: string) => {
          return (data += '1');
        },
        catchCallback: (data: string) => {
          return (data += '2');
        }
      },
      {
        name: 'Promise2',
        thisArg: pu,
        function: pu.buildSingleParamFixedTimeCheckedPromise(10),
        args: [DUMMY_MESSAGES.RESOLVED],
        cached: false,
        validate: (data: string) => {
          return PromiseUtil.dummyValidator(data);
        },
        doneCallback: (data: string) => {
          return (data += '1');
        },
        catchCallback: (data: string) => {
          return (data += '2');
        }
      }
    ];

    const pbs1 = new PromiseBatchStatus();
    const pb1 = new PromiseBatch(pbs1);

    pb1.addList(newCpl);

    const tFirst0 = process.hrtime();
    const call1 = pb1.promiseAll(1);
    pb1.finishAllPromises();
    const result1 = await call1;
    const tFirst1 = process.hrtime(tFirst0);

    const pbs2 = new PromiseBatchStatus();
    const pb2 = new PromiseBatch(pbs2);

    pb2.addList(newCpl);

    const tSecond0 = process.hrtime();
    const call2 = pb2.promiseAll(2);
    pb2.finishAllPromises();
    const result2 = await call2;
    const tSecond1 = process.hrtime(tSecond0);

    const expectedRes = {
      Promise1: `${DUMMY_MESSAGES.RESOLVED}1`,
      Promise2: `${DUMMY_MESSAGES.RESOLVED}1`
    };

    expect(pb1.getBatchResponse()).to.eql(expectedRes);
    expect(result1).to.eql(result2);
    expect(pb1.getBatchResponse()).to.eql(pb2.getBatchResponse());
    expect(tFirst1[1]).to.above(tSecond1[1]);
  });
});

describe('PromiseBatch.promiseAny(concurrentLimit?: number): Given a list of customPromises contained in the instance of PromiseBatch and an optional concurrentLimit, it calls all promises and when all are finished, it returns an object with all results', () => {
  it('Given no promise list was previously added and no concurrencyLimit is passed, it returns an empty object inmediately', async () => {
    const pbs = new PromiseBatchStatus();
    const pb = new PromiseBatch(pbs);
    const result = await pb.promiseAny();
    expect(result).to.eql({});
  });
  it('Given no promise list was previously added and a positive concurrencyLimit is passed, it returns an empty object inmediately', async () => {
    const pbs = new PromiseBatchStatus();
    const pb = new PromiseBatch(pbs);
    const result = await pb.promiseAny(100);
    expect(result).to.eql({});
  });
  it('Given no promise list was previously added and a negative concurrencyLimit is passed, it throws an error', async () => {
    const pbs = new PromiseBatchStatus();
    const pb = new PromiseBatch(pbs);
    let result;
    try {
      const call = pb.promiseAny(-3);
      pb.finishAllPromises();
      result = await call;
    } catch (error) {
      result = error;
    }
    expect(result.message).to.equal(ERROR_MSG.NO_NEGATIVE_CONC_LIMIT);
  });
  it('Given no promise list was previously added and a zero concurrencyLimit is passed, it throws an error', async () => {
    const pbs = new PromiseBatchStatus();
    const pb = new PromiseBatch(pbs);
    let result;
    try {
      const call = pb.promiseAny(0);
      pb.finishAllPromises();
      result = await call;
    } catch (error) {
      result = error;
    }
    expect(result.message).to.equal(ERROR_MSG.NO_NEGATIVE_CONC_LIMIT);
  });
  it('Given a promise list was previously added and no concurrencyLimit is passed, it returns the results in an object once finished', async () => {
    const pbs = new PromiseBatchStatus();
    const pb = new PromiseBatch(pbs);
    pb.addList(cpl);
    const call = pb.promiseAny();
    pb.finishAllPromises();
    const result = await call;
    const expectedRes = {
      ExternalAPI2: PromiseUtil.NO_INPUT_PROVIDED,
      LoadJSON: PromiseUtil.NO_INPUT_PROVIDED
    };
    expect(result).to.eql(expectedRes);
  });
  it('Given a promise list was previously added and a positive concurrencyLimit is passed, it returns the results in an object once finished', async () => {
    const pbs = new PromiseBatchStatus();
    const pb = new PromiseBatch(pbs);
    pb.addList(cpl);
    const call = pb.promiseAny(3);
    pb.finishAllPromises();
    const result = await call;
    const expectedRes = {
      ExternalAPI2: PromiseUtil.NO_INPUT_PROVIDED,
      LoadJSON: PromiseUtil.NO_INPUT_PROVIDED
    };
    expect(result).to.eql(expectedRes);
  });
  it('Given a promise list was previously added and a negative concurrencyLimit is passed, it throws an execption regarding the negative concurrencyLimit', async () => {
    const pbs = new PromiseBatchStatus();
    const pb = new PromiseBatch(pbs);
    pb.addList(cpl);
    let result;
    try {
      const call = pb.promiseAny(-3);
      pb.finishAllPromises();
      result = await call;
    } catch (error) {
      result = error;
    }
    expect(result.message).to.equal(ERROR_MSG.NO_NEGATIVE_CONC_LIMIT);
  });
  it('Given a promise list was previously added and a zero concurrencyLimit is passed, it throws an execption regarding the negative concurrencyLimit', async () => {
    const pbs = new PromiseBatchStatus();
    const pb = new PromiseBatch(pbs);
    pb.addList(cpl);
    let result;
    try {
      const call = pb.promiseAny(0);
      pb.finishAllPromises();
      result = await call;
    } catch (error) {
      result = error;
    }
    expect(result.message).to.equal(ERROR_MSG.NO_NEGATIVE_CONC_LIMIT);
  });
  it('Given a promise list was previously added, one promise rejects and a positive concurrencyLimit is passed, it returns the results in an object once finished', async () => {
    const pbs = new PromiseBatchStatus();
    const pb = new PromiseBatch(pbs);
    const newCpl = [...cpl];
    newCpl.push({
      name: 'FailPromise',
      function: () => Promise.reject('Rejected')
    });
    pb.addList(newCpl);
    const call = pb.promiseAny(5);
    pb.finishAllPromises();
    const result = await call;
    const expectedRes = {
      FailPromise: 'Rejected',
      ExternalAPI2: PromiseUtil.NO_INPUT_PROVIDED,
      LoadJSON: PromiseUtil.NO_INPUT_PROVIDED
    };
    expect(result).to.eql(expectedRes);
  });
  it('Given a promise list with callbacks inside was previously added, one promise rejects and a positive concurrencyLimit is passed, it throws a rejection but contains the result of the promise either way', async () => {
    const pbs = new PromiseBatchStatus();
    const pb = new PromiseBatch(pbs);
    const pu = new PromiseUtil();
    const newCpl = [
      {
        name: 'Promise1',
        thisArg: pu,
        function: pu.buildSingleParamFixedTimeCheckedPromise(0),
        args: [DUMMY_MESSAGES.RESOLVED],
        cached: false,
        validate: (data: string) => {
          return PromiseUtil.dummyValidator(data);
        },
        doneCallback: (data: string) => {
          return (data += '1');
        },
        catchCallback: (data: string) => {
          return (data += '2');
        }
      },
      {
        name: 'Promise2',
        thisArg: pu,
        function: pu.buildSingleParamFixedTimeCheckedPromise(0),
        args: [DUMMY_MESSAGES.REJECTED],
        cached: false,
        validate: (data: string) => {
          return PromiseUtil.dummyValidator(data);
        },
        doneCallback: (data: string) => {
          return (data += '1');
        },
        catchCallback: (data: string) => {
          return (data += '2');
        }
      }
    ];
    pb.addList(newCpl);
    let result;
    try {
      const call = pb.promiseAny(5);
      pb.finishAllPromises();
      result = await call;
    } catch (error) {
      result = error;
    }

    const expectedRes = {
      Promise1: `${DUMMY_MESSAGES.RESOLVED}1`,
      Promise2: `${DUMMY_MESSAGES.REJECTED}2`
    };

    expect(result).to.eql(expectedRes);
  });
  it('Given a promise list with callbacks inside was previously added, one promise rejects and a positive concurrencyLimit is passed, when testing with a concurrency limit of 1 and 2, the second one takes less time', async () => {
    const pu = new PromiseUtil();
    const newCpl = [
      {
        name: 'Promise1',
        thisArg: pu,
        function: pu.buildSingleParamFixedTimeCheckedPromise(1000),
        args: [DUMMY_MESSAGES.RESOLVED],
        cached: false,
        validate: (data: string) => {
          return PromiseUtil.dummyValidator(data);
        },
        doneCallback: (data: string) => {
          return (data += '1');
        },
        catchCallback: (data: string) => {
          return (data += '2');
        }
      },
      {
        name: 'Promise2',
        thisArg: pu,
        function: pu.buildSingleParamFixedTimeCheckedPromise(10),
        args: [DUMMY_MESSAGES.RESOLVED],
        cached: false,
        validate: (data: string) => {
          return PromiseUtil.dummyValidator(data);
        },
        doneCallback: (data: string) => {
          return (data += '1');
        },
        catchCallback: (data: string) => {
          return (data += '2');
        }
      }
    ];

    const pb1 = new PromiseBatch();

    pb1.addList(newCpl);

    const tFirst0 = process.hrtime();
    const call1 = pb1.promiseAny(1);
    pb1.finishAllPromises();
    const result1 = await call1;
    const tFirst1 = process.hrtime(tFirst0);

    const pb2 = new PromiseBatch();

    pb2.addList(newCpl);

    const tSecond0 = process.hrtime();
    const call2 = pb2.promiseAny();
    pb2.finishAllPromises();
    const result2 = await call2;
    const tSecond1 = process.hrtime(tSecond0);

    const expectedRes = {
      Promise1: `${DUMMY_MESSAGES.RESOLVED}1`,
      Promise2: `${DUMMY_MESSAGES.RESOLVED}1`
    };

    expect(pb1.getBatchResponse()).to.eql(expectedRes);
    expect(result1).to.eql(result2);
    expect(pb1.getBatchResponse()).to.eql(pb2.getBatchResponse());
    expect(tFirst1[1]).to.above(tSecond1[1]);
  });
});

describe('PromiseBatch.retryFailed(): Given a series of promises failed when executing promiseAll or promiseAny, those are retried', () => {
  it('Given a set of promises with no one rejected, calls promiseAll() with an empty list and returns an the same list as before and the promise list is the same', async () => {
    const pbs = new PromiseBatchStatus();
    const pb = new PromiseBatch(pbs);
    const pu = new PromiseUtil();
    const newCpl = [
      {
        name: 'Promise1',
        thisArg: pu,
        function: pu.buildSingleParamFixedTimeCheckedPromise(0),
        args: [DUMMY_MESSAGES.RESOLVED],
        cached: false,
        validate: (data: string) => {
          return PromiseUtil.dummyValidator(data);
        },
        doneCallback: (data: string) => {
          return (data += '1');
        },
        catchCallback: (data: string) => {
          return (data += '2');
        }
      },
      {
        name: 'Promise2',
        thisArg: pu,
        function: pu.buildSingleParamFixedTimeCheckedPromise(0),
        args: [DUMMY_MESSAGES.RESOLVED],
        cached: false,
        validate: (data: string) => {
          return PromiseUtil.dummyValidator(data);
        },
        doneCallback: (data: string) => {
          return (data += '1');
        },
        catchCallback: (data: string) => {
          return (data += '2');
        }
      }
    ];
    pb.addList(newCpl);
    let result;
    try {
      const call = pb.promiseAll(5);
      pb.finishAllPromises();
      await call;
      result = await pb.retryFailed();
    } catch (error) {
      result = error;
    }
    const expectedRes = {
      Promise1: `${DUMMY_MESSAGES.RESOLVED}1`,
      Promise2: `${DUMMY_MESSAGES.RESOLVED}1`
    };
    expect(result).to.eql(expectedRes);
    expect(pb.customPromiseList).eql({ [newCpl[0].name]: newCpl[0], [newCpl[1].name]: newCpl[1] });
  });
  // tslint:disable-next-line: max-line-length
  it('Given a set of promises with at least one rejected, calls promiseAll() with a diff list and returns the same list with the updated results and the promise list is empty', async () => {
    const pbs = new PromiseBatchStatus();
    const pb = new PromiseBatch(pbs);
    const pu = new PromiseUtil();
    const newCpl = [
      {
        name: 'Promise1',
        thisArg: pu,
        function: pu.buildSingleParamFixedTimeCheckedPromise(0),
        args: [DUMMY_MESSAGES.RESOLVED],
        cached: false,
        validate: (data: string) => {
          return PromiseUtil.dummyValidator(data);
        },
        doneCallback: (data: string) => {
          return (data += '1');
        },
        catchCallback: (data: string) => {
          return (data += '2');
        }
      },
      {
        name: 'Promise2',
        thisArg: pu,
        function: pu.buildSingleParamFixedTimeCheckedPromise(0),
        args: [DUMMY_MESSAGES.REJECTED],
        cached: false,
        validate: (data: string) => {
          return PromiseUtil.dummyValidator(data);
        },
        doneCallback: (data: string) => {
          return (data += '1');
        },
        catchCallback: (data: string) => {
          return (data += '2');
        }
      }
    ];
    pb.addList(newCpl);
    let result;
    try {
      const call = pb.promiseAll(5);
      pb.finishAllPromises();
      await call;
    } catch (error) {
      // Fix the input
      newCpl[1].args = [DUMMY_MESSAGES.RESOLVED];
      result = await pb.retryFailed();
    }
    const expectedRes = {
      Promise1: `${DUMMY_MESSAGES.RESOLVED}1`,
      Promise2: `${DUMMY_MESSAGES.RESOLVED}1`
    };
    expect(result).to.eql(expectedRes);
  });
});
describe('PromiseBatch.getBatchResponse(): Returns the batch response of previous calls to promiseAll or promiseAny', () => {
  it('Given bathResponse is empty, it returns empty object', async () => {
    const pbs = new PromiseBatchStatus();
    const pb = new PromiseBatch(pbs);
    expect(pb.getBatchResponse()).to.eql({});
  });
  it('Given bathResponse is not empty, it returns the result of the last promiseAll/promiseAny', async () => {
    const pbs = new PromiseBatchStatus();
    const pb = new PromiseBatch(pbs);
    pb.addList(cpl);
    const call = pb.promiseAny(3);
    pb.finishAllPromises();
    await call;
    const expectedRes = {
      ExternalAPI2: PromiseUtil.NO_INPUT_PROVIDED,
      LoadJSON: PromiseUtil.NO_INPUT_PROVIDED
    };
    expect(pb.getBatchResponse()).to.eql(expectedRes);
  });
});
describe('PromiseBatch.finishAllPromises(): Sets all properties ended in AferCallback inside statusObject to fulfilled', () => {
  it('Given statusObject is empty, it does nothing', async () => {
    const pbs = new PromiseBatchStatus();
    const pb = new PromiseBatch(pbs);
    pb.finishAllPromises();
    expect(pb.statusObject.getStatusList()).to.eql({});
  });
  it('Given statusObject is not empty, sets all properties ended in AfterCallback inside statusObject to fulfilled', async () => {
    const pbs = new PromiseBatchStatus();
    const pb = new PromiseBatch(pbs);
    pb.addList(cpl);
    const call = pb.promiseAny(3);
    expect(pb.statusObject.getStatusList()).to.not.eql({});
    pb.finishAllPromises();
    await call;
    Object.keys(pb.statusObject.getStatusList()).forEach(key => {
      expect(pbs.observeStatus(key)).to.equal(PROMISE_STATUS.FULFILLED);
    });
  });
});
describe('PromiseBatch.finishPromisee<T>(nameOrCustomPromise: string | ICustomPromise<T>): Given a name of a promise inside the instance of PromiseBatch or a customPromise itself, it sets the property nameAFterCallback in statusObject to fulfilled', () => {
  it('Given the name of a promise, it calls statusObj.notifyAsFinished passing that name as parameter', async () => {
    const pbs = new PromiseBatchStatus();
    const pb = new PromiseBatch(pbs);
    pb.add(cpl[0]);
    const call = pb.promiseAny(3);
    expect(pb.statusObject.getStatusList()).to.not.eql({});
    pb.finishPromise(cpl[0].name);
    await call;
    expect(pbs.observeStatus(`${cpl[0].name}${AFTER_CALLBACK}`)).to.equal(PROMISE_STATUS.FULFILLED);
  });
  it('Given a custom promise, gets its name and calls statusObj.notifyAsFinished passing that name as parameter', async () => {
    const pbs = new PromiseBatchStatus();
    const pb = new PromiseBatch(pbs);
    pb.add(cpl[0]);
    const call = pb.promiseAny(3);
    expect(pb.statusObject.getStatusList()).to.not.eql({});
    pb.finishPromise(cpl[0]);
    await call;
    expect(pbs.observeStatus(`${cpl[0].name}${AFTER_CALLBACK}`)).to.equal(PROMISE_STATUS.FULFILLED);
  });
});
describe('PromiseBatch.reset(): Resets batchResponse to an empty object and statusObject to an object with two properties Status and Cache as empty objects', () => {
  it('Given both are empty, it resets batchResponse and statusObject to an initial state', async () => {
    const pbs = new PromiseBatchStatus();
    const pb = new PromiseBatch(pbs);
    pb.reset();
    expect(pb.getBatchResponse()).to.eql({});
    expect(pbs.getCacheList()).to.eql({});
    expect(pbs.getStatusList()).to.eql({});
  });
  it('Given both are not empty, it resets batchResponse and statusObject to an initial state', async () => {
    const pbs = new PromiseBatchStatus();
    const pb = new PromiseBatch(pbs);
    pb.add(cpl[0]);
    const call = pb.promiseAny(3);
    expect(pb.statusObject.getStatusList()).to.not.eql({});
    pb.finishPromise(cpl[0]);
    await call;
    pb.reset();
    expect(pb.getBatchResponse()).to.eql({});
    expect(pbs.getCacheList()).to.eql({});
    expect(pbs.getStatusList()).to.eql({});
  });
});
