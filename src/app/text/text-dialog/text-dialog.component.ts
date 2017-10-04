import {ChangeDetectorRef, Component, Input, OnInit} from '@angular/core';
import { DomSanitizer } from "@angular/platform-browser";
import { TextService } from '../text.service';
// import { DialogEvent } from '../DialogEvent';

@Component({
  selector: 'app-text-dialog',
  templateUrl: './text-dialog.component.html',
  styleUrls: ['./text-dialog.component.sass']
})
export class TextDialogComponent implements OnInit {

  _head: string;
  _content: string;
  _visible = false;
  _trust = false;

  _name: string;

  constructor(private textService: TextService,
              private sanitizer: DomSanitizer,
              private uiUpdater: ChangeDetectorRef) { }

  ngOnInit() {
    this.textService.dialogEvent.subscribe(event => {
      const name = event.name ? event.name : 'central';

      if (this._name !== name) return;

      if (event.head !== undefined) {
        this._head = event.head;
      }
      if (event.content !== undefined) {
        this._content = event.content;
      }
      if (event.visible !== undefined) {
        this._visible = event.visible;
      }
      if (event.trust !== undefined) {
        this._trust = event.trust;
      }
      this.uiUpdater.detectChanges();
    });
  }

  @Input()
  set content(content: string) {
    this._content = content;
    this.uiUpdater.detectChanges();
  }

  @Input()
  set head(head: string) {
    this._head = head;
    this.uiUpdater.detectChanges();
  }

  @Input()
  set trust(trust: boolean) {
    this._trust = trust;
    this.uiUpdater.detectChanges();
  }

  @Input()
  set visible(visible: boolean) {
    this._visible = visible;
    this.uiUpdater.detectChanges();
  }

  @Input()
  set name(name: string) {
    this._name = name;
    this.uiUpdater.detectChanges();
  }

  get contentSafe() {
    return this.sanitizer.bypassSecurityTrustHtml(this._content);
  }

  get headSafe() {
    return this.sanitizer.bypassSecurityTrustHtml(this._head);
  }

  onClose() {
    this._visible = false;
    this.uiUpdater.detectChanges();
  }

}
