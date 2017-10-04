import {SafeStyle} from "@angular/platform-browser";

export interface Theme {
  properties: any;
  name: string;
  description: string;
  links: string[];

  getCss(...propertyNames): SafeStyle;
  getCssRules(...propertyNames): SafeStyle;
}
