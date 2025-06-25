// The result of lexing a text string
export type LexToken = {
  index: number;
  rawText: string;
  name?: string;
  single?: boolean;
  double?: boolean;
  params?: Record<string, any>;
  rawParams?: Record<string, string>;
  param_key?: string;
  param_value?: string;
};

// The result of parsing a text string
export type ParseToken = {
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
};

// A valid single tag
export type SingleTag = {
  index: number;
  path: string;
  single: boolean;
  name: string;
  rawText: string;
  params?: Record<string, any>;
  rawParams?: Record<string, string>;
  parent?: Record<string, any>;
};

// A valid double tag
export type DoubleTag = {
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
};

export type ScanToken = {
  name: string;
  tag: string;
  single?: boolean;
  double?: boolean;
};

type BaseConfig = {
  openTag?: string;
  closeTag?: string;
  openExpr?: string;
  closeExpr?: string;
  lastStopper?: string;
};

export type Config = {
  depth?: number;
  glob?: string;
  onlyTags?: Set<string>;
  skipTags?: Set<string>;
} & BaseConfig;

export type ConfigFull = {
  openTag: string;
  closeTag: string;
  openExpr: string;
  closeExpr: string;
  lastStopper: string;
  depth: number;
  glob: string;
  onlyTags: Set<string>;
  skipTags: Set<string>;
};

export type RuntimeFile = {
  // The file name
  fname?: string;
  // Directory name
  dname?: string;
  size: number;
  hash?: string;
  ctime?: Date;
  mtime?: Date;
  // Is this file locked?
  locked?: boolean;
};

export type RuntimeState = {
  running: boolean;
  started?: Date;
  stopped?: Date;
};

type Function = (...args: any[]) => any;

export type Runtime = {
  file: RuntimeFile;
  ast: ParseToken[];
  // The current Node being processed
  node: ParseToken;
  state: RuntimeState;
  config: ConfigFull;
  globalCtx: Record<string, any>;
  customTags: Readonly<Record<string, Function>>;
  allFunctions: Readonly<Record<string, any>>;
  // Functions
  write: Function;
  evaluateAll: Function;
  evaluateTag: Function;
  // Allow any number of additional function properties
  [key: string]: Function | any;
};

// Type signature for TwoFold tag functions
export type TwoFoldTag = (
  text: string,
  args: Record<string, any>,
  meta: Runtime
) => void | string | Promise<void> | Promise<string>;

// Type signature for TwoFold function wrappers
export type TwoFoldWrap = {
  fn: TwoFoldTag;
  evalOrder?: number;
  description?: string;
};
