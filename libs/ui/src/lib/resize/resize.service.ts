import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { ResizeEvent } from './resize.model';

@Injectable({
  providedIn: 'root',
})
export class ResizeService {
  readonly resizeEvent = new Subject<ResizeEvent>();

  get onResize$() {
    return this.resizeEvent.asObservable();
  }
}
