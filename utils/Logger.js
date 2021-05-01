/* —————————————— Copyright (c) 2021 1Lighty, All rights reserved ——————————————
*
* Base logger class
* Source code belongs to Astra client mod, ported to js from ts
*
* ————————————————————————————————————————————————————————————————————————————— */

module.exports.Logger = class Logger {
  // prefixes: string[];
  /* OVERLOADS */
  // constructor(prefixes?: string[]);
  // constructor(prefixes?: string);
  /* OVERLOADS */
  constructor(prefixes/* ?: string[] | string */) {
    this.prefixes = Array.isArray(prefixes) ? prefixes : prefixes ? [prefixes] : [];
  }
  log(...args/* : any[] */)/* : void */ {
    this._log('log', args);
  }
  warn(...args/* : any[] */)/* : void */ {
    this._log('warn', args);
  }
  error(...args/* : any[] */)/* : void */ {
    this._log('error', args);
  }
  /* private  */_log(type/* : string */, args/* : any[] */)/* : void */ {
    console[type](`%c[DiscordCrasherChecker]${this.prefixes.map(p => `[${p}]`).join('')}`, 'color: #7289da', ...args);
  }
};
