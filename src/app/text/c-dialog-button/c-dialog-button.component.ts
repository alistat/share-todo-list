import {ChangeDetectorRef, Component, Input, OnInit} from '@angular/core';
import {TextService} from "../text.service";
import {DomSanitizer} from "@angular/platform-browser";

@Component({
  selector: 'app-c-dialog-button',
  templateUrl: './c-dialog-button.component.html',
  styleUrls: ['./c-dialog-button.component.sass']
})
export class CDialogButtonComponent implements OnInit {

  _name: string;
  _head: string;
  _content: string;
  _trust = false;
  _buttonStyle: string;

  constructor(private textService: TextService,
              private uiUpdater: ChangeDetectorRef,
              private sanitizer: DomSanitizer) { }

  ngOnInit() {
  }

  @Input()
  set name(name: string) {
    this._name = name;
  }

  @Input()
  set content(content: string) {
    this._content = content;
  }

  @Input()
  set head(head: string) {
    this._head = head;
  }

  @Input()
  set trust(trust: boolean) {
    this._trust = trust;
  }

  @Input()
  set buttonStyle(buttonStyle: string) {
    this._buttonStyle = buttonStyle;
    this.uiUpdater.detectChanges();
  }

  get buttonStyleSafe() {
    return this.sanitizer.bypassSecurityTrustStyle(this._buttonStyle);
  }

  onShow() {
    this.textService.showDialog(this._name, this._content, this._head, this._trust);
  }

}
