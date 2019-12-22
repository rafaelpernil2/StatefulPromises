import { expect } from 'chai';
import ko from 'knockout';
import 'mocha';
import { PromiseBatch } from '../index';
import { PromiseBatchStatus } from '../index';
import { IAnyObject } from '../interfaces/i-any-object';
import { ICustomPromise } from '../interfaces/i-custom-promise';
import { PromiseUtil } from '../utils/promise-util';

const cp: ICustomPromise<object[]> = {
  name: 'GetSomething',
  function: PromiseUtil.buildFixedTimePromise(100),
  thisArg: undefined,
  validate: data => {
    return false;
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
  lazyMode: true
};

const cpl: Array<ICustomPromise<unknown>> = [
  {
    name: 'ExternalAPI2',
    function: PromiseUtil.buildFixedTimePromise(100)
  },
  {
    name: 'LoadJSON',
    function: PromiseUtil.buildFixedTimePromise(10)
  }
];

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

describe('PromiseBatch.build()', () => {
  it('does something', async () => {
    // Implement if needed
  });
});

describe('PromiseBatch.promiseAll()', () => {
  it('does something', async () => {
    // Implement if needed
  });
});
describe('PromiseBatch.promiseAny()', () => {
  it('does something', async () => {
    // Implement if needed
  });
});
describe('PromiseBatch.retryFailed()', () => {
  it('does something', async () => {
    // Implement if needed
  });
});
describe('PromiseBatch.getBatchResponse()', () => {
  it('does something', async () => {
    // Implement if needed
  });
});
describe('PromiseBatch.finishAllPromises()', () => {
  it('does something', async () => {
    // Implement if needed
  });
});
describe('PromiseBatch.finishPromise()', () => {
  it('does something', async () => {
    // Implement if needed
  });
});
describe('PromiseBatch.reset()', () => {
  it('does something', async () => {
    // Implement if needed
  });
});
