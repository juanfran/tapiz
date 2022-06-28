import { Injectable } from '@angular/core';
@Injectable({
  providedIn: 'root',
})
export class GoogleAuthService {
  public init() {
    this.initScript();
  }
  public initScript() {
    const node = document.createElement('script');

    node.src = 'https://accounts.google.com/gsi/client';
    node.async = true;

    document.head.appendChild(node);
  }
}
