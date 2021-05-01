/* —————————————— Copyright (c) 2021 1Lighty, All rights reserved ——————————————
 *
 * Call any function and surpress its errors
 * Source code belongs to Astra client mod, ported to js from ts
 *
 * ————————————————————————————————————————————————————————————————————————————— */

// import { makeLogger } from './makeLogger';

const Logger = /* makeLogger('suppressErrors') */new (require('./Logger').Logger)('SuppressErrors');

module.exports.suppressErrors = function suppressErrors(func/* : Function */, description/* ?: string */, errRet/* ?: any */)/* : () => any */ {
  const isAsync = func.constructor.name === 'AsyncFunction';
  // eslint-disable-next-line curly
  if (isAsync) {
    // why do it this way? if an async function throws an error, our try won't catch it unless
    // we await the function!
    return (async (...args/* : any[] */)/* : any */ => {
      try {
        return await func(...args);
      } catch (err) {
        Logger.error(`Error in ${description || func.name || 'Unnamed function'}`, err);
        return errRet;
      }
    });
  }
  return ((...args/* : any[] */)/* : any */ => {
    try {
      return func(...args);
    } catch (err) {
      Logger.error(`Error in ${description || func.name || 'Unnamed function'}`, err);
      return errRet;
    }
  });
};
