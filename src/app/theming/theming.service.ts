import { Injectable } from '@angular/core';
import {BehaviorSubject} from "rxjs/BehaviorSubject";
import {Theme} from "./Theme";
import {ThemingRule} from "./ThemingRule";
import {DomSanitizer} from "@angular/platform-browser";
import {Http} from "@angular/http";

declare const firebase: any;
declare const firebaseConnection: any;
const THEME_NAMES_URL = firebaseConnection.databaseURL+'/themes.json?shallow=true';

@Injectable()
export class ThemingService {

  private user: string;
  private lastTheme: Theme = this.makeTheme();
  private _selectedTheme: BehaviorSubject<Theme> = new BehaviorSubject(this.lastTheme);
  private themeRef;
  private userCustomRef;
  private userThemeRef;
  private themingRules: { [name: string]: ThemingRule } = {};


  constructor(private sanitizer: DomSanitizer, private http: Http) {
    const elem = document.createElement('style');
    elem.id = 'theming-service-style';
    document.head.appendChild(elem);
    this._selectedTheme.subscribe(theme => this.doAutoApply(theme));
    let theme: any = window.localStorage.getItem("theme");
    if (theme) {
      try {
        theme = JSON.parse(theme);
        this.selectTheme(theme.name, false, this.makeTheme(theme, theme.name));
      } catch (e) {
        console.error('Could not load saved theme data. Trying by name.');
        this.selectTheme(theme, false);
      }

    }
  }

  static get emptyTheme(): Theme {
    return {
      properties: {},
      name: 'empty',
      description: 'empty theme',
      getCssRules() {return '';},
      getCss() {return '';},
      links: []
    };
  }

  private makeTheme(theme: any = {}, themeName: string = "default"): Theme {
    const service = this;
    if (!themeName) themeName = "default";
    if (!theme) theme = {};
    theme.name = themeName;
    if (!theme.properties) theme.properties = {};
    theme.getCss = function (...propertyNames) {
      return service.getCss(this, propertyNames, false);
    };
    theme.getCssRules = function (...propertyNames) {
      return service.getCss(this, propertyNames, true);
    };
    return theme;
  }

  setThemingRules(themingRules: { [name: string]: ThemingRule }) {
    if (!themingRules) themingRules = {};
    Object.assign(this.themingRules, themingRules);
    this._selectedTheme.next(this.lastTheme);
  }

  setUser(user: string) {
    if (user === this.user) return;
    this.user = user;
    if (this.userThemeRef) this.userThemeRef.off();
    if (!user) return;
    this.userThemeRef = firebase.database().ref(`users/${user}/themes/selectedΤheme`);
    this.userThemeRef.on('value', snap => {
      this.selectTheme(snap.val(), false);
    }, error => {
      console.error(error);
    });
  }



  selectTheme(themeName: string, setIt = true, preloaded?: Theme) {
    // if (!this._selectedTheme.hasError) {
    //   const currentTheme = this._selectedTheme.value;
    //   if (currentTheme  && themeName === currentTheme.name) return;
    // }

    if (this.themeRef) this.themeRef.off();
    if (this.userCustomRef) this.userCustomRef.off();
    if (preloaded) {
      this._selectedTheme.next(preloaded);
    }
    this.themeRef = firebase.database().ref("themes/"+themeName);
    this.themeRef.on('value', snap => {
      const theme: Theme = this.makeTheme(snap.val(), themeName);

      if (this.user) {
        if (setIt) {
          firebase.database().ref(`users/${this.user}/themes/selectedΤheme`).set(themeName).then(() => {
            this.userCustomRef = firebase.database().ref(`users/${this.user}/themes/customization/${themeName}`);
            this.userCustomRef.on('value', cuSnap => {
              let customization = cuSnap.val();
              if (!customization) customization = {};
              Object.assign(customization, theme.properties);
              theme.properties = customization;
              this.lastTheme = theme;
              this._selectedTheme.next(theme);
              window.localStorage.setItem("theme", JSON.stringify(theme));
            });
          }).catch(error => this._selectedTheme.error(error));
        } else {
          this.userCustomRef = firebase.database().ref(`users/${this.user}/themes/customization/${themeName}`);
          this.userCustomRef.on('value', cuSnap => {
            let customization = cuSnap.val();
            if (!customization) customization = {};
            Object.assign(theme.properties, customization);
            this.lastTheme = theme;
            this._selectedTheme.next(theme);
            window.localStorage.setItem("theme", JSON.stringify(theme));
          });
        }
      } else {
        this.lastTheme = theme;
        this._selectedTheme.next(theme);
        window.localStorage.setItem("theme", JSON.stringify(theme));
      }
    });
  }

  get theme(): BehaviorSubject<Theme> {
    return this._selectedTheme;
  }

  doAutoApply(theme: Theme) {
    const props = [];

    for (const property in this.themingRules) {
      if (this.themingRules.hasOwnProperty(property)) {
        const rule = this.themingRules[property];
        if (rule.autoApply) {
          props.push(property);
        } else if (rule.variable || rule.directVariable) {
          let value = theme.properties[property];
          if (!value) value = rule.defaultValue;
          const variable = rule.variable ? rule.variable : property;
          if (value) {
            document.documentElement.style.setProperty(`--${variable}`, value);
          } else {
            document.documentElement.style.removeProperty(`--${variable}`);
          }
        }
      }
    }

    document.getElementById('theming-service-style').innerHTML = this.getCss(theme, props, true, false);
  }

  getCss(theme: Theme, propertyNames: string[], includeSelectors=true, safeStyle=true): any {
    let result = "";

    for (const property of propertyNames) {
      const rule = this.themingRules[property];
      if (rule) {
        let value = theme.properties[property];
        if (!value) value = rule.defaultValue;
        if (value) {
          let attribute;
          if (rule.attribute) {
            attribute = rule.attribute;
          }
          // else if (rule.directAttributes) {
          //   attribute = theme.properties[property];
          // }
          if (includeSelectors) {
            let selector;
            if (rule.selector) {
              selector = rule.selector;
            } else if (rule.directSelector) {
              selector = property;
            }
            if (selector && attribute) {
              result += `${selector} { ${attribute}: ${value}; } `;
            }
          } else {
            result += `${attribute}: ${value}; `;
          }
        }
      }
    }

    if (safeStyle) {
      return this.sanitizer.bypassSecurityTrustStyle(result);
    } else {
      return result;
    }
  }

  getThemeNames(): Promise<string[]> {
    const get: Promise<any> = this.http.get(THEME_NAMES_URL).toPromise();
    return new Promise((resolve, reject) => {
      get.catch(reject).then(res => {
        let themes = res.json();
        if (!themes) themes = {};
        const result = [];
        for (const theme in themes) {
          if (themes.hasOwnProperty(theme)) {
            result.push(theme);
          }
        }
        resolve(result);
      });
    });

  }
}
