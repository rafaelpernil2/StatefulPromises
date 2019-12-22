import ko from 'knockout';
import { NO_RESULT, PROMISE_STATUS } from '../constants/global-constants';
import { IAnyObject } from '../interfaces/i-any-object';
import { ICustomPromise } from '../interfaces/i-custom-promise';
import { PromiseBatchStatus } from '../promise-batch-status';
export class DataUtil {
  public static isPromiseBatchCompleted = (promiseStatusObj: PromiseBatchStatus): Promise<boolean> => {
    // Initial check
    const arePromisesCompleted = Object.values(promiseStatusObj.getStatusList()).every((value: ko.Observable<string>) => {
      return value() === PROMISE_STATUS.FULFILLED || value() === PROMISE_STATUS.REJECTED;
    });
    const promisesFinished = ko.pureComputed(() => {
      return Object.values(promiseStatusObj.getStatusList()).every((value: ko.Observable<string>) => {
        return value() !== PROMISE_STATUS.PENDING;
      });
    });

    return new Promise<boolean>((resolve, reject) => {
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
  };

  public static isPromiseBatchFulfilled = async (promiseStatusObj: PromiseBatchStatus) => {
    // First make sure all promises are completed
    await DataUtil.isPromiseBatchCompleted(promiseStatusObj);
    // Then, check if they are fulfilled
    return Object.values(promiseStatusObj.getStatusList()).every((value: ko.Observable<string>) => {
      return value() === PROMISE_STATUS.FULFILLED;
    });
  };

  // tslint:disable-next-line: no-any
  public static buildStatefulPromise = async <T>(customPromise: ICustomPromise<T>, promiseStatus: PromiseBatchStatus): Promise<T> => {
    // Return cached value if chosen
    if (promiseStatus.observeStatus(customPromise.name) === PROMISE_STATUS.FULFILLED) {
      const response = customPromise?.lazyMode ? NO_RESULT : promiseStatus.getCachedResponse(customPromise.name);
      return Promise.resolve(response);
    }

    const args = customPromise && customPromise.args ? customPromise.args : [];
    // Initialize status as pending
    promiseStatus.initStatus(customPromise.name);

    return customPromise.function.call(customPromise.thisArg, ...args).then(
      (response: T) => {
        // Save the response
        const doneData = {} as IAnyObject;
        doneData.response = response;
        // Validate response if a validator was provided
        if (customPromise.validate) {
          // If the variable is an object, it must be cloned to avoid modifications
          let clonedResponse = response;
          if (typeof response === 'object') {
            clonedResponse = JSON.parse(JSON.stringify(response));
          }
          const isValid = customPromise.validate(clonedResponse);
          doneData.status = isValid ? PROMISE_STATUS.FULFILLED : PROMISE_STATUS.REJECTED;
        } else {
          doneData.status = PROMISE_STATUS.FULFILLED;
        }

        promiseStatus.updateStatus(customPromise.name, doneData.status);

        // Make sure the done callback notification happens after it is finished
        const doneCallbackRes = customPromise.doneCallback ? customPromise.doneCallback(doneData.response) : undefined;
        if (doneCallbackRes) {
          doneData.response = doneCallbackRes;
          promiseStatus.notifyAsFinished(customPromise.name);
        }
        // Cache data
        if (!customPromise?.lazyMode) {
          promiseStatus.addCachedResponse(customPromise.name, doneData.response);
        }
        return doneData.response as T;
      },
      // tslint:disable-next-line: no-any
      (error: any) => {
        promiseStatus.updateStatus(customPromise.name, PROMISE_STATUS.REJECTED);

        const catchCallbackRes = customPromise.catchCallback ? customPromise.catchCallback(error) : undefined;
        const catchData = {} as IAnyObject;
        if (catchCallbackRes) {
          catchData.response = catchCallbackRes;
          promiseStatus.notifyAsFinished(customPromise.name);
        } else {
          catchData.response = error;
        }

        return catchData.response as T;
      }
    );
  };
}
