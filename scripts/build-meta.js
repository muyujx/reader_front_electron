// scripts/gen-env.js
const fs = require('fs');
const path = require('path');
const {format} = require('date-fns');

const version = require('../package.json').version;
const buildTime = format(new Date(), "yyyy-MM-dd HH:mm:ss");

const config = require('../config.json');

const content = [
    `VITE_APP_VERSION=${version}`,
    `VITE_APP_BUILD_TIME=${buildTime}`,
].join('\n');

fs.writeFileSync(path.resolve(__dirname, '../.env.local'), content);

// 基础配置
const baseHostConfig = `export const DEV_MOD = ${config.dev_mod};
export const SERVER_PROD_HOST = '${config.server_prod_host}';
export const SERVER_DEV_HOST = '${config.server_dev_host}';
`;

// API 常量
const apiConstants = `
/** API 路径 - 获取书籍页面 */
export const API_BOOK_PAGE_LIST = '/api/book/page/html/page';
`;

const hostConfigContent = baseHostConfig + apiConstants;

fs.writeFileSync(path.resolve(__dirname, '../src/common/hostConfig.ts'), hostConfigContent);
