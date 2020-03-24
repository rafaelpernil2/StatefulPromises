/* eslint-disable @typescript-eslint/no-explicit-any */
/*tslint:disable:no-any */
export interface IAnyObject {
  [key: string]: string | number | boolean | Function | any | IAnyObject;
}
