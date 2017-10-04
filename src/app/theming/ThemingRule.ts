export interface ThemingRule {
  selector?: string;
  attribute?: string;
  variable?: string;
  directSelector?: boolean;
  directAttributes?: boolean;
  directVariable?: boolean;
  defaultValue?: any;
  autoApply?: boolean;
}
