import {ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {ThemingService} from "../theming.service";

@Component({
  selector: 'app-theme-selector',
  templateUrl: './theme-selector.component.html',
  styleUrls: ['./theme-selector.component.sass']
})
export class ThemeSelectorComponent implements OnInit {

  themes: string[];
  selected: string;
  trackOnChange = true;

  constructor(private themingService: ThemingService,
              private uiUpdater: ChangeDetectorRef) { }

  ngOnInit() {
    this.themingService.getThemeNames().catch(console.log.bind(console)).then(themes => {
      this.themes = themes;
      this.uiUpdater.detectChanges();
      window.setTimeout(() => this.trackOnChange = true, 1000);
    });
    this.themingService.theme.subscribe(theme => {
      this.selected = theme.name;
      this.uiUpdater.detectChanges();
    });
  }

  onChange() {
    if (this.trackOnChange && this.selected) {
      this.themingService.selectTheme(this.selected);
    }
  }

}
