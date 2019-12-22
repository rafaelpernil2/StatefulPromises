/*tslint:disable:no-any */
export interface ICustomPromise<T> {
  name: string;
  thisArg?: any;
  args?: any[];
  lazyMode?: boolean;
  function(...args: any[]): PromiseLike<T>;
  validate?(response: T): boolean;
  doneCallback?(data: T): T;
  catchCallback?(error: any): any;
}
