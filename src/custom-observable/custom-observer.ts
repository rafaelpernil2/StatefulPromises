import { CustomObservable } from './custom-observable';
import { Observer } from './observer';

export class CustomObserver<T> implements Observer {
  private customObservable: CustomObservable<T>;
  private observableValue: T;
  private callback: Function;

  constructor(customObservable: CustomObservable<T>, callback: Function) {
    this.customObservable = customObservable;
    this.observableValue = this.customObservable.getValue();
    this.callback = callback;
  }

  public update(): void {
    this.observableValue = this.customObservable.getValue();
    this.callback();
  }

  public getValue(): T {
    return this.observableValue;
  }
}
