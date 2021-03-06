import { PromiseStatus } from './promise-status';
export type IStatefulResponse<T> = {
  status: PromiseStatus;
  value: T;
};
