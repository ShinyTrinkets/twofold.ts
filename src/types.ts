// The result of lexing a text string
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

// The result of parsing a text string
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
  parent?: Record<string, any>;
}

// A valid single tag
export interface SingleTag {
  index: number;
  path: string;
  single: boolean;
  name: string;
  rawText: string;
  params?: Record<string, any>;
  rawParams?: Record<string, string>;
  parent?: Record<string, any>;
}

// A valid double tag
export interface DoubleTag {
  index: number;
  path: string;
  double: boolean;
  name: string;
  firstTagText: string;
  secondTagText: string;
  children?: ParseToken[];
  params?: Record<string, any>;
  rawParams?: Record<string, string>;
  parent?: Record<string, any>;
}

export interface ScanToken {
  name: string;
  tag: string;
  single?: boolean;
  double?: boolean;
}

export interface Config {
  openTag?: string;
  closeTag?: string;
  openExpr?: string;
  closeExpr?: string;
  lastStopper?: string;
}

export interface ConfigFull {
  openTag: string;
  closeTag: string;
  openExpr: string;
  closeExpr: string;
  lastStopper: string;
}

export interface CliConfig extends Config {
  depth?: number;
  glob?: string;
}

export interface CliConfigFull extends Config {
  depth: number;
  glob: string;
}

export interface EvalMeta {
  root?: string;
  fname?: string;
  config?: Config;
  node?: ParseToken;
  ctx?: Record<string, any>;
}

export interface EvalMetaFull {
  root: string;
  fname: string;
  config: ConfigFull;
  node: ParseToken;
  ctx: Record<string, any>;
}

// Type signature for TwoFold tag functions
export type TwoFoldTag = (
  text: string,
  args: Record<string, any>,
  meta: EvalMetaFull
) => void | string | Promise<void> | Promise<string>;

// Type signature for TwoFold function wrappers
export interface TwoFoldWrap {
  fn: TwoFoldTag;
  evalOrder?: number;
  description?: string;
}

export interface TwoFoldAddon {
  name: string;
  preEval?: Function;
  postEval?: Function;
  preChildren?: Function;
}
