import { Injectable } from '@angular/core';
import { Rotatable, TNode } from '@tapiz/board-commons';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class RotateService {
  public readonly startEvent = new Subject<TNode<Partial<Rotatable>>>();
  public readonly resizeEvent = new Subject<TNode<Partial<Rotatable>>>();

  public get onStart$() {
    return this.startEvent.asObservable();
  }

  public get onRotate$() {
    return this.resizeEvent.asObservable();
  }
}
