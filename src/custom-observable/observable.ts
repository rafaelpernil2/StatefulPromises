import { Observer } from './observer';

export class Observable {
  private observerList: Set<Observer> = new Set([]);

  public registerObserver(o: Observer): void {
    this.observerList.add(o);
  }

  public unregisterObserver(o: Observer): void {
    this.observerList.delete(o);
  }

  public notifyObservers(): void {
    for (const observer of this.observerList) {
      observer.update();
    }
  }
}
