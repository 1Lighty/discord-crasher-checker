/* —————————————— Copyright (c) 2021 1Lighty, All rights reserved ——————————————
 *
 * Require all at once
 *
 * ————————————————————————————————————————————————————————————————————————————— */

const { readdirSync } = require('fs');
const modules = readdirSync(__dirname).filter(file => file !== 'index.js');
for (let i = 0; i < modules.length; i++) {
  const [moduleName] = modules[i].split('.');
  module.exports[moduleName] = require(`${__dirname}/${moduleName}`);
}
