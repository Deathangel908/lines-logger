export interface Logger {
  warn: DoLog;
  log: DoLog;
  error: DoLog;
  debug: DoLog;
  trace: DoLog;
}

export interface DoLog {
  (format: string, ...args: unknown[]): () => void;
}


/**
 * log_raise_error:
 *    log all, raise an error if mismatch amount of arguments
 *
 * log_with_warnings:
 *    log all, print a warning when mismatch amount of arguments
 *
 * trace:
 *    log all
 *
 * debug:
 *    hide: trace
 *    print: debug, info, warn, error
 *
 * info:
 *    print: info, warn, error
 *    hide: trace, debug
 *
 * warn:
 *    print: warn, error
 *    hide: trace, debug, info
 *
 * error:
 *    print: error
 *    hide: trace, debug, info, warn
 *
 * disable_logs:
 *    completely disable all loggin functions
 */
export type LogLevel = 'log_raise_error'|'log_with_warnings'|'trace'|'debug'|
    'info'|'warn'|'error'|'disable';

/**
 * Interface represents window.console and its methods used by this API
 */
export interface MockConsole {
  trace(message?: unknown, ...optionalParams: unknown[]): void;
  debug(message?: unknown, ...optionalParams: unknown[]): void;
  log(message?: unknown, ...optionalParams: unknown[]): void;
  warn(message?: unknown, ...optionalParams: unknown[]): void;
  error(message?: unknown, ...optionalParams: unknown[]): void;
}

/**
 * Factory class for {@see Logger}
 */
export class LoggerFactory {
  /**
   * Current logging level
   */
  private logLevel: LogLevel;

  /**
   * Current console that's triggered
   */
  private mockConsole: MockConsole;

  private readonly levels: Record<LogLevel, number> = {
    log_raise_error: 1,
    log_with_warnings: 2,
    trace: 3,
    debug: 4,
    info: 5,
    warn: 6,
    error: 7,
    disable: 8,
  };
  /**
   * @param logLevel - initial logging level
   * @param mockConsole - console object that will be triggered, default to
   * `window.console`
   */
  constructor(
      logLevel: LogLevel = 'log_with_warnings',
      mockConsole: MockConsole|null = null) {
    this.logLevel = logLevel;
    if (!this.levels[logLevel]) {
      throw Error(`Invalid log level ${logLevel} allowed: ${
          JSON.stringify(this.levels)}`);
    }
    if (mockConsole) {
      this.mockConsole = mockConsole;
    } else {
      this.mockConsole = console;
    }
  }

  private dummy() {}

  setLogWarnings(logWarnings: LogLevel): void {
    this.logLevel = logWarnings;
  }

  getLogWarnings(): LogLevel {
    return this.logLevel;
  }

  /**
   * @return Single log function that can be called, e.g.
   * getSingleLogger(...)('hello wolrd')
   * @param name - badge string, that every log will be marked with
   * @param color - css color of badge, e.g. #FFFAAA
   * @param fn - binded function that will be called eventually, e.g.
   * console.log
   */
  getSingleLoggerColor(name: string, color: string, fn: Function): DoLog {
    return this.getSingleLoggerStyle(name, this.getColorStyle(color), fn);
  }

  /**
   * @return Single log function that can be called, e.g.
   * getSingleLogger(...)('hello wolrd')
   * @param name - badge string, that every log will be marked with
   * @param fn - binded function that will be called eventually, e.g.
   * console.log
   */
  getSingleLogger(name: string, fn: Function): DoLog {
    const color = this.getRandomColor(name);
    return this.getSingleLoggerStyle(name, this.getColorStyle(color), fn);
  }

  /**
   * @return Single log function that can be called, e.g.
   * getSingleLogger(...)('hello wolrd')
   * @param fn - binded function that will be called eventually, e.g.
   * console.log
   * @param name - badge string, that every log will be marked with
   * @param minLevel - initial logging level, .e.g 2
   * @param style - css style, e.g. `font-size: 10px; border-color: red`
   */
  getSingleLoggerStyle(
      name: string, style: string, fn: Function,
      minLevel: LogLevel = 'log_with_warnings'): DoLog {
    return (...args1: unknown[]) => {
      if (this.levels[this.logLevel] > this.levels[minLevel]) {
        return this.dummy;
      }
      const args = Array.prototype.slice.call(args1);
      const parts = args.shift().split('{}');
      /* tslint:disable:no-any */
      // TODO
      const params: any[any] = [this.mockConsole, '%c' + name, style];
      /* tslint:enable:no-any */
      for (let i = 0; i < parts.length; i++) {
        params.push(parts[i]);
        if (typeof args[i] !== 'undefined') {  // args can be '0'
          params.push(args[i]);
        }
      }
      if (parts.length - 1 !== args.length) {
        if (this.logLevel === 'log_with_warnings') {
          this.mockConsole.error('MissMatch amount of arguments');
        } else if (this.logLevel === 'log_raise_error') {
          throw new Error('MissMatch amount of arguments');
        }
      }
      return Function.prototype.bind.apply(fn, params);
    };
  }

  /**
   * @return logger with badged tag
   * @param name - badge string, that every log will be marked with
   * @param color - css color of badge, e.g. #FFFAAA
   */
  getLoggerColor(name: string, color: string): Logger {
    return this.getLoggerStyle(name, this.getColorStyle(color));
  }

  /**
   * @return css for badge
   * @param color - css color, e.g. #FFFAAA
   */
  getColorStyle(color: string): string {
    return `color: white; background-color: ${
        color}; padding: 2px 6px; border-radius: 2px; font-size: 10px`;
  }

  /**
   * Hash function from https://stackoverflow.com/a/52171480/3872976
   */
  static getHash(str: string, seed = 0) {
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for (let i = 0, ch; i < str.length; i++) {
      ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
  }

  getRandomColor(str: string = '') {
    const hash = LoggerFactory.getHash(str);
    let color = '#';
    let rgb = [];
    let sum = 0;
    for (let i = 0; i < 3; i++) {
      const value = (hash >> (i * 8)) & 0xFF;
      rgb.push(value);
      sum += value;
    }
    if (sum > 200) {
      const reduc6 = Math.floor(sum / 6);
      rgb = rgb.map(r => r > reduc6 ? r - reduc6 : 0);
    }
    rgb.forEach(c => {
      color += ('00' + c.toString(16)).substr(-2);
    });
    return color;
  }

  /**
   * @return a logger object with generated colored tag by hash of name
   * @param name - badge string, that every log will be marked with
   */
  getLogger(name: string) {
    return this.getLoggerColor(name, this.getRandomColor(name));
  }

  /**
   * @return a logger object
   * @param name - badge string, that every log will be marked with
   * @param style - css style, e.g. `font-size: 10px; border-color: red`
   */
  getLoggerStyle(name: string, style: string): Logger {
    return {
      trace: this.getSingleLoggerStyle(name, style, this.mockConsole.trace, 'trace'),
      debug: this.getSingleLoggerStyle(name, style, this.mockConsole.debug, 'debug'),
      log: this.getSingleLoggerStyle(name, style, this.mockConsole.log, 'info'),
      warn: this.getSingleLoggerStyle(name, style, this.mockConsole.warn, 'warn'),
      error: this.getSingleLoggerStyle(name, style, this.mockConsole.error, 'error'),
    };
  }
}
