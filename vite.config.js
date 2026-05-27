import {
    defineConfig
} from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import {ElementPlusResolver} from 'unplugin-vue-components/resolvers'
import proxyConfig from './proxyConfig'
import config from './config.json'

import *  as Path from 'path';
import {fileURLToPath} from 'url';
import {dirname} from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
console.log(Path.join(__dirname, 'src', 'renderer'));

// https://vitejs.dev/config/
export default defineConfig({
    publicDir: 'public',
    root: Path.join(__dirname, 'src', 'renderer'),
    envDir: __dirname,

    define: {
        __DEV_MOD__: JSON.stringify(config.dev_mod),
        __SERVER_PROD_HOST__: JSON.stringify(config.server_prod_host),
        __SERVER_DEV_HOST__: JSON.stringify(config.server_dev_host),
    },

    server: {

        port: 3000,
        host: '0.0.0.0',

        proxy: {
            '/api/': {
                target: proxyConfig.target.host,
                changeOrigin: true
            },
            '/resource': {
                target: proxyConfig.resourceTarget,
                changeOrigin: true
            }
        }
    },

    build: {
        outDir: Path.join(__dirname, 'build', 'renderer'),
        emptyOutDir: true,
    },

    resolve: {
        extensions: ['.ts', '.js', '.json'],
    },

    plugins: [
        vue(),
        AutoImport({
            resolvers: [ElementPlusResolver()],
        }),
        Components({
            resolvers: [ElementPlusResolver()],
        }),
    ]
});