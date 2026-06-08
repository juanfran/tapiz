import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PreviewModeService {
  enabled = signal(false);
}
