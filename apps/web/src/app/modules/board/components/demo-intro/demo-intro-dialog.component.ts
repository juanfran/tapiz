import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';

@Component({
  selector: 'tapiz-demo-intro-dialog',
  standalone: true,
  imports: [MatButtonModule, MatDialogModule, NgOptimizedImage],
  template: `
    <div class="logo">
      <img
        ngSrc="/assets/svg/logo.webp"
        alt="Tapiz logo"
        width="75"
        height="78" />
    </div>

    <h1>Welcome to Tapiz!</h1>

    <p>
      Explore Tapiz's features directly in your browser through this demo. For
      the complete experience, including real-time collaboration, we recommend
      installing the app. Detailed installation instructions are available in
      our
      <a
        target="_blank"
        href="https://github.com/juanfran/tapiz/blob/main/docs/INSTALL.md"
        >GitHub repository</a
      >.
    </p>
    <p>Thank you for trying Tapiz!</p>

    <div class="actions">
      <button
        type="button"
        mat-flat-button
        mat-dialog-close
        color="primary">
        Try Tapiz
      </button>
    </div>
  `,
  styleUrl: './demo-intro-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DemoIntroDialogComponent {}
