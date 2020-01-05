import { expect } from 'chai';
import ko from 'knockout';
import 'mocha';
import { AFTER_CALLBACK, ERROR_MSG, PROMISE_STATUS } from '../constants/global-constants';
import { PromiseBatchStatus } from '../utils/promise-batch-status';

const checkKeyIs = (pbs: PromiseBatchStatus, key: string, status: string) => {
  expect(pbs.statusObject.Status).to.contain.keys([`${key}`]);
  expect(pbs.statusObject.Status[`${key}`]()).to.eq(status);
};

const checkKeyDoesNotExist = (pbs: PromiseBatchStatus, key: string) => {
  expect(pbs.statusObject.Status).to.not.contain.keys([`${key}`]);
};

const resetStatus = PROMISE_STATUS.PENDING;
const failedStatus = PROMISE_STATUS.REJECTED;
const fulfilledStatus = PROMISE_STATUS.FULFILLED;
const data = { test: 'Hello world' };

describe('new PromiseBatchStatus(): Initializes the statusObject as an object with two properties Status and Cache as empty objects', () => {
  const pbs = new PromiseBatchStatus();

  it(`Contains Status and Cache properties as empty objects`, async () => {
    expect(pbs.statusObject).to.contain.keys(['Status', 'Cache']);
  });
});

describe('PromiseBatchStatus.initStatus(key: string): Given "init" as the first parameter, if the property "init" or "initAfterCallback" do not exits, it calls initStatus with given "init" parameter', () => {
  const key = 'init';

  it('Sets init and initAfterCallback as pending given "init" property did not exist', async () => {
    const pbs = new PromiseBatchStatus();
    pbs.statusObject.Status[`${key}${AFTER_CALLBACK}`] = ko.observable(PROMISE_STATUS.FULFILLED);
    pbs.initStatus(key);
    checkKeyIs(pbs, key, resetStatus);
    checkKeyIs(pbs, `${key}${AFTER_CALLBACK}`, resetStatus);
  });
  it('Sets init and initAfterCallback as pending given "initAfterCallback" property did not exist', async () => {
    const pbs = new PromiseBatchStatus();
    pbs.statusObject.Status[`${key}`] = ko.observable(PROMISE_STATUS.FULFILLED);
    pbs.initStatus(key);
    checkKeyIs(pbs, key, resetStatus);
  });
  it('Sets init and initAfterCallback as pending given "init" and "initAfterCallback" properties did not exist', async () => {
    const pbs = new PromiseBatchStatus();
    pbs.initStatus(key);
    checkKeyIs(pbs, key, resetStatus);
  });
  it('Does not set init and initAfterCallback as pending given "init" and "initAfterCallback" properties existed', async () => {
    const pbs = new PromiseBatchStatus();
    pbs.statusObject.Status[`${key}${AFTER_CALLBACK}`] = ko.observable(fulfilledStatus);
    pbs.statusObject.Status[`${key}`] = ko.observable(fulfilledStatus);
    pbs.initStatus(key);
    checkKeyIs(pbs, key, fulfilledStatus);
    checkKeyIs(pbs, `${key}${AFTER_CALLBACK}`, fulfilledStatus);
  });
});

describe('PromiseBatchStatus.resetStatus(key: string): Given "key" as the first parameter, it initializes two properties called "key" and "keyAfterCallback" with the value "status pending" using Knockout', () => {
  const pbs = new PromiseBatchStatus();
  const key = 'key';
  it(`Given "${key}" and "${key}${AFTER_CALLBACK}" do not exist, this does nothing`, async () => {
    pbs.resetStatus(key);
    checkKeyDoesNotExist(pbs, key);
    checkKeyDoesNotExist(pbs, `${key}${AFTER_CALLBACK}`);
  });
  it(`Given "${key}" and "${key}${AFTER_CALLBACK}" existed, they are reset to pending`, async () => {
    pbs.initStatus(key);
    pbs.updateStatus(key, PROMISE_STATUS.FULFILLED);
    pbs.updateStatus(`${key}${AFTER_CALLBACK}`, PROMISE_STATUS.FULFILLED);
    pbs.resetStatus(key);
    checkKeyIs(pbs, key, resetStatus);
    checkKeyIs(pbs, `${key}${AFTER_CALLBACK}`, resetStatus);
  });
});

describe('PromiseBatchStatus.updateStatus(key: string, status: PromiseStatus): Given a "key" and a "status", it updates the property "key" inside statusObject.Status with the value "status"', () => {
  const key = 'update';

  it('Updates the status given that it was initialized', async () => {
    const pbs = new PromiseBatchStatus();
    pbs.initStatus(key);
    pbs.updateStatus(key, fulfilledStatus);
    checkKeyIs(pbs, key, fulfilledStatus);
  });

  it('Does not update the status given that it was not initialized', async () => {
    const pbs = new PromiseBatchStatus();
    pbs.updateStatus(key, fulfilledStatus);
    checkKeyDoesNotExist(pbs, key);
  });
});

describe('PromiseBatchStatus.observeStatus(key: string): Given a "key", it return its status saved inside statusObject.Status.key', () => {
  const key = 'observe';

  it('Returns the status saved inside "key", given it was initialized', async () => {
    const pbs = new PromiseBatchStatus();
    pbs.initStatus(key);
    pbs.updateStatus(key, fulfilledStatus);
    expect(pbs.observeStatus(key)).to.be.eq(fulfilledStatus);
  });

  it('Does not return the status saved inside "key", given it was not initialized', async () => {
    const pbs = new PromiseBatchStatus();
    expect(pbs.observeStatus(key)).to.be.eq(undefined);
  });
});

describe('PromiseBatchStatus.getCachedResponse(key: string): Given a "key", it returns its cached data inside statusObject.Cache.key', () => {
  const key = 'getCache';

  it('Returns the cached data saved inside "key" given it was saved before', async () => {
    const pbs = new PromiseBatchStatus();
    pbs.initStatus(key);
    pbs.statusObject.Cache[key] = data;
    expect(pbs.getCachedResponse(key)).to.be.eq(data);
  });

  it('Returns an error message given there is no cached data inside "key"', async () => {
    const pbs = new PromiseBatchStatus();
    pbs.initStatus(key);
    expect(pbs.getCachedResponse(key)).to.be.eq(ERROR_MSG.NO_CACHED_VALUE);
  });
});

describe('PromiseBatchStatus.addCachedResponse<T>(key: string, data: T): Given a "key" and some "data", it saves inside statusObject.Cache.key the value of data', () => {
  const key = 'addCache';

  it('Inserts "data" inside statusObject.Cache.key', async () => {
    const pbs = new PromiseBatchStatus();
    pbs.initStatus(key);
    pbs.addCachedResponse(key, data);
    expect(pbs.statusObject.Cache[key]).to.be.eq(data);
  });
});

describe('PromiseBatchStatus.getStatusList(): Returns the Status field of statusObject', () => {
  const key = 'getStatusList';

  it('Returns the Status field of statusObject', async () => {
    const pbs = new PromiseBatchStatus();
    pbs.initStatus(key);
    expect(pbs.getStatusList()).to.contain.keys([key]);
  });
});

describe('PromiseBatchStatus.getCacheList(): Returns the Cache field of statusObject', () => {
  const key = 'getCacheList';

  it('Returns the Cache field of statusObject', async () => {
    const pbs = new PromiseBatchStatus();
    pbs.initStatus(key);
    pbs.addCachedResponse(key, data);
    expect(pbs.getCachedResponse(key)).to.be.eq(data);
  });
});

describe('PromiseBatchStatus.getRejectedPromiseNames(): Returns the list of failed promises inside this batch', () => {
  const keyOne = 'keyOne';
  const keyTwo = 'keyTwo';
  const keyThree = 'keyThree';

  it('Returns the list of failed promises inside this batch given the list is not empty', async () => {
    const pbs = new PromiseBatchStatus();
    pbs.initStatus(keyOne);
    pbs.updateStatus(keyOne, failedStatus);
    pbs.initStatus(keyTwo);
    pbs.updateStatus(keyTwo, failedStatus);
    pbs.initStatus(keyThree);
    pbs.updateStatus(keyThree, fulfilledStatus);

    expect(pbs.getRejectedPromiseNames()).to.eql([keyOne, keyTwo]);
  });

  it('Returns an empty array given the list of status is empty', async () => {
    const pbs = new PromiseBatchStatus();
    expect(pbs.getRejectedPromiseNames()).to.eql([]);
  });
});

describe('PromiseBatchStatus.resetRejectedPromises(): Resets the Status properties marked as rejected', () => {
  const keyOne = 'keyOne';
  const keyTwo = 'keyTwo';
  const keyThree = 'keyThree';

  it('Marks the rejected promises as pending again', async () => {
    const pbs = new PromiseBatchStatus();
    pbs.initStatus(keyOne);
    pbs.updateStatus(keyOne, failedStatus);
    pbs.initStatus(keyTwo);
    pbs.updateStatus(keyTwo, failedStatus);
    pbs.initStatus(keyThree);
    pbs.updateStatus(keyThree, fulfilledStatus);

    pbs.resetRejectedPromises();

    expect(pbs.getRejectedPromiseNames()).to.eql([]);
  });
});

describe('PromiseBatchStatus.notifyAsFinished(key: string): Given a "key" it changes the status of statusObject.Status.keyAfterCallback to fulfilled', () => {
  const key = 'notifyAsFinished';

  it('Sets the status of keyAfterCallback to fulfilled given that it was initialized', async () => {
    const pbs = new PromiseBatchStatus();
    pbs.initStatus(key);
    pbs.notifyAsFinished(key);
    checkKeyIs(pbs, `${key}${AFTER_CALLBACK}`, fulfilledStatus);
  });

  it('Does not update the status of keyAfterCallback given that it was not initialized', async () => {
    const pbs = new PromiseBatchStatus();
    pbs.notifyAsFinished(key);
    checkKeyDoesNotExist(pbs, `${key}${AFTER_CALLBACK}`);
  });
});

describe('PromiseBatchStatus.reset(): Resets the statusObject to an object with two properties Status and Cache as empty objects', () => {
  const key = 'reset';
  it('Changes statusObject to an object with two empty objects called Status and Cache', async () => {
    const pbs = new PromiseBatchStatus();
    pbs.initStatus(key);
    pbs.addCachedResponse(key, data);
    pbs.reset();
    expect(pbs.statusObject).to.eql({ Status: {}, Cache: {} });
  });
});
