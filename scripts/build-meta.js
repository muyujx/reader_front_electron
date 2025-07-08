// scripts/gen-env.js
const fs = require('fs');
const path = require('path');
const moment = require('moment');

const version = require('../package.json').version;
const buildTime = moment().format("YYYY-MM-DD HH:mm:ss");

const content = [
    `VITE_APP_VERSION=${version}`,
    `VITE_APP_BUILD_TIME=${buildTime}`,
].join('\n');

fs.writeFileSync(path.resolve(__dirname, '../.env.local'), content);
