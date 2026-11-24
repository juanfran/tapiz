import { ɵresolveComponentResources } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { ConfigService } from '../../../../services/config.service';
import { AuthProviders, LoginComponent } from './login.component';
import template from './login.component.html?raw';

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

describe('Login buttons', () => {
  beforeAll(async () => {
    // Vitest runs Angular in JIT mode without the Angular plugin, so the
    // component's templateUrl is resolved here with the real template.
    await ɵresolveComponentResources(async (url: string) =>
      url.endsWith('.html') ? template : '',
    );
  });

  async function render(discovery: () => Promise<Response>) {
    vi.stubGlobal('fetch', vi.fn(discovery));
    TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: ConfigService, useValue: { config: { API_URL: '/api' } } },
      ],
    });
    TestBed.inject(MatIconRegistry).addSvgIconLiteral(
      'google',
      TestBed.inject(DomSanitizer).bypassSecurityTrustHtml('<svg></svg>'),
    );
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    // Let ngOnInit's provider discovery settle before rendering again.
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    return {
      login: fixture.componentInstance,
      element,
      buttons: () =>
        Array.from(element.querySelectorAll('button')).map((button) => ({
          button,
          label: button.textContent?.trim(),
        })),
    };
  }

  const providers = (value: AuthProviders) => async () =>
    ({ ok: true, json: async () => value }) as Response;

  it('shows only a loading message while discovery is pending', async () => {
    const { element, buttons } = await render(
      () => new Promise<Response>(() => undefined),
    );
    expect(element.querySelector('[role="status"]')?.textContent).toContain(
      'Loading sign-in options',
    );
    expect(buttons()).toHaveLength(0);
  });

  it('shows an alert and no buttons when discovery fails', async () => {
    const { element, buttons } = await render(() =>
      Promise.reject(new Error('Unavailable')),
    );
    expect(element.querySelector('[role="alert"]')).not.toBeNull();
    expect(element.querySelector('[role="status"]')).toBeNull();
    expect(buttons()).toHaveLength(0);
  });

  it('renders only the Google button for a Google-only deployment', async () => {
    const { login, buttons } = await render(
      providers({ google: true, oidc: false, oidcLabel: 'SSO' }),
    );
    const loginGoogle = vi
      .spyOn(login, 'loginGoogle')
      .mockImplementation(() => undefined);
    expect(buttons().map((b) => b.label)).toEqual(['Sign in with Google']);
    buttons()[0].button.click();
    expect(loginGoogle).toHaveBeenCalledTimes(1);
  });

  it('renders only the OIDC button with its label for an OIDC-only deployment', async () => {
    const { login, buttons } = await render(
      providers({ google: false, oidc: true, oidcLabel: 'Company SSO' }),
    );
    const loginOidc = vi
      .spyOn(login, 'loginOidc')
      .mockImplementation(() => undefined);
    expect(buttons().map((b) => b.label)).toEqual(['Sign in with Company SSO']);
    buttons()[0].button.click();
    expect(loginOidc).toHaveBeenCalledTimes(1);
  });

  it('renders both buttons when both providers are enabled', async () => {
    const { buttons } = await render(
      providers({ google: true, oidc: true, oidcLabel: 'SSO' }),
    );
    expect(buttons().map((b) => b.label)).toEqual([
      'Sign in with SSO',
      'Sign in with Google',
    ]);
  });
});
