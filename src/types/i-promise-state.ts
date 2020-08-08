import { PromiseStatus } from './promise-status';

export interface IPromiseState {
  promiseStatus?: PromiseStatus;
  afterProcessingStatus?: PromiseStatus;
}
