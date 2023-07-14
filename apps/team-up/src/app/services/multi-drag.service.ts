import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
@Injectable({
  providedIn: 'root',
})
export class MultiDragService {
  #mouseMove$ = new BehaviorSubject(null) as BehaviorSubject<MouseEvent | null>;
  #mouseDown$ = new BehaviorSubject(null) as BehaviorSubject<MouseEvent | null>;

  public mouseMove$ = this.#mouseMove$.asObservable();
  public mouseDown$ = this.#mouseDown$.asObservable();

  public updateSharedMouseMove(mouseMove: MouseEvent | null) {
    this.#mouseMove$.next(mouseMove);
  }

  public updateSharedMouseDown(mouseDown: MouseEvent | null) {
    this.#mouseDown$.next(mouseDown);
  }

  public endDrag() {
    this.#mouseMove$.next(null);
    this.#mouseDown$.next(null);
  }
}
