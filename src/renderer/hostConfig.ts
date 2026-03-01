import config from '../../config.json';

declare const __DEV_MOD__: boolean;
declare const __SERVER_PROD_HOST__: string;
declare const __SERVER_DEV_HOST__: string;

const hasDefine = typeof __DEV_MOD__ !== 'undefined';

export const DEV_MOD = hasDefine ? __DEV_MOD__ : config.dev_mod;
export const SERVER_PROD_HOST = hasDefine ? __SERVER_PROD_HOST__ : config.server_prod_host;
export const SERVER_DEV_HOST = hasDefine ? __SERVER_DEV_HOST__ : config.server_dev_host;
