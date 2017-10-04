import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpModule } from "@angular/http";
import { ThemeSelectorComponent } from './theme-selector/theme-selector.component';
import { ThemingService } from "./theming.service";
import {Theme} from "./Theme";

@NgModule({
  imports: [
    CommonModule,
    HttpModule,
    FormsModule
  ],
  providers: [ThemingService],
  declarations: [ThemeSelectorComponent],
  exports: [ThemeSelectorComponent]
})
export class ThemingModule { }
