import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TextDialogComponent } from './text-dialog/text-dialog.component';
import { TextService } from './text.service';
import { CDialogButtonComponent } from './c-dialog-button/c-dialog-button.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule
  ],
  declarations: [TextDialogComponent, CDialogButtonComponent],
  exports: [TextDialogComponent, CDialogButtonComponent],
  providers: [TextService]
})
export class TextModule { }
