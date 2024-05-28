import { Injectable } from '@angular/core';
import { Resizable, TuNode } from '@tapiz/board-commons';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ResizeService {
  public readonly startEvent = new Subject<TuNode<Partial<Resizable>>>();
  public readonly resizeEvent = new Subject<TuNode<Partial<Resizable>>>();

  public get onStart$() {
    return this.startEvent.asObservable();
  }

  public get onResize$() {
    return this.resizeEvent.asObservable();
  }
}
