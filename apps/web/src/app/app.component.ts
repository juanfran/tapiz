import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';
import './app-node';
import { Store } from '@ngrx/store';

import { appFeature } from './+state/app.reducer';
import { WsService } from './modules/ws/services/ws.service';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ReconnectionComponent } from './shared/reconnection/reconnection.component';
import { GlobalStore } from './+state/global.store';

@Component({
  selector: 'tapiz-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, ReconnectionComponent],
})
export class AppComponent {
  #authService = inject(AuthService);
  #wsService = inject(WsService);
  #store = inject(Store);
  #matIconRegistry = inject(MatIconRegistry);
  #domSanitizer = inject(DomSanitizer);
  #globalStore = inject(GlobalStore);
  #icons = [
    'add',
    'area',
    'coco',
    'cursor',
    'edit',
    'emoji',
    'estimation',
    'group',
    'heart',
    'image',
    'panel',
    'poll',
    'search',
    'text',
    'token',
    'voting',
    'google',
    'user',
    'templates',
    'download',
    'settings',
    'share',
    'add_simple',
    'note',
    'clock',
  ];

  constructor() {
    for (const icon of this.#icons) {
      this.#matIconRegistry.addSvgIcon(
        icon,
        this.#setPath(`assets/svgs/${icon}.svg`),
      );
    }

    this.#store.select(appFeature.selectUserId).subscribe((userId) => {
      if (userId) {
        this.#wsService.listen();
      } else {
        this.#wsService.close();
      }
    });

    this.#authService.configureLogin();
  }

  showReconnection = this.#globalStore.wsConnectionLost;

  #setPath(url: string): SafeResourceUrl {
    return this.#domSanitizer.bypassSecurityTrustResourceUrl(url);
  }
}
