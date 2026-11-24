import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConfigService } from '../../../../services/config.service';
import { LoginComponent } from './login.component';

function component(fetchResponse: () => Promise<Response>) {
  vi.stubGlobal('fetch', vi.fn(fetchResponse));
  TestBed.configureTestingModule({
    providers: [
      { provide: ConfigService, useValue: { config: { API_URL: '/api' } } },
    ],
  });
  return TestBed.runInInjectionContext(() => new LoginComponent());
}

afterEach(() => {
  TestBed.resetTestingModule();
  vi.unstubAllGlobals();
});

describe('Login providers', () => {
  it('does not show an unverified Google provider while discovery is pending', async () => {
    let resolve!: (response: Response) => void;
    const login = component(
      () =>
        new Promise<Response>((done) => {
          resolve = done;
        }),
    );
    const pending = login.ngOnInit();
    expect(login.providers()).toBeNull();
    resolve({
      ok: true,
      json: async () => ({ google: false, oidc: true, oidcLabel: 'SSO' }),
    } as Response);
    await pending;
    expect(login.providers()).toEqual({
      google: false,
      oidc: true,
      oidcLabel: 'SSO',
    });
    expect(login.providersError()).toBe(false);
  });

  it('shows an error instead of a dead provider if discovery fails', async () => {
    const login = component(() => Promise.reject(new Error('Unavailable')));
    await login.ngOnInit();
    expect(login.providers()).toBeNull();
    expect(login.providersError()).toBe(true);
  });

  it('shows an error when provider discovery returns an error status', async () => {
    const login = component(async () => ({ ok: false }) as Response);
    await login.ngOnInit();
    expect(login.providers()).toBeNull();
    expect(login.providersError()).toBe(true);
  });
});
