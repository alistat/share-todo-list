import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';

import { NguiAutoCompleteModule } from '@ngui/auto-complete';
import { DragulaModule } from 'ng2-dragula';
import { NguiDatetimePickerModule } from '@ngui/datetime-picker';

import { ThemingModule, ThemeSelectorComponent } from './theming/index';
import { TextModule, TextDialogComponent } from './text/index';

import { AppComponent } from './app.component';
import { TodoListComponent } from './todo-list/todo-list.component';
import { ListService } from './services/list.service';
import { UsersService } from './services/users.service';
import { AuthComponent } from './auth/auth.component';
import { TodoListSelectorComponent } from './todo-list-selector/todo-list-selector.component';
import { ListSharerComponent } from './list-sharer/list-sharer.component';
import { AccountActionComponent } from './account-action/account-action.component';
import { FooterMenuComponent } from './footer-menu/footer-menu.component';

@NgModule({
  declarations: [
    AppComponent,
    TodoListComponent,
    AuthComponent,
    TodoListSelectorComponent,
    ListSharerComponent,
    AccountActionComponent,
    FooterMenuComponent
  ],
  imports: [
    ThemingModule,
    BrowserModule,
    FormsModule,
    HttpModule,
    NguiAutoCompleteModule,
    DragulaModule,
    NguiDatetimePickerModule,
    TextModule
  ],
  providers: [ListService, UsersService],
  bootstrap: [AppComponent, AuthComponent, ThemeSelectorComponent, FooterMenuComponent]
})
export class AppModule { }
