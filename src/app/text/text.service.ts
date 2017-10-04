import { Injectable } from '@angular/core';
import {Observable} from "rxjs/Observable";
import {Subject} from "rxjs/Subject";
import {DialogEvent} from "./DialogEvent";

@Injectable()
export class TextService {

  private dialogEmitter: Subject<DialogEvent> = new Subject();

  constructor() { }

  get dialogEvent(): Observable<DialogEvent> {
    return this.dialogEmitter;
  }

  showDialog(name?: string, content?: string, head?: string, trust?: boolean) {
    this.dialogEmitter.next({name, content, head, trust, visible: true});
  }

  hideDialog(name?: string) {
    this.dialogEmitter.next({name, visible: false});
  }

  editDialog(name?: string, content?: string, head?: string, trust?: boolean) {
    this.dialogEmitter.next({name, content, head, trust});
  }
}
