import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  ViewChild,
  effect,
  inject,
} from '@angular/core';

import { MatIconModule } from '@angular/material/icon';
import { MenuItem } from './menu-item.model';
import type { Editor } from '@tiptap/core';
import { lighter } from '@team-up/cdk/utils/colors';
import {
  CdkMenu,
  CdkMenuItem,
  CdkMenuItemRadio,
  CdkMenuGroup,
  CdkMenuTrigger,
} from '@angular/cdk/menu';
import { Level } from '@tiptap/extension-heading';
import { Observable, filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NodeToolbar } from './node-toolbar.model';
import { TuNode } from '@team-up/board-commons';
import { Store } from '@ngrx/store';
import { BoardActions } from '@team-up/board-commons/actions/board.actions';
import { input } from '@angular/core';

@Component({
  selector: 'team-up-toolbar',
  template: `
    @for (menuItem of menuItems; track $index) {
      <div [className]="'type-' + menuItem.type">
        @switch (menuItem.type) {
          @case ('divider') {
            <div class="divider"></div>
          }
          @case ('icon') {
            <button
              [title]="menuItem.name"
              [disabled]="!menuItem.enabled"
              [class.active]="menuItem.active()"
              (click)="menuItem.command()">
              <mat-icon>{{ menuItem.icon }}</mat-icon>
            </button>
          }
          @case ('color') {
            <label
              [title]="menuItem.name"
              for="color-picker">
              <div
                class="color"
                [style.background-color]="menuItem.color().main"
                [style.border-color]="menuItem.color().lighter"></div>
            </label>

            <div class="color-picker">
              <input
                id="color-picker"
                type="color"
                (change)="changeColor($event, menuItem)" />
            </div>
          }
          @case ('select') {
            <button
              [cdkMenuTriggerFor]="menu"
              class="standalone-item">
              {{ menuItem.name }}
            </button>

            <ng-template #menu>
              <div
                class="menu"
                cdkMenu>
                @for (option of menuItem.options; track $index) {
                  @switch (option.type) {
                    @case ('divider') {
                      <div class="select-divider"></div>
                    }
                    @case ('text') {
                      <button
                        [class.active]="menuItem.active(option.value)"
                        (cdkMenuItemTriggered)="menuItem.command(option.value)"
                        cdkMenuItem
                        class="menu-item">
                        {{ option.name }}
                      </button>
                    }
                    @case ('input') {
                      <div class="input-select">
                        <input
                          type="number"
                          max="200"
                          min="1" />
                      </div>
                    }
                  }
                }
              </div>
            </ng-template>
          }
        }
      </div>
    }

    @if (layoutOptions()) {
      <div class="type-icon">
        <button
          title="Layout"
          [cdkMenuTriggerFor]="menuLayout">
          <mat-icon>dashboard</mat-icon>
        </button>

        <ng-template #menuLayout>
          <div
            class="menu-layout"
            cdkMenu>
            <div class="field">
              <label class="color-picker-layout">
                Background color

                <div
                  class="color"
                  [style.background-color]="
                    node().content.backgroundColor ?? '#FFF'
                  ">
                  <div class="color-picker">
                    <input
                      type="color"
                      [value]="node().content.backgroundColor"
                      (change)="updateNode($event, 'backgroundColor')" />
                  </div>
                </div>
              </label>
            </div>

            <div class="field">
              <label class="color-picker-layout">
                Border color

                <div
                  class="color"
                  [style.background-color]="
                    node().content.borderColor ?? '#e8e9ea'
                  ">
                  <div class="color-picker">
                    <input
                      type="color"
                      [value]="node().content.borderColor"
                      (change)="updateNode($event, 'borderColor')" />
                  </div>
                </div>
              </label>
            </div>

            <div class="field">
              <label class="input-layout">
                Border radius

                <input
                  type="number"
                  [value]="node().content.borderRadius ?? 0"
                  (change)="updateNode($event, 'borderRadius')" />
              </label>
            </div>

            <div class="field">
              <label class="input-layout">
                Border width

                <input
                  type="number"
                  [value]="node().content.borderWidth ?? 1"
                  (change)="updateNode($event, 'borderWidth')" />
              </label>
            </div>

            <div class="field">
              <label class="input-layout"> Text aligment </label>

              <div class="buttons">
                <button
                  [class.active]="node().content.textAlign === 'start'"
                  (click)="updateNodeValue('start', 'textAlign')">
                  <mat-icon>vertical_align_top</mat-icon>
                </button>
                <button
                  [class.active]="node().content.textAlign === 'center'"
                  (click)="updateNodeValue('center', 'textAlign')">
                  <mat-icon>vertical_align_center</mat-icon>
                </button>
                <button
                  [class.active]="node().content.textAlign === 'end'"
                  (click)="updateNodeValue('end', 'textAlign')">
                  <mat-icon>vertical_align_bottom</mat-icon>
                </button>
              </div>
            </div>
          </div>
        </ng-template>
      </div>
    }
  `,
  styleUrl: './toolbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    MatIconModule,
    CdkMenuTrigger,
    CdkMenu,
    CdkMenuGroup,
    CdkMenuItemRadio,
    CdkMenuItem,
  ],
})
export class ToolbarComponent implements OnInit, AfterViewInit {
  @ViewChild(CdkMenu) menu?: CdkMenu;

  #cd = inject(ChangeDetectorRef);
  #el = inject(ElementRef);

  #destroyRef = inject(DestroyRef);
  #store = inject(Store);

  editor = input.required<Editor>();
  node = input.required<TuNode<NodeToolbar>>();

  x = input(0);
  y = input(0);

  layoutOptions = input(false);

  closeMenus = input<Observable<unknown>>();

  menuItems: MenuItem[] = [
    {
      type: 'icon',
      command: () => {
        this.editor().chain().focus().toggleBold().run();
      },
      name: 'Bold',
      enabled: true,
      icon: 'format_bold',
      active: () => this.editor().isActive('bold'),
    },
    {
      type: 'icon',
      command: () => {
        this.editor().chain().focus().toggleItalic().run();
      },
      enabled: true,
      name: 'Italic',
      icon: 'format_italic',
      active: () => this.editor().isActive('italic'),
    },
    {
      type: 'icon',
      command: () => {
        this.editor().chain().focus().toggleStrike().run();
      },
      enabled: true,
      name: 'Strike',
      icon: 'strikethrough_s',
      active: () => this.editor().isActive('strike'),
    },
    {
      type: 'divider',
    },
    {
      type: 'select',
      command: (value: string) => {
        if (value === 'raleway') {
          this.editor().commands.unsetFontFamily();

          return;
        }

        this.editor().commands.setFontFamily(`var(--font-${value})`);
      },
      enabled: true,
      name: 'Aa',
      options: [
        {
          type: 'text',
          name: 'Default',
          value: 'raleway',
        },
        {
          type: 'text',
          name: 'Sans',
          value: 'sans',
        },
        {
          type: 'text',
          name: 'Serif',
          value: 'serif',
        },
        {
          type: 'text',
          name: 'Mono',
          value: 'mono',
        },
        {
          type: 'text',
          name: 'Handwriting',
          value: 'handwritting',
        },
      ],
      active: (fontFamily: string) => {
        if (fontFamily === 'raleway') {
          return false;
        }

        return this.editor().isActive('textStyle', {
          fontFamily: `var(--font-${fontFamily})`,
        });
      },
    },
    {
      type: 'divider',
    },
    {
      type: 'select',
      command: (value: string) => {
        if (value) {
          this.editor().commands.toggleHeading({
            level: Number(value) as Level,
          });
        } else {
          this.editor().commands.setParagraph();
        }
      },
      enabled: true,
      get name() {
        return 'Size';
      },
      options: [
        {
          type: 'text',
          name: 'Small',
          value: '',
        },
        {
          type: 'text',
          name: 'Medium',
          value: '3',
        },
        {
          type: 'text',
          name: 'Large',
          value: '2',
        },
        {
          type: 'text',
          name: 'Extra Large',
          value: '1',
        },
      ],
      active: (level: string) => {
        if (!level) {
          return this.editor().isActive('paragraph');
        }

        return this.editor().isActive('heading', { level: Number(level) });
      },
    },
    {
      type: 'divider',
    },
    {
      type: 'icon',
      command: () => {
        this.editor().chain().focus().setTextAlign('left').run();
      },
      enabled: true,
      name: 'Align Left',
      icon: 'format_align_left',
      active: () => this.editor().isActive({ textAlign: 'left' }),
    },
    {
      type: 'icon',
      command: () => {
        this.editor().chain().focus().setTextAlign('center').run();
      },
      enabled: true,
      name: 'Align Center',
      icon: 'format_align_center',
      active: () => this.editor().isActive({ textAlign: 'center' }),
    },
    {
      type: 'icon',
      command: () => {
        this.editor().chain().focus().setTextAlign('right').run();
      },
      enabled: true,
      name: 'Align Right',
      icon: 'format_align_right',
      active: () => this.editor().isActive({ textAlign: 'right' }),
    },
    {
      type: 'divider',
    },
    {
      type: 'icon',
      command: () => {
        this.editor().chain().focus().toggleBulletList().run();
      },
      enabled: true,
      name: 'Bullet list',
      icon: 'format_list_bulleted',
      active: () => this.editor().isActive('bulletList'),
    },
    {
      type: 'icon',
      command: () => {
        this.editor().chain().focus().toggleOrderedList().run();
      },
      enabled: true,
      name: 'Ordered list',
      icon: 'format_list_numbered',
      active: () => this.editor().isActive('orderedList'),
    },
    {
      type: 'divider',
    },
    {
      type: 'icon',
      command: () => {
        const previousUrl = this.editor().getAttributes('link')['href'] ?? '';

        const url = prompt('Link url', previousUrl);

        if (url === null) {
          return;
        }

        // unset link
        if (url === '') {
          this.editor()
            .chain()
            .focus()
            .extendMarkRange('link')
            .unsetLink()
            .run();

          return;
        }

        // update link
        this.editor()
          .chain()
          .focus()
          .extendMarkRange('link')
          .setLink({ href: url })
          .run();
      },
      enabled: true,
      name: 'Link',
      icon: 'link',
      active: () => this.editor().isActive('link'),
    },
    {
      type: 'color',
      command: (color: string) => {
        this.editor().chain().focus().setColor(color).run();
      },
      enabled: true,
      name: 'Font color',
      color: () => {
        const color =
          this.editor().getAttributes('textStyle')['color'] ?? '#000000';

        return {
          main: color,
          lighter: lighter(color, 30),
        };
      },
    },
  ];

  changeColor(event: Event, menuItem: MenuItem) {
    const target = event.target as HTMLInputElement;

    if (menuItem.type !== 'divider') {
      menuItem.command(target.value);
    }
  }

  ngOnInit(): void {
    this.editor().on('transaction', () => {
      this.#cd.detectChanges();
    });

    this.closeMenus()
      ?.pipe(
        takeUntilDestroyed(this.#destroyRef),
        filter(() => !!this.menu),
      )
      .subscribe(() => {
        if (document.activeElement) {
          (document.activeElement as HTMLElement).blur();
        }
        document.body.focus();
      });
  }

  updateNode(event: Event, key: keyof NodeToolbar) {
    const target = event.target as HTMLInputElement;

    const isNumber = target.type === 'number';

    this.#store.dispatch(
      BoardActions.batchNodeActions({
        history: true,
        actions: [
          {
            op: 'patch',
            data: {
              id: this.node().id,
              type: this.node().type,
              content: {
                [key]: isNumber ? Number(target.value) : target.value,
              },
            },
          },
        ],
      }),
    );
  }

  updateNodeValue(value: string, key: keyof NodeToolbar) {
    this.#store.dispatch(
      BoardActions.batchNodeActions({
        history: true,
        actions: [
          {
            op: 'patch',
            data: {
              id: this.node().id,
              type: this.node().type,
              content: {
                [key]: value,
              },
            },
          },
        ],
      }),
    );
  }

  constructor() {
    effect(() => {
      this.#refreshPositon(this.x(), this.y());
    });
  }

  ngAfterViewInit(): void {
    this.#refreshPositon(this.x(), this.y());
  }

  #refreshPositon(positionX: number, positionY: number) {
    const x = positionX - this.#el.nativeElement.offsetWidth / 2;

    this.#el.nativeElement.style.transform = `translate(${x}px, ${
      positionY - 40
    }px)`;
  }
}
