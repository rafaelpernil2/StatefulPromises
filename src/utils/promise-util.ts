/*tslint:disable:no-any */
import { IAnyObject } from '../interfaces/i-any-object';

// This class is only used for testing purposes

export class PromiseUtil {
  public static NO_INPUT_PROVIDED = { res: 'No input provided' };

  public static buildRandomTimePromise = (timeMagnitude: number) => {
    const time = Math.ceil(Math.random() * 10) * timeMagnitude;
    return (...input: any[]) => {
      return new Promise<any>((resolve, reject) => {
        setTimeout(() => {
          if (input[0]) {
            resolve(input);
          } else {
            resolve(PromiseUtil.NO_INPUT_PROVIDED);
          }
        }, time);
      });
    };
  };

  public static buildFixedTimePromise = (timeInMs: number) => {
    return (...input: any[]) => {
      return new Promise<any>((resolve, reject) => {
        setTimeout(() => {
          if (input[0]) {
            resolve(input);
          } else {
            resolve(PromiseUtil.NO_INPUT_PROVIDED);
          }
        }, timeInMs);
      });
    };
  };

  public static buildSingleParamFixedTimePromise = <T>(timeInMs: number) => {
    return (input: T) => {
      return new Promise<T>((resolve, reject) => {
        setTimeout(() => {
          if (input) {
            resolve(input);
          } else {
            resolve();
          }
        }, timeInMs);
      });
    };
  };

  public static buildPassthroughPromise = (timeInMs: number) => {
    return (...input: any[]) => {
      return new Promise<any>((resolve, reject) => {
        if (input[0]) {
          resolve(input);
        } else {
          resolve(PromiseUtil.NO_INPUT_PROVIDED);
        }
      });
    };
  };

  public static dummyValidator = (input: any) => {
    return input !== PromiseUtil.NO_INPUT_PROVIDED ? input : false;
  };
}
