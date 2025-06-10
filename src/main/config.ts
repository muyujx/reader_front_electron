import path from "node:path";
import {app} from "electron/main";
import {storeKey} from "../common/config";
import {getStore} from "./util/stroreUtil";

let appPath = path.dirname(app.getAppPath());
if (process.env.NODE_ENV === 'dev') {
    appPath = path.join(appPath, "../../tmp");
}

// 可执行程序所在路径
export const APP_PATH = appPath;

// 缓存文件的文件夹
const DEFAULT_CACHE_DIR = path.join(APP_PATH, 'cache');

let cacheRootDir: string | null = null;

export async function getCacheRootDir(): Promise<string> {
    if (cacheRootDir != null) {
        return cacheRootDir;
    }

    // 读取配置的缓存目录
    let cacheDir = await getStore(storeKey.rootCacheDir);
    if (cacheDir == null) {
        cacheRootDir = DEFAULT_CACHE_DIR;
        return cacheRootDir;
    }

    cacheRootDir = cacheDir;
    return cacheRootDir;
}


const DEFAULT_WIN_WIDTH = 1500;
const DEFAULT_WIN_HEIGHT = 1000;

export async function getWinSize(): Promise<number[]> {
    let widthStr = await getStore(storeKey.winWidth);
    let width = DEFAULT_WIN_WIDTH;
    if (widthStr != null) {
        width = parseInt(widthStr);
    }

    let heightStr = await getStore(storeKey.winHeight);
    let height = DEFAULT_WIN_HEIGHT;
    if (heightStr != null) {
        height = parseInt(heightStr);
    }

    return [width, height];
}

export function setCacheRootDir(newDir: string) {
    cacheRootDir = newDir;
}

export async function getLogDir() {
    return path.join(await getCacheRootDir(), 'logs');
}