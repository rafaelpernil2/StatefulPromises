/* eslint-disable @typescript-eslint/no-explicit-any */
/*tslint:disable:no-any */
export interface ICustomPromise<T> {
  name: string;
  thisArg?: any;
  args?: any[];
  cached?: boolean;
  function(...args: any[]): PromiseLike<T>;
  validate?(response: T): boolean;
  doneCallback?(response: T): T;
  catchCallback?(error: any): any;
  finallyCallback?(response: any): any;
}
