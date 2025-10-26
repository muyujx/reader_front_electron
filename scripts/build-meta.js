// scripts/gen-env.js
const fs = require('fs');
const path = require('path');
const {format} = require('date-fns');

const version = require('../package.json').version;
const buildTime = format(new Date(), "yyyy-MM-dd HH:mm:ss");

const content = [
    `VITE_APP_VERSION=${version}`,
    `VITE_APP_BUILD_TIME=${buildTime}`,
].join('\n');

fs.writeFileSync(path.resolve(__dirname, '../.env.local'), content);
