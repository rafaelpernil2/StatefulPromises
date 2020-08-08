/* eslint-disable @typescript-eslint/no-explicit-any */
/*tslint:disable:no-any */

export const DUMMY_MESSAGES = {
  RESOLVED: 'Resolved',
  REJECTED: 'Rejected'
};

export const SIMPLE_TEST = 'FirstExecSimpleTest';

// This class is only used for testing purposes
export class TestUtil {
  public static NO_INPUT_PROVIDED = { res: 'No input provided' };

  public static buildRandomTimePromise(timeMagnitude: number): (input: any[]) => Promise<any> {
    const time = Math.ceil(Math.random() * 10) * timeMagnitude;
    return (...input: any[]): Promise<any> => {
      return new Promise<any>(resolve => {
        setTimeout(() => {
          if (input[0]) {
            resolve(input);
          } else {
            resolve(TestUtil.NO_INPUT_PROVIDED);
          }
        }, time);
      });
    };
  }

  public static buildFixedTimeNoParamPromise(timeInMs: number, ok: boolean): () => Promise<any> {
    return (): Promise<any> => {
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

  public static buildFixedTimePromise(timeInMs: number): (input: any[]) => Promise<any> {
    return (...input: any[]): Promise<any> => {
      return new Promise<any>(resolve => {
        setTimeout(() => {
          if (input[0]) {
            resolve(JSON.parse(JSON.stringify(input)));
          } else {
            resolve(TestUtil.NO_INPUT_PROVIDED);
          }
        }, timeInMs);
      });
    };
  }

  public static buildSingleParamFixedTimePromise<T>(timeInMs: number): (input: T) => Promise<T> {
    return (input: T): Promise<T> => {
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

  public static buildPassthroughPromise(): (input: any[]) => Promise<any> {
    return (...input: any[]): Promise<any> => {
      return new Promise<any>(resolve => {
        if (input[0]) {
          resolve(input);
        } else {
          resolve(TestUtil.NO_INPUT_PROVIDED);
        }
      });
    };
  }

  public static setTimeout(timeInMs: number): Promise<void> {
    return new Promise<void>(resolve => {
      setTimeout(() => {
        resolve();
      }, timeInMs);
    });
  }

  public static dummyValidator(input: any): boolean {
    return input === DUMMY_MESSAGES.RESOLVED;
  }

  // For testing promises with thisArg
  public input: unknown;
  constructor(input?: unknown) {
    this.input = input;
  }

  public buildSingleParamFixedTimePromise<T>(timeInMs: number): (input: T) => Promise<T> {
    return TestUtil.buildSingleParamFixedTimePromise<T>(timeInMs);
  }
  public buildPassthroughPromise(): (input: any[]) => Promise<any> {
    return TestUtil.buildPassthroughPromise();
  }

  public buildNoParamFixedTimePromise(timeInMs: number): () => Promise<string> {
    return (): Promise<string> => {
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

  public buildSingleParamFixedTimeUncheckedPromise(timeInMs: number): (input: string) => Promise<string> {
    return (input: string): Promise<string> => {
      return new Promise<string>(resolve => {
        setTimeout(() => {
          resolve(input);
        }, timeInMs);
      });
    };
  }
  public buildSingleParamFixedTimeCheckedPromise(timeInMs: number): (input: string) => Promise<string> {
    return (input: string): Promise<string> => {
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
