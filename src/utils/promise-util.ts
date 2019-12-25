/*tslint:disable:no-any */
import { IAnyObject } from '../interfaces/i-any-object';

export const DUMMY_MESSAGES = {
  RESOLVED: 'Resolved',
  REJECTED: 'Rejected'
};

export const SIMPLE_TEST = 'FirstExecSimpleTest';

// This class is only used for testing purposes
export class PromiseUtil {
  public static NO_INPUT_PROVIDED = { res: 'No input provided' };

  public static buildRandomTimePromise(timeMagnitude: number) {
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
  }

  public static buildFixedTimeNoParamPromise(timeInMs: number, ok: boolean) {
    return () => {
      return new Promise<any>((resolve, reject) => {
        setTimeout(() => {
          if (ok) {
            resolve(DUMMY_MESSAGES.RESOLVED);
          } else {
            reject(DUMMY_MESSAGES.REJECTED);
          }
        }, timeInMs);
      });
    };
  }

  public static buildFixedTimePromise(timeInMs: number) {
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
  }

  public static buildSingleParamFixedTimePromise<T>(timeInMs: number) {
    return (input: T) => {
      return new Promise<T>((resolve, reject) => {
        setTimeout(() => {
          if (input) {
            resolve(input);
          } else {
            reject();
          }
        }, timeInMs);
      });
    };
  }

  public static buildPassthroughPromise(timeInMs: number) {
    return (...input: any[]) => {
      return new Promise<any>((resolve, reject) => {
        if (input[0]) {
          resolve(input);
        } else {
          resolve(PromiseUtil.NO_INPUT_PROVIDED);
        }
      });
    };
  }

  public static setTimeout(timeInMs: number) {
    return new Promise<void>(resolve => {
      setTimeout(() => {
        resolve();
      }, timeInMs);
    });
  }

  public static dummyValidator(input: any) {
    return input === DUMMY_MESSAGES.RESOLVED;
  }

  // For testing promises with thisArg
  public input: unknown;
  constructor(input?: unknown) {
    this.input = input;
  }

  public buildSingleParamFixedTimePromise<T>(timeInMs: number) {
    return PromiseUtil.buildSingleParamFixedTimePromise<T>(timeInMs);
  }
  public buildPassthroughPromise(timeInMs: number) {
    return PromiseUtil.buildPassthroughPromise(timeInMs);
  }

  public buildNoParamFixedTimePromise(timeInMs: number) {
    return () => {
      return new Promise<string>((resolve, reject) => {
        setTimeout(() => {
          if (this.input === DUMMY_MESSAGES.RESOLVED) {
            resolve(this.input);
          } else {
            reject(this.input);
          }
        }, timeInMs);
      });
    };
  }

  public buildSingleParamFixedTimeUncheckedPromise(timeInMs: number) {
    return (input: string) => {
      return new Promise<string>((resolve, reject) => {
        setTimeout(() => {
          resolve(input);
        }, timeInMs);
      });
    };
  }
  public buildSingleParamFixedTimeCheckedPromise(timeInMs: number) {
    return (input: string) => {
      return new Promise<string>((resolve, reject) => {
        setTimeout(() => {
          if (input === DUMMY_MESSAGES.RESOLVED) {
            resolve(input);
          } else {
            reject(input);
          }
        }, timeInMs);
      });
    };
  }
}
