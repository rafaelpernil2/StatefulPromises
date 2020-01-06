import { expect } from 'chai';
import 'mocha';
import { AFTER_CALLBACK, ERROR_MSG, PROMISE_STATUS } from '../constants/global-constants';
import { IAnyObject } from '../interfaces/i-any-object';
import { ICustomPromise } from '../interfaces/i-custom-promise';
import { PromiseBatch } from '../promise-batch';
import { DUMMY_MESSAGES, PromiseUtil } from '../utils/promise-util';

const calcTotalTIme = (hrtime: number[]) => {
  return hrtime[0] * 1e9 + hrtime[1];
};

const cp: ICustomPromise<object[]> = {
  name: 'GetSomething',
  function: PromiseUtil.buildFixedTimePromise(0),
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

describe('new PromiseBatch(): Initializes the statusObject as a new PromiseBatchStatus and customPromiseList and batchResponse as empty object', () => {
  it('It sets status object as a new PromiseBatchStats and customPromiseList and batchResponse as empty object', async () => {
    const pb = new PromiseBatch();
    expect(pb.getStatusList()).to.eql({});
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
  it('Given a promise name whose promise is included in the PromiseBatch, it finds it calls DataUtil.execStatefulPromise and stores the result at batchResponse', async () => {
    const pb = new PromiseBatch();
    pb.add(cp);
    const result = await pb.exec(cp.name);
    expect(pb.batchResponse).to.eql({ GetSomething: [{ result: 'Resultd' }] });
    expect(result).to.eql([{ result: 'Resultd' }]);
  });
  it(`Given a promise name whose promise is not included in the PromiseBatch, it throws an error containing "${ERROR_MSG.INVALID_PROMISE_NAME}"`, async () => {
    const pb = new PromiseBatch();
    let result;
    try {
      await pb.exec('NonExistent');
    } catch (error) {
      result = error;
    }
    expect(result.message).to.contain(ERROR_MSG.INVALID_PROMISE_NAME);
  });
  it('Given a customPromise not included in the PromiseBatch, it adds it and calls DataUtil.execStatefulPromise  and stores the result at batchResponse', async () => {
    const pb = new PromiseBatch();
    const result = await pb.exec(cp);
    expect(pb.batchResponse).to.eql({ GetSomething: [{ result: 'Resultd' }] });
    expect(result).to.eql([{ result: 'Resultd' }]);
  });
});

describe('PromiseBatch.promiseAll(concurrentLimit?: number): Given a list of customPromises contained in the instance of PromiseBatch and an optional concurrentLimit, it calls all promises and when all are finished, if all were fullfilled, it returns an object with all results', () => {
  it('Given no promise list was previously added and no concurrencyLimit is passed, it returns an empty object inmediately', async () => {
    const pb = new PromiseBatch();
    const result = await pb.promiseAll();
    expect(result).to.eql({});
  });
  it('Given no promise list was previously added and a positive concurrencyLimit is passed, it returns an empty object inmediately', async () => {
    const pb = new PromiseBatch();
    const result = await pb.promiseAll(100);
    expect(result).to.eql({});
  });
  it('Given no promise list was previously added and a negative concurrencyLimit is passed, it throws an error', async () => {
    const pb = new PromiseBatch();
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
    const pb = new PromiseBatch();
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
    const pb = new PromiseBatch();
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
    const pb = new PromiseBatch();
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
    const pb = new PromiseBatch();
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
    const pb = new PromiseBatch();
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
    const pb = new PromiseBatch();
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

    expect(pb.batchResponse).to.eql(expectedRes);
    expect(result.message).to.contain(ERROR_MSG.SOME_PROMISE_REJECTED);
  });
  it('Given a promise list with callbacks inside was previously added, one promise rejects and a positive concurrencyLimit is passed, it throws a rejection but contains the result of the promise either way', async () => {
    const pb = new PromiseBatch();
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

    expect(pb.batchResponse).to.eql(expectedRes);
    expect(result.message).to.contain(ERROR_MSG.SOME_PROMISE_REJECTED);
  });
  it('Given a promise list with callbacks inside was previously added, one promise rejects and a positive concurrencyLimit is passed, when testing with a concurrency limit of 1 and 2, the second one takes less time', async () => {
    const pu = new PromiseUtil();
    const newCpl = [
      {
        name: 'Promise1',
        thisArg: pu,
        function: pu.buildSingleParamFixedTimeCheckedPromise(100),
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
        function: pu.buildSingleParamFixedTimeCheckedPromise(100),
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
    const call1 = pb1.promiseAll(1);
    pb1.finishAllPromises();
    const result1 = await call1;
    const tFirst1 = process.hrtime(tFirst0);

    const pb2 = new PromiseBatch();

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

    expect(pb1.batchResponse).to.eql(expectedRes);
    expect(result1).to.eql(result2);
    expect(pb1.batchResponse).to.eql(pb2.batchResponse);
    expect(calcTotalTIme(tFirst1)).to.above(calcTotalTIme(tSecond1));
  });
});

describe('PromiseBatch.promiseAny(concurrentLimit?: number): Given a list of customPromises contained in the instance of PromiseBatch and an optional concurrentLimit, it calls all promises and when all are finished, it returns an object with all results', () => {
  it('Given no promise list was previously added and no concurrencyLimit is passed, it returns an empty object inmediately', async () => {
    const pb = new PromiseBatch();
    const result = await pb.promiseAny();
    expect(result).to.eql({});
  });
  it('Given no promise list was previously added and a positive concurrencyLimit is passed, it returns an empty object inmediately', async () => {
    const pb = new PromiseBatch();
    const result = await pb.promiseAny(100);
    expect(result).to.eql({});
  });
  it('Given no promise list was previously added and a negative concurrencyLimit is passed, it throws an error', async () => {
    const pb = new PromiseBatch();
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
    const pb = new PromiseBatch();
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
    const pb = new PromiseBatch();
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
    const pb = new PromiseBatch();
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
    const pb = new PromiseBatch();
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
    const pb = new PromiseBatch();
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
    const pb = new PromiseBatch();
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
    const pb = new PromiseBatch();
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
        function: pu.buildSingleParamFixedTimeCheckedPromise(100),
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
        function: pu.buildSingleParamFixedTimeCheckedPromise(100),
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

    expect(pb1.batchResponse).to.eql(expectedRes);
    expect(result1).to.eql(result2);
    expect(pb1.batchResponse).to.eql(pb2.batchResponse);
    expect(calcTotalTIme(tFirst1)).to.above(calcTotalTIme(tSecond1));
  });
});

describe('PromiseBatch.retryRejected(): Given a series of promises failed when executing promiseAll or promiseAny, those are retried', () => {
  it('Given a set of promises with no one rejected, calls promiseAll() with an empty list and returns an the same list as before and the promise list is the same', async () => {
    const pb = new PromiseBatch();
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
      result = await pb.retryRejected();
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
    const pb = new PromiseBatch();
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
      result = await pb.retryRejected();
    }
    const expectedRes = {
      Promise1: `${DUMMY_MESSAGES.RESOLVED}1`,
      Promise2: `${DUMMY_MESSAGES.RESOLVED}1`
    };
    expect(result).to.eql(expectedRes);
  });
});

describe('PromiseBatch.finishAllPromises(): Sets all properties ended in AferCallback inside statusObject to fulfilled', () => {
  it('Given statusObject is empty, it does nothing', async () => {
    const pb = new PromiseBatch();
    pb.finishAllPromises();
    expect(pb.getStatusList()).to.eql({});
  });
  it('Given statusObject is not empty, sets all properties ended in AfterCallback inside statusObject to fulfilled', async () => {
    const pb = new PromiseBatch();
    pb.addList(cpl);
    const call = pb.promiseAny(3);
    expect(pb.getStatusList()).to.not.eql({});
    pb.finishAllPromises();
    await call;
    Object.keys(pb.getStatusList()).forEach(key => {
      expect(pb.observeStatus(key)).to.equal(PROMISE_STATUS.FULFILLED);
    });
  });
});
describe('PromiseBatch.finishPromise<T>(nameOrCustomPromise: string | ICustomPromise<T>): Given a name of a promise inside the instance of PromiseBatch or a customPromise itself, it sets the property nameAFterCallback in statusObject to fulfilled', () => {
  it('Given the name of a promise, it calls statusObj.notifyAsFinished passing that name as parameter', async () => {
    const pb = new PromiseBatch();
    pb.add(cpl[0]);
    const call = pb.promiseAny(3);
    expect(pb.getStatusList()).to.not.eql({});
    pb.finishPromise(cpl[0].name);
    await call;
    expect(pb.observeStatus(`${cpl[0].name}${AFTER_CALLBACK}`)).to.equal(PROMISE_STATUS.FULFILLED);
  });
  it('Given the name of a promise not included in the batch, it does nothing', async () => {
    const pb = new PromiseBatch();
    pb.finishPromise('NonExistent');
  });
  it('Given a custom promise, gets its name and calls statusObj.notifyAsFinished passing that name as parameter', async () => {
    const pb = new PromiseBatch();
    pb.add(cpl[0]);
    const call = pb.promiseAny(3);
    expect(pb.getStatusList()).to.not.eql({});
    pb.finishPromise(cpl[0]);
    await call;
    expect(pb.observeStatus(`${cpl[0].name}${AFTER_CALLBACK}`)).to.equal(PROMISE_STATUS.FULFILLED);
  });
});

describe('PromiseBatch.isBatchCompleted(): Checks if all promises in the batch are not pending (resolved or rejected)', () => {
  it('Given a set of two customPromises, once they are completed this function returns true', async () => {
    const pb = new PromiseBatch();
    const cp1: ICustomPromise<string> = {
      name: 'Test1',
      function: () => Promise.resolve('')
    };
    const cp2: ICustomPromise<string> = {
      name: 'Test2',
      function: () => Promise.reject('')
    };
    try {
      const call1 = pb.exec(cp1);
      const call2 = pb.exec(cp2);
      pb.finishAllPromises();
      await call1;
      await call2;
    } catch (error) {
      // Do nothing
    }
    const checkCompleted = pb.isBatchCompleted();
    const result = await checkCompleted;
    expect(result).to.eq(true);
  });
});

// tslint:disable-next-line: max-line-length
describe('PromiseBatch.isBatchFulfilled(): Given a "batchStatus", it checks if all properties have a value equal to fulfilled and waits for changes until all are fulfilled', () => {
  it('Given a set of two customPromises that fulfill, once they are completed this function returns true', async () => {
    const pb = new PromiseBatch();
    const cp1: ICustomPromise<string> = {
      name: 'Test1',
      function: () => Promise.resolve('')
    };
    const cp2: ICustomPromise<string> = {
      name: 'Test2',
      function: () => Promise.resolve('')
    };
    try {
      const call1 = pb.exec(cp1);
      const call2 = pb.exec(cp2);
      pb.finishAllPromises();
      await call1;
      await call2;
    } catch (error) {
      // Do nothing
    }
    const checkCompleted = pb.isBatchCompleted();
    const result = await checkCompleted;
    expect(result).to.eq(true);
  });
  it('Given a set of two customPromises where one rejects, once they are completed this function returns false', async () => {
    const pb = new PromiseBatch();
    const cp1: ICustomPromise<string> = {
      name: 'Test1',
      function: () => Promise.resolve('')
    };
    const cp2: ICustomPromise<string> = {
      name: 'Test2',
      function: () => Promise.reject('')
    };
    try {
      const call1 = pb.exec(cp1);
      const call2 = pb.exec(cp2);
      pb.finishAllPromises();
      await call1;
      await call2;
    } catch (error) {
      // Do nothing
    }
    const checkCompleted = pb.isBatchFulfilled();
    const result = await checkCompleted;
    expect(result).to.eq(false);
  });
});

// tslint:disable-next-line: max-line-length
describe('PromiseBatch.resetPromise<T>(nameOrCustomPromise: string | ICustomPromise<T>): Resets the status of a promise of the batch to pending by calling statusObject.resetStatus', () => {
  it('Given the name or customPromise provided does not exist, it does nothing', async () => {
    const pb = new PromiseBatch();
    const promiseName = 'nonContained';
    pb.addList(cpl);
    const call = pb.promiseAll();
    pb.finishAllPromises();
    await call;
    pb.resetPromise(promiseName);
    Object.keys(pb.getStatusList()).forEach(key => {
      expect(pb.observeStatus(key)).to.equal(PROMISE_STATUS.FULFILLED);
    });
  });
  it('Given the name or customPromise provided exists in the promise batch, it resets the status of promiseName and promiseNameAfterCallback to Pending', async () => {
    const pb = new PromiseBatch();
    const promiseName = cpl[0].name;
    const customPromise = cpl[1];
    pb.addList(cpl);
    const call = pb.promiseAll();
    pb.finishAllPromises();
    await call;
    pb.resetPromise(promiseName);
    pb.resetPromise(customPromise);
    Object.keys(pb.getStatusList()).forEach(key => {
      expect(pb.observeStatus(key)).to.equal(PROMISE_STATUS.PENDING);
    });
  });
});

describe('PromiseBatch.getStatusList(): Returns the Status field of statusObject', () => {
  const key = 'getStatusList';

  it('Returns the Status field of statusObject', async () => {
    const pb = new PromiseBatch();
    pb.add(cp);
    const call = pb.promiseAll();
    pb.finishAllPromises();
    await call;
    expect(pb.getStatusList()).to.contain.keys([cp.name, `${cp.name}${AFTER_CALLBACK}`]);
  });
});

describe('PromiseBatch.observeStatus(key: string): Given a "key", it return its status saved inside statusObject.Status.key', () => {
  const key = 'observe';

  it('Returns the status saved inside "key", given it was initialized', async () => {
    const pb = new PromiseBatch();
    pb.add(cp);
    const call = pb.promiseAll();
    pb.finishAllPromises();
    await call;
    expect(pb.observeStatus(cp.name)).to.be.eq(PROMISE_STATUS.FULFILLED);
    expect(pb.observeStatus(`${cp.name}${AFTER_CALLBACK}`)).to.be.eq(PROMISE_STATUS.FULFILLED);
  });

  it('Does not return the status saved inside "key", given it was not initialized', async () => {
    const pb = new PromiseBatch();
    expect(pb.observeStatus(key)).to.be.eq(undefined);
  });
});

describe('PromiseBatch.reset(): Resets batchResponse to an empty object and statusObject to an object with two properties Status and Cache as empty objects', () => {
  it('Given both are empty, it resets batchResponse and statusObject to an initial state', async () => {
    const pb = new PromiseBatch();
    pb.reset();
    expect(pb.batchResponse).to.eql({});
    expect(pb.getStatusList()).to.eql({});
  });
  it('Given both are not empty, it resets batchResponse and statusObject to an initial state', async () => {
    const pb = new PromiseBatch();
    pb.add(cpl[0]);
    const call = pb.promiseAny(3);
    expect(pb.getStatusList()).to.not.eql({});
    pb.finishPromise(cpl[0]);
    await call;
    pb.reset();
    expect(pb.batchResponse).to.eql({});
    expect(pb.getStatusList()).to.eql({});
  });
});
