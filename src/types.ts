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
  parent?: ParseToken;
}

// A valid single tag
export interface SingleTag {
  single: boolean;
  name: string;
  rawText: string;
  params?: Record<string, any>;
}

// A valid double tag
export interface DoubleTag {
  double: boolean;
  name: string;
  firstTagText: string;
  secondTagText: string;
  rawText: string;
  children?: ParseToken[];
  params?: Record<string, any>;
}

export interface ScanToken {
  name: string;
  tag: string;
  single?: boolean;
  double?: boolean;
}
