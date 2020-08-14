/* eslint-disable max-len */
import * as cp from 'child_process';
import * as path from 'path';
import ko from 'knockout';
import { expect } from 'chai';
import 'mocha';
import { ICustomPromise } from '../types/i-custom-promise';
import { PromiseBatch } from '../promise-batch';
import { DUMMY_MESSAGES, TestUtil, SIMPLE_TEST } from '../utils/test-util';
import { PromiseStatus } from '../types/promise-status';
import { ERROR_MSG } from '../constants/error-messages';
import { GLOBAL_CONSTANTS } from '../constants/global-constants';

const timeout = 5000;

const calcTotalTime = (hrtime: number[]): number => {
  return hrtime[0] * 1e9 + hrtime[1];
};

const examplePromise: ICustomPromise<object[]> = {
  name: 'GetSomething',
  function: TestUtil.buildFixedTimePromise(0),
  thisArg: null,
  validate: () => {
    return true;
  },
  doneCallback: data => {
    const res = ((data[0] as Record<string, unknown>).result += 'd');
    return [{ result: res }];
  },
  catchCallback: reason => {
    const res = ((reason[0] as Record<string, unknown>).result += 'c');
    return [{ result: res }];
  },
  args: [{ result: 'Result' }],
  cached: true
};

const examplePromiseList: ICustomPromise<unknown>[] = [
  {
    name: 'ExternalAPI2',
    function: TestUtil.buildFixedTimePromise(0)
  },
  {
    name: 'LoadJSON',
    function: TestUtil.buildFixedTimePromise(0)
  }
];

describe('new PromiseBatch(customPromiseList?: Array<ICustomPromise<unknown>>)', () => {
  context('given a customPromiseList is not provided', () => {
    it('sets status object as a new PromiseBatchStats and customPromiseList and batchResponse as empty object', () => {
      const pb = new PromiseBatch();
      expect(pb.getStatusList()).to.eql({});
      expect(pb.customPromiseList).to.eql({});
      expect(pb.batchResponse).to.eql({});
    });
  });
  context('given a customPromiseList is provided', () => {
    it('sets status object as a new PromiseBatchStats and customPromiseList and batchResponse as empty object and adds each customPromise in the list', () => {
      const pb = new PromiseBatch(examplePromiseList);
      expect(pb.getStatusList()).to.eql({});
      const arrayified: ICustomPromise<unknown>[] = [];
      Object.keys(pb.customPromiseList).forEach(promiseName => {
        arrayified.push(pb.customPromiseList[promiseName]);
      });
      expect(arrayified).to.eql(examplePromiseList);
      expect(pb.batchResponse).to.eql({});
    });
  });
});

describe('PromiseBatch.add<T>(customPromise: ICustomPromise<T>)', () => {
  context('given customPromise was not added before', () => {
    it('Inserts customPromise inside customPromiseList ', () => {
      const pb = new PromiseBatch();
      pb.add(examplePromise);
      expect(pb.customPromiseList[examplePromise.name]).to.eql(examplePromise);
    });
  });
  context('given customPromise was not added before (has same promise name)', () => {
    it('Does not insert customPromise inside customPromiseList', () => {
      const pb = new PromiseBatch();
      const cp2: ICustomPromise<number> = {
        name: 'GetSomething',
        function: TestUtil.buildSingleParamFixedTimePromise<number>(5000)
      };
      pb.add(examplePromise);
      pb.add(cp2);
      expect(pb.customPromiseList[examplePromise.name]).to.eql(examplePromise);
      expect(pb.customPromiseList[examplePromise.name]).to.not.eql(cp2);
    });
  });
});

describe('PromiseBatch.remove(nameOrCustomPromise: string | ICustomPromise<unknown>)', () => {
  context('given nameOrCustomPromise is a promise name whose promise is not included in the PromiseBatch', () => {
    it('does nothing', () => {
      const pb = new PromiseBatch();
      pb.remove('DoesNotExist');
      expect(pb.customPromiseList).to.eql({});
    });
  });
  context('given nameOrCustomPromise is a promise name whose promise is included in the PromiseBatch', () => {
    it('finds it and removes it', () => {
      const pb = new PromiseBatch();
      pb.add(examplePromise);
      expect(pb.customPromiseList).to.eql({ [examplePromise.name]: examplePromise });
      pb.remove(examplePromise.name);
      expect(pb.customPromiseList).to.eql({});
    });
  });

  context('given nameOrCustomPromise is a customPromise not included in the PromiseBatch', () => {
    it('does nothing', () => {
      const pb = new PromiseBatch();
      pb.remove(examplePromise);
      expect(pb.customPromiseList).to.eql({});
    });
  });
  context('given nameOrCustomPromise is a customPromise included in the PromiseBatch', () => {
    it('finds it and removes it', () => {
      const pb = new PromiseBatch();
      pb.add(examplePromise);
      expect(pb.customPromiseList).to.eql({ [examplePromise.name]: examplePromise });
      pb.remove(examplePromise);
      expect(pb.customPromiseList).to.eql({});
    });
  });
});

describe('PromiseBatch.addList(customPromiseList: Array<ICustomPromise<unknown>>)', () => {
  context('given customPromiseList is empty', () => {
    it('Inserts no customPromise inside customPromiseList', () => {
      const pb = new PromiseBatch();
      pb.addList([]);
      expect(pb.customPromiseList).to.eql({});
    });
  });
  context('given customPromiseList is not empty', () => {
    it('Inserts each customPromise inside customPromiseList', () => {
      const pb = new PromiseBatch();
      pb.addList(examplePromiseList);
      examplePromiseList.forEach(p => {
        expect(pb.customPromiseList[p.name]).to.eql(p);
      });
    });
  });
});

describe('PromiseBatch.all(concurrentLimit?: number)', () => {
  context('given no promise list was previously added and no concurrencyLimit is passed', () => {
    it('returns an empty object inmediately', async () => {
      const pb = new PromiseBatch();
      const result = await pb.all();
      expect(result).to.eql({});
    });
  });

  context('given no promise list was previously added and a positive concurrencyLimit is passed', () => {
    it('returns an empty object inmediately', async () => {
      const pb = new PromiseBatch();
      const result = await pb.all(100);
      expect(result).to.eql({});
    });
  });
  context('given no promise list was previously added and a negative concurrencyLimit is passed', () => {
    it('throws an error', async () => {
      const pb = new PromiseBatch();
      let result;
      try {
        result = await pb.all(-3);
      } catch (error) {
        result = error;
      }
      expect(result.message).to.equal(ERROR_MSG.NO_NEGATIVE_CONC_LIMIT);
    });
  });
  context('given no promise list was previously added and a zero concurrencyLimit is passed', () => {
    it('throws an error', async () => {
      const pb = new PromiseBatch();
      let result;
      try {
        result = await pb.all(0);
      } catch (error) {
        result = error;
      }
      expect(result.message).to.equal(ERROR_MSG.NO_NEGATIVE_CONC_LIMIT);
    });
  });
  context('given a promise list was previously added and no concurrencyLimit is passed', () => {
    it('returns the results in an object once finished', async () => {
      const pb = new PromiseBatch();
      pb.addList(examplePromiseList);
      const result = await pb.all();
      const expectedRes = {
        ExternalAPI2: TestUtil.NO_INPUT_PROVIDED,
        LoadJSON: TestUtil.NO_INPUT_PROVIDED
      };
      expect(result).to.eql(expectedRes);
    });
  });
  context('given a promise list was previously added and a positive concurrencyLimit is passed', () => {
    it('returns the results in an object once finished', async () => {
      const pb = new PromiseBatch();
      pb.addList(examplePromiseList);
      const result = await pb.all(3);
      const expectedRes = {
        ExternalAPI2: TestUtil.NO_INPUT_PROVIDED,
        LoadJSON: TestUtil.NO_INPUT_PROVIDED
      };
      expect(result).to.eql(expectedRes);
    });
  });
  context('given a promise list was previously added and a negative concurrencyLimit is passed', () => {
    it('throws an execption regarding the negative concurrencyLimit', async () => {
      const pb = new PromiseBatch();
      pb.addList(examplePromiseList);
      let result;
      try {
        result = await pb.all(-3);
      } catch (error) {
        result = error;
      }
      expect(result.message).to.equal(ERROR_MSG.NO_NEGATIVE_CONC_LIMIT);
    });
  });
  context('given a promise list was previously added and a zero concurrencyLimit is passed', () => {
    it('throws an execption regarding the negative concurrencyLimit', async () => {
      const pb = new PromiseBatch();
      pb.addList(examplePromiseList);
      let result;
      try {
        result = await pb.all(0);
      } catch (error) {
        result = error;
      }
      expect(result.message).to.equal(ERROR_MSG.NO_NEGATIVE_CONC_LIMIT);
    });
  });
  context('given a promise list was previously added, one promise rejects and a positive concurrencyLimit is passed', () => {
    it('throws a rejection but contains the result of the promise either way', async () => {
      const pb = new PromiseBatch();
      const newCpl = [...examplePromiseList];
      newCpl.push({
        name: 'FailPromise',
        function: () => Promise.reject('Rejected')
      });
      pb.addList(newCpl);
      let result;
      try {
        result = await pb.all(5);
      } catch (error) {
        result = error;
      }

      const expectedRes = {
        ExternalAPI2: TestUtil.NO_INPUT_PROVIDED,
        LoadJSON: TestUtil.NO_INPUT_PROVIDED,
        FailPromise: 'Rejected'
      };

      expect(pb.batchResponse).to.eql(expectedRes);
      expect(result.message).to.contain(ERROR_MSG.SOME_PROMISE_REJECTED);
    });
  });
  context('given a promise list with callbacks inside was previously added, one promise rejects and a positive concurrencyLimit is passed', () => {
    it('throws a rejection but contains the result of the promise either way', async () => {
      const pb = new PromiseBatch();
      const pu = new TestUtil();
      const newCpl = [
        {
          name: 'Promise1',
          thisArg: pu,
          function: pu.buildSingleParamFixedTimeCheckedPromise(0),
          args: [DUMMY_MESSAGES.RESOLVED],
          cached: false,
          validate: (data: string): boolean => {
            return TestUtil.dummyValidator(data);
          },
          doneCallback: (data: string): string => {
            return (data += '1');
          },
          catchCallback: (data: string): string => {
            return (data += '2');
          }
        },
        {
          name: 'Promise2',
          thisArg: pu,
          function: pu.buildSingleParamFixedTimeCheckedPromise(0),
          args: [DUMMY_MESSAGES.REJECTED],
          cached: false,
          validate: (data: string): boolean => {
            return TestUtil.dummyValidator(data);
          },
          doneCallback: (data: string): string => {
            return (data += '1');
          },
          catchCallback: (data: string): string => {
            return (data += '2');
          }
        }
      ];
      pb.addList(newCpl);
      let result;
      try {
        result = await pb.all(5);
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

    it('the execution with a larger concurrentLimit takes less time', async () => {
      const pu = new TestUtil();
      const newCpl = [
        {
          name: 'Promise1',
          thisArg: pu,
          function: pu.buildSingleParamFixedTimeCheckedPromise(100),
          args: [DUMMY_MESSAGES.RESOLVED],
          cached: false,
          validate: (data: string): boolean => {
            return TestUtil.dummyValidator(data);
          },
          doneCallback: (data: string): string => {
            return (data += '1');
          },
          catchCallback: (data: string): string => {
            return (data += '2');
          }
        },
        {
          name: 'Promise2',
          thisArg: pu,
          function: pu.buildSingleParamFixedTimeCheckedPromise(100),
          args: [DUMMY_MESSAGES.RESOLVED],
          cached: false,
          validate: (data: string): boolean => {
            return TestUtil.dummyValidator(data);
          },
          doneCallback: (data: string): string => {
            return (data += '1');
          },
          catchCallback: (data: string): string => {
            return (data += '2');
          }
        }
      ];
      const pb1 = new PromiseBatch();

      pb1.addList(newCpl);

      const tFirst0 = process.hrtime();
      const result1 = await pb1.all(1);
      const tFirst1 = process.hrtime(tFirst0);

      const pb2 = new PromiseBatch();

      pb2.addList(newCpl);

      const tSecond0 = process.hrtime();
      const result2 = await pb2.all(2);
      const tSecond1 = process.hrtime(tSecond0);

      const expectedRes = {
        Promise1: `${DUMMY_MESSAGES.RESOLVED}1`,
        Promise2: `${DUMMY_MESSAGES.RESOLVED}1`
      };

      expect(pb1.batchResponse).to.eql(expectedRes);
      expect(result1).to.eql(result2);
      expect(pb1.batchResponse).to.eql(pb2.batchResponse);
      expect(calcTotalTime(tFirst1)).to.above(calcTotalTime(tSecond1));
    });
  });
});

describe('PromiseBatch.allSettled(concurrentLimit?: number)', () => {
  context('given no promise list was previously added and no concurrencyLimit is passed', () => {
    it('returns an empty object inmediately', async () => {
      const pb = new PromiseBatch();
      const result = await pb.allSettled();
      expect(result).to.eql({});
    });
  });
  context('given no promise list was previously added and a positive concurrencyLimit is passed', () => {
    it('returns an empty object inmediately', async () => {
      const pb = new PromiseBatch();
      const result = await pb.allSettled(100);
      expect(result).to.eql({});
    });
  });
  context('given no promise list was previously added and a negative concurrencyLimit is passed', () => {
    it('throws an error', async () => {
      const pb = new PromiseBatch();
      let result;
      try {
        result = await pb.allSettled(-3);
      } catch (error) {
        result = error;
      }
      expect(result.message).to.equal(ERROR_MSG.NO_NEGATIVE_CONC_LIMIT);
    });
  });
  context('given no promise list was previously added and a zero concurrencyLimit is passed', () => {
    it('throws an error', async () => {
      const pb = new PromiseBatch();
      let result;
      try {
        result = await pb.allSettled(0);
      } catch (error) {
        result = error;
      }
      expect(result.message).to.equal(ERROR_MSG.NO_NEGATIVE_CONC_LIMIT);
    });
  });
  context('given a promise list was previously added and no concurrencyLimit is passed', () => {
    it('returns the results in an object once finished', async () => {
      const pb = new PromiseBatch();
      pb.addList(examplePromiseList);
      const result = await pb.allSettled();
      const expectedRes = {
        ExternalAPI2: TestUtil.NO_INPUT_PROVIDED,
        LoadJSON: TestUtil.NO_INPUT_PROVIDED
      };
      expect(result).to.eql(expectedRes);
    });
  });
  context('given a promise list was previously added and a positive concurrencyLimit is passed', () => {
    it('returns the results in an object once finished', async () => {
      const pb = new PromiseBatch();
      pb.addList(examplePromiseList);
      const result = await pb.allSettled(3);
      const expectedRes = {
        ExternalAPI2: TestUtil.NO_INPUT_PROVIDED,
        LoadJSON: TestUtil.NO_INPUT_PROVIDED
      };
      expect(result).to.eql(expectedRes);
    });
  });
  context('given a promise list was previously added and a negative concurrencyLimit is passed', () => {
    it('throws an execption regarding the negative concurrencyLimit', async () => {
      const pb = new PromiseBatch();
      pb.addList(examplePromiseList);
      let result;
      try {
        result = await pb.allSettled(-3);
      } catch (error) {
        result = error;
      }
      expect(result.message).to.equal(ERROR_MSG.NO_NEGATIVE_CONC_LIMIT);
    });
  });
  context('given a promise list was previously added and a zero concurrencyLimit is passed', () => {
    it('throws an execption regarding the negative concurrencyLimit', async () => {
      const pb = new PromiseBatch();
      pb.addList(examplePromiseList);
      let result;
      try {
        result = await pb.allSettled(0);
      } catch (error) {
        result = error;
      }
      expect(result.message).to.equal(ERROR_MSG.NO_NEGATIVE_CONC_LIMIT);
    });
  });
  context('given a promise list was previously added, one promise rejects and a positive concurrencyLimit is passed', () => {
    it('returns the results in an object once finished', async () => {
      const pb = new PromiseBatch();
      const newCpl = [...examplePromiseList];
      newCpl.push({
        name: 'FailPromise',
        function: () => Promise.reject('Rejected')
      });
      pb.addList(newCpl);
      const result = await pb.allSettled(5);
      const expectedRes = {
        FailPromise: 'Rejected',
        ExternalAPI2: TestUtil.NO_INPUT_PROVIDED,
        LoadJSON: TestUtil.NO_INPUT_PROVIDED
      };
      expect(result).to.eql(expectedRes);
    });
  });
  context('given a promise list with callbacks inside was previously added, one promise rejects and a positive concurrencyLimit is passed', () => {
    it('throws a rejection but contains the result of the promise either way', async () => {
      const pb = new PromiseBatch();
      const pu = new TestUtil();
      const newCpl = [
        {
          name: 'Promise1',
          thisArg: pu,
          function: pu.buildSingleParamFixedTimeCheckedPromise(0),
          args: [DUMMY_MESSAGES.RESOLVED],
          cached: false,
          validate: (data: string): boolean => {
            return TestUtil.dummyValidator(data);
          },
          doneCallback: (data: string): string => {
            return (data += '1');
          },
          catchCallback: (data: string): string => {
            return (data += '2');
          }
        },
        {
          name: 'Promise2',
          thisArg: pu,
          function: pu.buildSingleParamFixedTimeCheckedPromise(0),
          args: [DUMMY_MESSAGES.REJECTED],
          cached: false,
          validate: (data: string): boolean => {
            return TestUtil.dummyValidator(data);
          },
          doneCallback: (data: string): string => {
            return (data += '1');
          },
          catchCallback: (data: string): string => {
            return (data += '2');
          }
        }
      ];
      pb.addList(newCpl);
      let result;
      try {
        result = await pb.allSettled(5);
      } catch (error) {
        result = error;
      }

      const expectedRes = {
        Promise1: `${DUMMY_MESSAGES.RESOLVED}1`,
        Promise2: `${DUMMY_MESSAGES.REJECTED}2`
      };

      expect(result).to.eql(expectedRes);
    });
    it('the execution with a larger concurrentLimit takes less time', async () => {
      const pu = new TestUtil();
      const newCpl = [
        {
          name: 'Promise1',
          thisArg: pu,
          function: pu.buildSingleParamFixedTimeCheckedPromise(100),
          args: [DUMMY_MESSAGES.RESOLVED],
          cached: false,
          validate: (data: string): boolean => {
            return TestUtil.dummyValidator(data);
          },
          doneCallback: (data: string): string => {
            return (data += '1');
          },
          catchCallback: (data: string): string => {
            return (data += '2');
          }
        },
        {
          name: 'Promise2',
          thisArg: pu,
          function: pu.buildSingleParamFixedTimeCheckedPromise(100),
          args: [DUMMY_MESSAGES.RESOLVED],
          cached: false,
          validate: (data: string): boolean => {
            return TestUtil.dummyValidator(data);
          },
          doneCallback: (data: string): string => {
            return (data += '1');
          },
          catchCallback: (data: string): string => {
            return (data += '2');
          }
        }
      ];

      const pb1 = new PromiseBatch();

      pb1.addList(newCpl);

      const tFirst0 = process.hrtime();
      const result1 = await pb1.allSettled(1);
      const tFirst1 = process.hrtime(tFirst0);

      const pb2 = new PromiseBatch();

      pb2.addList(newCpl);

      const tSecond0 = process.hrtime();
      const result2 = await pb2.allSettled(2);
      const tSecond1 = process.hrtime(tSecond0);

      const expectedRes = {
        Promise1: `${DUMMY_MESSAGES.RESOLVED}1`,
        Promise2: `${DUMMY_MESSAGES.RESOLVED}1`
      };

      expect(pb1.batchResponse).to.eql(expectedRes);
      expect(result1).to.eql(result2);
      expect(pb1.batchResponse).to.eql(pb2.batchResponse);
      expect(calcTotalTime(tFirst1)).to.above(calcTotalTime(tSecond1));
    });
  });
});

describe('PromiseBatch.retryRejected(concurrentLimit?: number)', () => {
  context('given a set of promises with no one rejected', () => {
    it('calls all() with an empty list and returns an the same list as before and the promise list is the same', async () => {
      const pb = new PromiseBatch();
      const pu = new TestUtil();
      const newCpl = [
        {
          name: 'Promise1',
          thisArg: pu,
          function: pu.buildSingleParamFixedTimeCheckedPromise(0),
          args: [DUMMY_MESSAGES.RESOLVED],
          cached: false,
          validate: (data: string): boolean => {
            return TestUtil.dummyValidator(data);
          },
          doneCallback: (data: string): string => {
            return (data += '1');
          },
          catchCallback: (data: string): string => {
            return (data += '2');
          }
        },
        {
          name: 'Promise2',
          thisArg: pu,
          function: pu.buildSingleParamFixedTimeCheckedPromise(0),
          args: [DUMMY_MESSAGES.RESOLVED],
          cached: false,
          validate: (data: string): boolean => {
            return TestUtil.dummyValidator(data);
          },
          doneCallback: (data: string): string => {
            return (data += '1');
          },
          catchCallback: (data: string): string => {
            return (data += '2');
          }
        }
      ];
      pb.addList(newCpl);
      let result;
      try {
        await pb.all(5);
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
  });
  context('given a set of promises with at least one rejected', () => {
    it('with no concurrentLimit, calls all() with a diff list and returns the same list with the updated results and the promise list is empty', async () => {
      const pb = new PromiseBatch();
      const pu = new TestUtil();
      const newCpl = [
        {
          name: 'Promise1',
          thisArg: pu,
          function: pu.buildSingleParamFixedTimeCheckedPromise(0),
          args: [DUMMY_MESSAGES.RESOLVED],
          cached: false,
          validate: (data: string): boolean => {
            return TestUtil.dummyValidator(data);
          },
          doneCallback: (data: string): string => {
            return (data += '1');
          },
          catchCallback: (data: string): string => {
            return (data += '2');
          }
        },
        {
          name: 'Promise2',
          thisArg: pu,
          function: pu.buildSingleParamFixedTimeCheckedPromise(0),
          args: [DUMMY_MESSAGES.REJECTED],
          cached: false,
          validate: (data: string): boolean => {
            return TestUtil.dummyValidator(data);
          },
          doneCallback: (data: string): string => {
            return (data += '1');
          },
          catchCallback: (data: string): string => {
            return (data += '2');
          }
        }
      ];
      pb.addList(newCpl);
      let result;
      try {
        await pb.all(5);
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
  context('given a zero concurrencyLimit is passed', () => {
    it('throws an execption regarding the zero concurrencyLimit', async () => {
      const pb = new PromiseBatch();
      const pu = new TestUtil();
      const newCpl = [
        {
          name: 'Promise1',
          thisArg: pu,
          function: pu.buildSingleParamFixedTimeCheckedPromise(0),
          args: [DUMMY_MESSAGES.RESOLVED],
          cached: false,
          validate: (data: string): boolean => {
            return TestUtil.dummyValidator(data);
          },
          doneCallback: (data: string): string => {
            return (data += '1');
          },
          catchCallback: (data: string): string => {
            return (data += '2');
          }
        },
        {
          name: 'Promise2',
          thisArg: pu,
          function: pu.buildSingleParamFixedTimeCheckedPromise(0),
          args: [DUMMY_MESSAGES.REJECTED],
          cached: false,
          validate: (data: string): boolean => {
            return TestUtil.dummyValidator(data);
          },
          doneCallback: (data: string): string => {
            return (data += '1');
          },
          catchCallback: (data: string): string => {
            return (data += '2');
          }
        }
      ];
      pb.addList(newCpl);
      let result;
      try {
        await pb.all();
      } catch (error) {
        try {
          await pb.retryRejected(0);
        } catch (suberror) {
          result = suberror;
        }
      }
      expect(result?.message).to.equal(ERROR_MSG.NO_NEGATIVE_CONC_LIMIT);
    });
  });
  context('given a negative concurrencyLimit is passed', () => {
    it('throws an execption regarding the negative concurrencyLimit', async () => {
      const pb = new PromiseBatch();
      const pu = new TestUtil();
      const newCpl = [
        {
          name: 'Promise1',
          thisArg: pu,
          function: pu.buildSingleParamFixedTimeCheckedPromise(0),
          args: [DUMMY_MESSAGES.RESOLVED],
          cached: false,
          validate: (data: string): boolean => {
            return TestUtil.dummyValidator(data);
          },
          doneCallback: (data: string): string => {
            return (data += '1');
          },
          catchCallback: (data: string): string => {
            return (data += '2');
          }
        },
        {
          name: 'Promise2',
          thisArg: pu,
          function: pu.buildSingleParamFixedTimeCheckedPromise(0),
          args: [DUMMY_MESSAGES.REJECTED],
          cached: false,
          validate: (data: string): boolean => {
            return TestUtil.dummyValidator(data);
          },
          doneCallback: (data: string): string => {
            return (data += '1');
          },
          catchCallback: (data: string): string => {
            return (data += '2');
          }
        }
      ];
      pb.addList(newCpl);
      let result;
      try {
        await pb.all();
      } catch (error) {
        try {
          await pb.retryRejected(-3);
        } catch (suberror) {
          result = suberror;
        }
      }
      expect(result?.message).to.equal(ERROR_MSG.NO_NEGATIVE_CONC_LIMIT);
    });
  });
  context('given a set of promises with at least one rejected, with a concurrentLimit specified', () => {
    it('the execution with a larger concurrentLimit takes less time', async () => {
      const pu = new TestUtil();
      const newCpl = [
        {
          name: 'Promise1',
          thisArg: pu,
          function: pu.buildSingleParamFixedTimeCheckedPromise(100),
          args: [DUMMY_MESSAGES.REJECTED],
          cached: false,
          validate: (data: string): boolean => {
            return TestUtil.dummyValidator(data);
          },
          doneCallback: (data: string): string => {
            return (data += '1');
          },
          catchCallback: (data: string): string => {
            return (data += '2');
          }
        },
        {
          name: 'Promise2',
          thisArg: pu,
          function: pu.buildSingleParamFixedTimeCheckedPromise(100),
          args: [DUMMY_MESSAGES.REJECTED],
          cached: false,
          validate: (data: string): boolean => {
            return TestUtil.dummyValidator(data);
          },
          doneCallback: (data: string): string => {
            return (data += '1');
          },
          catchCallback: (data: string): string => {
            return (data += '2');
          }
        }
      ];

      const pb1 = new PromiseBatch();
      pb1.addList(newCpl);
      let result1;
      let tFirst0;
      let tFirst1;
      try {
        await pb1.all();
      } catch (error) {
        // Fix the input
        newCpl[0].args = [DUMMY_MESSAGES.RESOLVED];
        newCpl[1].args = [DUMMY_MESSAGES.RESOLVED];
        tFirst0 = process.hrtime();
        result1 = await pb1.retryRejected(1);
        tFirst1 = process.hrtime(tFirst0);
      }

      // Break the input
      newCpl[0].args = [DUMMY_MESSAGES.REJECTED];
      newCpl[1].args = [DUMMY_MESSAGES.REJECTED];

      const pb2 = new PromiseBatch();
      pb2.addList(newCpl);
      let result2;
      let tSecond0;
      let tSecond1;
      try {
        await pb2.all();
      } catch (error) {
        // Fix the input
        newCpl[0].args = [DUMMY_MESSAGES.RESOLVED];
        newCpl[1].args = [DUMMY_MESSAGES.RESOLVED];
        tSecond0 = process.hrtime();
        result2 = await pb2.retryRejected(2);
        tSecond1 = process.hrtime(tSecond0);
      }

      const expectedRes = {
        Promise1: `${DUMMY_MESSAGES.RESOLVED}1`,
        Promise2: `${DUMMY_MESSAGES.RESOLVED}1`
      };
      expect(result1).to.eql(expectedRes);
      expect(result1).to.eql(result2);
      if (tFirst1 && tSecond1) {
        expect(calcTotalTime(tFirst1)).to.above(calcTotalTime(tSecond1));
      }
    });
  });
});

describe('PromiseBatch.exec<T>(nameOrCustomPromise: string | ICustomPromise<T>)', () => {
  context('given nameOrCustomPromise is a promise name whose promise is not included in the PromiseBatch', () => {
    it(`it throws an error containing "${ERROR_MSG.INVALID_PROMISE_NAME}"`, async () => {
      const pb = new PromiseBatch();
      let result;
      try {
        await pb.exec('NonExistent');
      } catch (error) {
        result = error;
      }
      expect(result.message).to.contain(ERROR_MSG.INVALID_PROMISE_NAME);
    });
  });
  context('given nameOrCustomPromise is a promise name whose promise is included in the PromiseBatch', () => {
    it('finds it calls PromiseBatch.execStatefulPromise and stores the result at batchResponse', async () => {
      const pb = new PromiseBatch();
      pb.add(examplePromise);
      const result = await pb.exec(examplePromise.name);
      expect(pb.batchResponse).to.eql({ GetSomething: [{ result: 'Resultd' }] });
      expect(result).to.eql([{ result: 'Resultd' }]);
    });
  });

  context('given nameOrCustomPromise is a customPromise not included in the PromiseBatch', () => {
    it('adds it, calls PromiseBatch.execStatefulPromise and stores the result at batchResponse', async () => {
      const pb = new PromiseBatch();
      const result = await pb.exec(examplePromise);
      expect(pb.batchResponse).to.eql({ GetSomething: [{ result: 'Resultd' }] });
      expect(result).to.eql([{ result: 'Resultd' }]);
    });
  });

  context('given nameOrCustomPromise is valid and the promise rejects', () => {
    it('adds it, calls PromiseBatch.execStatefulPromise and stores the result at batchResponse returning a rejected promise', async () => {
      const pb = new PromiseBatch();
      const rejectedPromise: ICustomPromise<string> = {
        name: 'Test2',
        function: () => Promise.reject('Test')
      };
      let result;
      try {
        await pb.exec(rejectedPromise);
      } catch (error) {
        result = error;
      }
      expect(pb.batchResponse).to.eql({ Test2: 'Test' });
      expect(result).to.eql('Test');
    });
  });
});

describe('PromiseBatch.isBatchCompleted()', () => {
  context('given a set of two customPromises', () => {
    it('once they are completed this function returns true', async () => {
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
  context('given a set of two customPromises built under the same batchStatus', () => {
    it('once they are completed this function returns true', async () => {
      const cp1: ICustomPromise<string> = {
        name: SIMPLE_TEST,
        function: () => Promise.resolve('')
      };
      const cp2: ICustomPromise<string> = {
        name: `${SIMPLE_TEST}2`,
        function: () => Promise.reject('')
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

      const checkCompleted = promiseBatch.isBatchCompleted();
      promiseBatch.finishPromise(SIMPLE_TEST);
      promiseBatch.finishPromise(`${SIMPLE_TEST}2`);
      const result = await checkCompleted;
      expect(result).to.eq(true);
    });
  });
  context('given a set of two customPromises built under the same batchStatus, when at least one of them is not notified as finished', () => {
    it('the function waits forever', async () => {
      // Create the child
      const child = cp.fork(path.join(__dirname, '../workers/batch-completed-worker.ts'), [], { execArgv: ['-r', 'ts-node/register'] });
      // Use an observable variable to refresh the value once the worker finishes
      const isCompleted = ko.observable(false);
      child.on('message', data => isCompleted(data));
      // Kill after timeout ms
      setTimeout(() => {
        child.kill();
      }, timeout);
      await TestUtil.setTimeout(timeout);

      expect(isCompleted()).to.eq(false);
    });
  });
});

describe('PromiseBatch.isBatchFulfilled()', () => {
  context('given a set of two customPromises that fulfill', () => {
    it('once they are completed this function returns true', async () => {
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
      const checkCompleted = pb.isBatchFulfilled();
      const result = await checkCompleted;
      expect(result).to.eq(true);
    });
  });
  context('given a set of two customPromises where one rejects', () => {
    it('once they are completed this function returns false', async () => {
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
  context('given a set of two customPromises built and completed under the same batchStatus', () => {
    it('once both are fulfilled this function returns true', async () => {
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
      promiseBatch.finishPromise(`${SIMPLE_TEST}2`);
      const result = await checkFulfilled;
      expect(result).to.eq(true);
    });
  });
  context('given a set of two customPromises built and completed under the same batchStatus', () => {
    it('once any of them is rejected this function returns false', async () => {
      const cp1: ICustomPromise<string> = {
        name: SIMPLE_TEST,
        function: () => Promise.resolve('')
      };
      const cp2: ICustomPromise<string> = {
        name: `${SIMPLE_TEST}2`,
        function: () => Promise.reject('')
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
      promiseBatch.finishPromise(`${SIMPLE_TEST}2`);
      const result = await checkFulfilled;
      expect(result).to.eq(false);
    });
  });
  context('given a set of two customPromises built under the same batchStatus, when at least one of them is not notified as finished', () => {
    it('the function waits forever', async () => {
      // Create the child
      const child = cp.fork(path.join(__dirname, '../workers/batch-fulfilled-worker.ts'), [], { execArgv: ['-r', 'ts-node/register'] });
      // Use an observable variable to refresh the value once the worker finishes
      const isFulfilled = ko.observable(false);
      child.on('message', data => isFulfilled(data));
      // Kill after timeout ms
      setTimeout(() => {
        child.kill();
      }, timeout);
      await TestUtil.setTimeout(timeout);

      expect(isFulfilled()).to.eq(false);
    });
  });
});

describe('PromiseBatch.finishPromise<T>(nameOrCustomPromise: string | ICustomPromise<T>)', () => {
  context('given the name of a promise', () => {
    it('calls statusObj.notifyAsFinished passing that name as parameter', async () => {
      const pb = new PromiseBatch();
      pb.add(examplePromiseList[0]);
      const call = pb.allSettled(3);
      expect(pb.getStatusList()).to.not.eql({});
      pb.finishPromise(examplePromiseList[0].name);
      await call;
      expect(pb.observeStatus(examplePromiseList[0].name).afterProcessingStatus).to.equal(PromiseStatus.Fulfilled);
    });
  });
  context('given the name of a promise not included in the batch', () => {
    it(`it throws an error containing "${ERROR_MSG.INVALID_PROMISE_NAME}"`, () => {
      const pb = new PromiseBatch();
      let result;
      try {
        pb.finishPromise('NonExistent');
      } catch (error) {
        result = error;
      }
      expect(result.message).to.contain(ERROR_MSG.INVALID_PROMISE_NAME);
    });
  });
  context('given a custom promise', () => {
    it('gets its name and calls statusObj.notifyAsFinished passing that name as parameter', async () => {
      const pb = new PromiseBatch();
      pb.add(examplePromiseList[0]);
      const call = pb.allSettled(3);
      expect(pb.getStatusList()).to.not.eql({});
      pb.finishPromise(examplePromiseList[0]);
      await call;
      expect(pb.observeStatus(examplePromiseList[0].name).afterProcessingStatus).to.equal(PromiseStatus.Fulfilled);
    });
  });
});

describe('PromiseBatch.finishAllPromises()', () => {
  context('given statusObject is empty', () => {
    it('does nothing', () => {
      const pb = new PromiseBatch();
      pb.finishAllPromises();
      expect(pb.getStatusList()).to.eql({});
    });
  });
  context('given statusObject is not empty', () => {
    it('sets all properties ended in AfterProcessing inside statusObject to fulfilled', async () => {
      const pb = new PromiseBatch();
      pb.addList(examplePromiseList);
      const call = pb.allSettled(3);
      expect(pb.getStatusList()).to.not.eql({});
      pb.finishAllPromises();
      await call;
      Object.keys(pb.getStatusList()).forEach(key => {
        expect(pb.observeStatus(key).promiseStatus).to.equal(PromiseStatus.Fulfilled);
      });
    });
  });
});

describe('PromiseBatch.observeStatus(nameOrCustomPromise: string | ICustomPromise<T>)', () => {
  const key = 'observe';
  context('given it was initialized and nameOrCustomPromise is a promise name whose promise is included in the PromiseBatch', () => {
    it('returns the status saved for the customPromise name (it could be the "after processing" status if provided)', async () => {
      const pb = new PromiseBatch();
      pb.add(examplePromise);
      await pb.all();
      expect(pb.observeStatus(examplePromise.name).promiseStatus).to.be.eq(PromiseStatus.Fulfilled);
      expect(pb.observeStatus(examplePromise.name).afterProcessingStatus).to.be.eq(PromiseStatus.Fulfilled);
    });
  });
  context('given it was initialized and nameOrCustomPromise is a customPromise included in the PromiseBatch', () => {
    it('returns the status saved for the customPromise, including afterProcessing status', async () => {
      const pb = new PromiseBatch();
      pb.add(examplePromise);
      await pb.all();
      expect(pb.observeStatus(examplePromise).promiseStatus).to.be.eq(PromiseStatus.Fulfilled);
      expect(pb.observeStatus(examplePromise.name).afterProcessingStatus).to.be.eq(PromiseStatus.Fulfilled);
    });
  });
  context('given it was not initialized', () => {
    it('returns undefined', () => {
      const pb = new PromiseBatch();
      expect(pb.observeStatus(key).promiseStatus).to.be.eq(undefined);
      expect(pb.observeStatus(key).afterProcessingStatus).to.be.eq(undefined);
    });
  });
});

describe('PromiseBatch.getStatusList()', () => {
  context('given statusObject is internally initalized', () => {
    it('returns the status property of statusObject', async () => {
      const pb = new PromiseBatch();
      pb.add(examplePromise);
      await pb.all();
      expect(pb.getStatusList()).to.contain.keys([examplePromise.name, `${examplePromise.name}${GLOBAL_CONSTANTS.AFTER_PROCESSING}`]);
    });
  });
});

describe('PromiseBatch.resetPromise<T>(nameOrCustomPromise: string | ICustomPromise<T>)', () => {
  context('given the name or customPromise provided does not exist', () => {
    it('does nothing', async () => {
      const pb = new PromiseBatch();
      const promiseName = 'nonContained';
      pb.addList(examplePromiseList);
      await pb.all();
      pb.resetPromise(promiseName);
      Object.keys(pb.getStatusList()).forEach(key => {
        expect(pb.observeStatus(key).promiseStatus).to.equal(PromiseStatus.Fulfilled);
      });
    });
  });
  context('given the name or customPromise provided exists in the promise batch', () => {
    it('resets the status of promiseName and promiseNameafterProcessing to Pending', async () => {
      const pb = new PromiseBatch();
      const promiseName = examplePromiseList[0].name;
      const customPromise = examplePromiseList[1];
      pb.addList(examplePromiseList);
      await pb.all();
      pb.resetPromise(promiseName);
      pb.resetPromise(customPromise);
      Object.keys(pb.getStatusList()).forEach(key => {
        expect(pb.observeStatus(key).promiseStatus).to.equal(PromiseStatus.Pending);
      });
    });
  });
});

describe('PromiseBatch.reset()', () => {
  context('given both are empty', () => {
    it('resets batchResponse and statusObject to an initial state', () => {
      const pb = new PromiseBatch();
      pb.reset();
      expect(pb.batchResponse).to.eql({});
      expect(pb.getStatusList()).to.eql({});
    });
  });
  context('given both are not empty', () => {
    it('resets batchResponse and statusObject to an initial state', async () => {
      const pb = new PromiseBatch();
      pb.add(examplePromiseList[0]);
      const call = pb.allSettled(3);
      expect(pb.getStatusList()).to.not.eql({});
      pb.finishPromise(examplePromiseList[0]);
      await call;
      pb.reset();
      expect(pb.batchResponse).to.eql({});
      expect(pb.getStatusList()).to.eql({});
    });
  });
});
