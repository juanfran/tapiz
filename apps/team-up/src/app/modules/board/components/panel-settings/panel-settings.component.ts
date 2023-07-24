import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'team-up-panel-settings',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ],
  templateUrl: './panel-settings.component.html',
  styleUrls: ['./panel-settings.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelSettingsComponent {
  public dialogRef = inject(MatDialogRef);
  public data = inject(MAT_DIALOG_DATA);

  public form = new FormGroup({
    title: new FormControl(),
    color: new FormControl(),
    backgroundColor: new FormControl(),
    fontColor: new FormControl(),
    fontSize: new FormControl(),
    borderColor: new FormControl(),
    borderWidth: new FormControl(),
    borderRadius: new FormControl(),
  });

  public submit() {
    this.dialogRef.close(this.form.value);
  }

  public cancel() {
    this.dialogRef.close(false);
  }

  constructor() {
    this.form.patchValue(this.data.panel);
  }
}
