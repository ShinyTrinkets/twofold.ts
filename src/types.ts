export interface LexToken {
  index: number;
  rawText: string;
  name?: string;
  single?: boolean;
  double?: boolean;
  params?: Record<string, any>;
  rawParams?: Record<string, string>;
  param_key?: string;
  param_value?: string;
}

export interface ParseToken {
  index: number;
  path?: string;
  name?: string;
  rawText: string;
  single?: boolean;
  double?: boolean;
  params?: Record<string, any>;
  rawParams?: Record<string, string>;
  firstTagText?: string;
  secondTagText?: string;
  children?: ParseToken[];
  parent?: ParseToken;
}

// A valid single tag
export interface SingleTag {
  index: number;
  path?: string;
  single: boolean;
  name: string;
  rawText: string;
  params?: Record<string, any>;
  rawParams?: Record<string, string>;
  parent?: ParseToken;
}

// A valid double tag
export interface DoubleTag {
  index: number;
  path?: string;
  double: boolean;
  name: string;
  firstTagText: string;
  secondTagText: string;
  children?: ParseToken[];
  params?: Record<string, any>;
  rawParams?: Record<string, string>;
  parent?: ParseToken;
}

export interface ScanToken {
  name: string;
  tag: string;
  single?: boolean;
  double?: boolean;
}
