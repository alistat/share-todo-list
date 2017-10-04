import {ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {ThemingService} from "../theming";
import {Theme} from "../theming";
import {DomSanitizer} from "@angular/platform-browser";

@Component({
  selector: 'app-footer-menu',
  templateUrl: './footer-menu.component.html',
  styleUrls: ['./footer-menu.component.sass']
})
export class FooterMenuComponent implements OnInit {

  theme: Theme;

  constructor(private uiUpdater: ChangeDetectorRef,
              private themingService: ThemingService) { }

  ngOnInit() {
    this.themingService.theme.subscribe(theme => {
      this.theme = theme;
      this.uiUpdater.detectChanges();
    });
  }

  get aboutTheme() {
    if (!this.theme || !this.theme.description) return '';
    return `
      <div style="text-align: center">
        <h3 style="color: #735b7e;margin: 1.5rem 0 1rem;">About Theme "${this.theme.name}"</h3>
        <section>
        ${this.theme.description}
        </section>
      </div>
    `;
  }
}
