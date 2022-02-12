import { Observable } from './observable';

export class CustomObservable<T> extends Observable {
  // This object contains the data to be observed
  private data: T;
  public constructor(data: T) {
    super();
    this.data = data;
  }

  public setValue(data: T): void {
    this.data = data;
    this.notifyObservers();
  }

  public getValue(): T {
    return this.data;
  }
}
