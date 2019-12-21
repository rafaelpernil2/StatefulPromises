import { expect } from 'chai';
import 'mocha';
import { PromiseBatch } from '../index';
import { PromiseBatchStatus } from '../index';
import { IAnyObject } from '../interfaces/i-any-object';
import { ICustomPromise } from '../interfaces/i-custom-promise';
import { PromiseUtil } from '../utils/promise-util';

describe('Initial test. The method promiseAll of a PromiseBatch instance with a predefined set of dummy promises...', () => {
  it('should return the following object', async () => {
    const concurrentLimit = 5;
    const batchStatus = new PromiseBatchStatus();
    const promiseBatch = new PromiseBatch(batchStatus);

    const listOfPromises = [
      {
        name: 'GetSomething',
        function: PromiseUtil.buildFixedTimePromise(10),
        thisArg: undefined,
        args: [{ result: 'Result' }]
      },
      {
        name: 'CreateSomething',
        function: PromiseUtil.buildFixedTimePromise(10),
        thisArg: undefined,
        args: [{ result: 'Result' }, { result2: 'Result' }]
      },
      {
        name: 'DeleteSomething',
        function: PromiseUtil.buildFixedTimePromise(1000),
        validate: PromiseUtil.dummyValidator,
        doneCallback: (data: string) => {
          data += 'g';
          return data;
        },
        catchCallback: (error: string) => {
          error += 'MODIFIED';
          return error;
        },
        args: ['something']
      },
      {
        name: 'AddElement',
        function: PromiseUtil.buildFixedTimePromise(1000),
        validate: (data: IAnyObject[]) => {
          return !!data;
        },
        doneCallback: (data: IAnyObject[]) => {
          data[0].pop();
          data[0].push(4);
          return data;
        },
        catchCallback: (error: string) => {
          error += 'MODIFIED';
          return error;
        },
        args: [[1, 2, 3]]
      },
      {
        name: 'UpdateSomething',
        function: PromiseUtil.buildFixedTimePromise(100)
      },
      {
        name: 'ExternalAPI1',
        function: PromiseUtil.buildSingleParamFixedTimePromise<number>(100),
        validate: (data: number) => {
          data++;
          return !!data;
        },
        doneCallback: (data: number) => {
          data++;
          return data;
        },
        catchCallback: (error: string) => {
          error += 'MODIFIED';
          return error;
        },
        args: [1]
      },
      {
        name: 'ExternalAPI2',
        function: PromiseUtil.buildFixedTimePromise(100)
      },
      {
        name: 'LoadJSON',
        function: PromiseUtil.buildFixedTimePromise(10)
      },
      {
        name: 'LoadAuthCookie',
        function: PromiseUtil.buildFixedTimePromise(10)
      },
      {
        name: 'LoadExternalLibraries',
        function: PromiseUtil.buildFixedTimePromise(10)
      },
      {
        name: 'SendLog',
        function: PromiseUtil.buildFixedTimePromise(10)
      }
    ];
    // promiseBatch.add(listOfPromises[0]);
    promiseBatch.addList(listOfPromises);
    // const a = promiseBatch.build(listOfPromises[0]);

    const call = promiseBatch.promiseAll(concurrentLimit);
    promiseBatch.finishAllPromises();
    const result = await call;

    // console.log(result);

    const expectedResult = {
      GetSomething: [{ result: 'Result' }],
      CreateSomething: [{ result: 'Result' }, { result2: 'Result' }],
      LoadJSON: PromiseUtil.NO_INPUT_PROVIDED,
      AddElement: [[1, 2, 4]],
      DeleteSomething: 'somethingg',
      UpdateSomething: PromiseUtil.NO_INPUT_PROVIDED,
      LoadAuthCookie: PromiseUtil.NO_INPUT_PROVIDED,
      ExternalAPI2: PromiseUtil.NO_INPUT_PROVIDED,
      LoadExternalLibraries: PromiseUtil.NO_INPUT_PROVIDED,
      ExternalAPI1: 2,
      SendLog: PromiseUtil.NO_INPUT_PROVIDED
    };

    // const call2 = promiseBatch.promiseAll(concurrentLimit);
    // promiseBatch.finishAllPromises();
    // const result2 = await call2;

    expect(result).to.eql(expectedResult);
  });
});
