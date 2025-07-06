// scripts/gen-env.js
const fs = require('fs');
const path = require('path');

const version = require('../package.json').version;
const buildTime = new Date().toISOString().replace('T', ' ').replace(/\..+/, '');

const content = [
    `VITE_APP_VERSION=${version}`,
    `VITE_APP_BUILD_TIME=${buildTime}`,
].join('\n');

fs.writeFileSync(path.resolve(__dirname, '../.env.local'), content);
