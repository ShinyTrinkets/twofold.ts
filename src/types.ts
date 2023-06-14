export interface LexToken {
  rawText: string;
  name?: string;
  single?: boolean;
  double?: boolean;
  params?: Record<string, any>;
  param_key?: string;
  param_value?: string;
}

export interface ParseToken extends LexToken {
  firstTagText?: string;
  secondTagText?: string;
  children?: ParseToken[];
}
