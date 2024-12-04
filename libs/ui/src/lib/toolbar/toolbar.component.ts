import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  afterNextRender,
  inject,
} from '@angular/core';
import type { Editor } from '@tiptap/core';
import { NodeToolbar } from './node-toolbar.model';
import { TuNode } from '@tapiz/board-commons';
import { input } from '@angular/core';
import { OptionFormatComponent } from './options/format/option-format.component';
import { OptionFontComponent } from './options/font/option-font.component';
import { OptionSizeComponent } from './options/size/option-size.component';
import { OptionAlignComponent } from './options/align/option-align.component';
import { OptionListComponent } from './options/list/option-list.component';
import { ToolbarEditorService } from './toolbar-editor.service';
import { OptionLayoutComponent } from './options/layout/option-layout.component';
import { OptionHeadingComponent } from './options/heading/option-heading.component';

@Component({
  selector: 'tapiz-toolbar',
  template: `
    <tapiz-toolbar-option-format [editor]="editor()" />
    <tapiz-toolbar-option-font [editor]="editor()" />
    @if (fontSize()) {
      <tapiz-toolbar-option-size [editor]="editor()" />
      <tapiz-toolbar-option-heading [editor]="editor()" />
    }
    <tapiz-toolbar-option-align [editor]="editor()" />
    <tapiz-toolbar-option-list [editor]="editor()" />

    @if (layoutOptions()) {
      <tapiz-toolbar-option-layout [node]="node()" />
    }
  `,
  styleUrl: './toolbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    OptionFormatComponent,
    OptionFontComponent,
    OptionSizeComponent,
    OptionHeadingComponent,
    OptionAlignComponent,
    OptionListComponent,
    OptionLayoutComponent,
    OptionHeadingComponent,
  ],
  providers: [ToolbarEditorService],
})
export class ToolbarComponent {
  #cd = inject(ChangeDetectorRef);

  #toolbarEditorService = inject(ToolbarEditorService);

  editor = input.required<Editor>();
  node = input.required<TuNode<NodeToolbar>>();

  x = input(0);
  y = input(0);

  layoutOptions = input(false);
  fontSize = input(false);

  constructor() {
    afterNextRender(() => {
      this.editor().on('transaction', () => {
        this.#cd.detectChanges();
      });

      this.#toolbarEditorService.listenToEditor(this.editor);
    });
  }
}
