import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { ConfigService } from '../../../services/config.service';

export const DemoGuard: CanActivateFn = () => {
  const configService = inject(ConfigService);
  const router = inject(Router);

  if (configService.config.DEMO) {
    return router.parseUrl('/board/demo');
  }

  return true;
};
