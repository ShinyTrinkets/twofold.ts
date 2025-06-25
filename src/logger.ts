const LEVELS: Record<string, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
};

// The default level is "info"
const LEVEL = LEVELS.info;

export class Logger {
  public name: string;
  private level: number;

  constructor(name: string, level = LEVEL) {
    this.name = name;
    this.level = level;
  }

  getLevel() {
    return this.level;
  }

  setLevel(level: number | string) {
    if (!level) {
      throw new Error(`Invalid log level: ${level}`);
    }

    if (typeof level === 'string' && LEVELS[level]) {
      this.level = LEVELS[level];
    } else if (typeof level === 'number' && level >= 10 && level <= 50) {
      this.level = level;
    } else {
      throw new Error(`Invalid log level: ${level}`);
    }
  }

  _log(logLevel: string, args: any[]) {
    const level = logLevel.toUpperCase();
    if (level === 'WARN') {
      console.warn(this.name, '[WARN]', ...args);
    } else if (level === 'ERROR') {
      console.error(this.name, '[ERROR]', ...args);
    } else {
      console.log(this.name, `[${level}]`, ...args);
    }
  }

  trace(...args: any[]) {
    if (this.level <= LEVELS.trace) {
      this._log('trace', args);
    }
  }

  debug(...args: any[]) {
    if (this.level <= LEVELS.debug) {
      this._log('debug', args);
    }
  }

  info(...args: any[]) {
    if (this.level <= LEVELS.info) {
      this._log('info', args);
    }
  }

  warn(...args: any[]) {
    if (this.level <= LEVELS.warn) {
      this._log('warn', args);
    }
  }

  error(...args: any[]) {
    if (this.level <= LEVELS.error) {
      this._log('error', args);
    }
  }
}

export const log = new Logger('2✂f');
