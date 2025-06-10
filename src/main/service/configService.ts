import {ipcMain} from "electron";
import {getCacheRootDir, getWinSize, setCacheRootDir} from "../config";
import log from "electron-log";
import ipcChannel from "../../common/ipcChannel";
import {setStore} from "../util/stroreUtil";
import {storeKey} from "../../common/config";
import * as fs from "node:fs";
import * as path from "node:path";


export function initConfigService() {

    ipcMain.handle(ipcChannel.getRootCacheDir, () => {
        return getCacheRootDir();
    });

    ipcMain.handle(ipcChannel.changeRootCacheDir, changeRootCacheDir);

    ipcMain.handle(ipcChannel.getStartWinSize, () => {
        return getWinSize();
    });

    ipcMain.handle(ipcChannel.setStartWinSize, (event, arg: any) => {
        setStartWinSize(arg[0], arg[1]);
        return arg;
    });
}

function setStartWinSize(width: number, height: number) {
    setStore(storeKey.winWidth, width.toString());
    setStore(storeKey.winHeight, height.toString());
}


/**
 * 修改缓存数据目录
 */
async function changeRootCacheDir(event: any, arg: any) {
    let oldDir = await getCacheRootDir();
    let newDir = arg[0];
    log.log("changeRootCacheDir oldDir = ", oldDir, ", newDir = ", newDir);

    if (newDir == null) {
        return;
    }

    try {
        // 检查目录可读并且可写
        await fs.promises.access(newDir, fs.constants.R_OK | fs.constants.W_OK);
    } catch (err) {
        return;
    }

    await moveRootCacheDir(oldDir, newDir);
    setStore(storeKey.rootCacheDir, newDir);
    setCacheRootDir(newDir);
}

async function moveRootCacheDir(oldDir: string, newDir: string) {
    const files = await fs.promises.readdir(oldDir);

    for (let file of files) {
        const srcPath = path.join(oldDir, file);
        const destPath = path.join(newDir, file);
        fs.promises.rename(srcPath, destPath).catch(err => {
            log.error("moveRootCacheDir ", err)
        });
    }

}

