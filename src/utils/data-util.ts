import ko from 'knockout';
import { NO_RESULT, PROMISE_STATUS } from '../constants/global-constants';
import { IAnyObject } from '../interfaces/i-any-object';
import { ICustomPromise } from '../interfaces/i-custom-promise';
import { PromiseBatchStatus } from '../promise-batch-status';
export class DataUtil {
  public static isPromiseBatchCompleted(batchStatus: PromiseBatchStatus): Promise<boolean> {
    // Initial check
    const arePromisesCompleted = Object.values(batchStatus.getStatusList()).every((value: ko.Observable<string>) => {
      return value() === PROMISE_STATUS.FULFILLED || value() === PROMISE_STATUS.REJECTED;
    });
    const promisesFinished = ko.pureComputed(() => {
      return Object.values(batchStatus.getStatusList()).every((value: ko.Observable<string>) => {
        return value() !== PROMISE_STATUS.PENDING;
      });
    });
    return new Promise<boolean>(resolve => {
      if (arePromisesCompleted) {
        resolve(true);
      } else {
        promisesFinished.subscribe(newValue => {
          if (newValue) {
            resolve(newValue);
          }
        });
      }
    });
  }

  public static async isPromiseBatchFulfilled(batchStatus: PromiseBatchStatus) {
    // First make sure all promises are completed
    await DataUtil.isPromiseBatchCompleted(batchStatus);
    // Then, check if they are fulfilled
    return Object.values(batchStatus.getStatusList()).every((value: ko.Observable<string>) => {
      return value() === PROMISE_STATUS.FULFILLED;
    });
  }

  public static buildStatefulPromise<T>(customPromise: ICustomPromise<T>, promiseStatus: PromiseBatchStatus): Promise<T> {
    // Return cached value if available
    if (promiseStatus.observeStatus(customPromise.name) === PROMISE_STATUS.FULFILLED) {
      const response = customPromise?.cached ? promiseStatus.getCachedResponse(customPromise.name) : NO_RESULT;
      return Promise.resolve(response);
    }
    const args = customPromise && customPromise.args ? customPromise.args : [];
    // Initialize status as pending if it wasn't created before.
    // .initStatus takes care of that
    promiseStatus.initStatus(customPromise.name);

    return new Promise<T>((resolve, reject) => {
      customPromise.function.call(customPromise.thisArg, ...args).then(
        (response: T) => {
          // Save the response
          const doneData: IAnyObject = {
            response
          };
          // Validate response if a validator was provided
          DataUtil.execValidateIfProvided(customPromise, doneData);
          // Execute done or catch callback depending on the status in doneData
          DataUtil.execDoneOrCatchCallback(customPromise, promiseStatus, doneData);
          // If cache is enabled, the response has to be saved in cache
          if (customPromise?.cached) {
            promiseStatus.addCachedResponse(customPromise.name, doneData.response);
          }
          // If fulfilled...
          if (doneData.status === PROMISE_STATUS.FULFILLED) {
            resolve(doneData.response);
          } else {
            reject(doneData.response);
          }
        },
        (error: unknown) => {
          const catchData: IAnyObject = {
            status: PROMISE_STATUS.REJECTED,
            response: error
          };
          DataUtil.execDoneOrCatchCallback(customPromise, promiseStatus, catchData);
          reject(catchData.response);
        }
      );
    });
  }

  private static execDoneOrCatchCallback<T>(customPromise: ICustomPromise<T>, promiseStatus: PromiseBatchStatus, data: IAnyObject) {
    promiseStatus.updateStatus(customPromise.name, data.status);
    switch (data.status) {
      case PROMISE_STATUS.FULFILLED:
        if (customPromise.doneCallback) {
          data.response = customPromise.doneCallback(data.response);
          promiseStatus.notifyAsFinished(customPromise.name);
        }
        break;
      case PROMISE_STATUS.REJECTED:
        if (customPromise.catchCallback) {
          data.response = customPromise.catchCallback(data.response);
          promiseStatus.notifyAsFinished(customPromise.name);
        }
        break;
      default:
        break;
    }
  }

  private static execValidateIfProvided<T>(customPromise: ICustomPromise<T>, doneData: IAnyObject) {
    // Validate response if a validator was provided
    if (customPromise.validate) {
      // If the variable is an object, it must be cloned to avoid modifications
      let clonedResponse = doneData.response;
      if (typeof doneData.response === 'object') {
        clonedResponse = JSON.parse(JSON.stringify(doneData.response));
      }
      // If valid, the status is fulfilled, else it is rejected
      const isValid = customPromise.validate(clonedResponse);
      doneData.status = isValid ? PROMISE_STATUS.FULFILLED : PROMISE_STATUS.REJECTED;
    } else {
      doneData.status = PROMISE_STATUS.FULFILLED;
    }
  }
}
