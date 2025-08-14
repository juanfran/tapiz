import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'tapiz-tools',
  imports: [MatButtonModule, MatIconModule, LucideAngularModule],
  templateUrl: './tools.component.html',
  styleUrl: './tools.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToolsComponent {
  selectedTool = output<string>();

  selectedNote() {
    this.selectedTool.emit('selectedNote');
  }

  selectedPanel() {
    this.selectedTool.emit('selectedPanel');
  }

  selectedText() {
    this.selectedTool.emit('selectedText');
  }

  selectedImage() {
    this.selectedTool.emit('selectedImage');
  }

  selectedPoll() {
    this.selectedTool.emit('selectedPoll');
  }

  selectedEstimation() {
    this.selectedTool.emit('selectedEstimation');
  }

  selectedTimer() {
    this.selectedTool.emit('selectedTimer');
  }

  selectedArrow() {
    this.selectedTool.emit('selectedArrow');
  }
}
