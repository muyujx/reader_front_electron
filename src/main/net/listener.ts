import OnBeforeRequestListenerDetails = Electron.OnBeforeRequestListenerDetails;
import CallbackResponse = Electron.CallbackResponse;
import * as path from "node:path";
import * as fs from "node:fs";
import {OnCompletedListenerDetails, session} from "electron/main";
import {getCacheRootDir} from "../config";
import log from "electron-log";


export function requestListener(details: OnBeforeRequestListenerDetails, callback: (callbackResponse: CallbackResponse) => void): void {

    let url = URL.parse(details.url);
    // @ts-ignore
    let ph = url.pathname;
    let pArr = ph.substring(1).split("/");

    if (pArr.length === 0) {
        callback({})
        return;
    }

    switch (pArr[0]) {

        case 'resource': {

            checkLocalExists(details.url)
                .then(localPath => {
                    // 本地文件存在, 重定向到本地文件
                    callback({
                        redirectURL: `local://${localPath}`
                    })

                })
                .catch(() => {
                    // 没有本地文件, 发起网络请求
                    callback({})
                })

            break;
        }
        case 'static': {
            callback({})
            break;
        }

        default: {
            callback({})
        }
    }

}

// 请求完成的监听器
export function completeListener(details: OnCompletedListenerDetails) {

    let url = URL.parse(details.url);
    // @ts-ignore
    let ph = url.pathname;

    // 图片资源
    if (ph.startsWith("/resource")) {
        checkLocalExists(details.url)
            .then(localPath => {
                log.warn(`file already download ${localPath}`);
            })
            .catch(() => {
                log.info(`download ${details.url}`);
                // 下载文件
                session.defaultSession.downloadURL(details.url);
            })
    }

}

// 检查是否存在本地文件缓存
async function checkLocalExists(urlStr: string): Promise<string> {
    let url = URL.parse(urlStr);
    // @ts-ignore
    let ph = url.pathname;
    let pArr = ph.substring(1).split("/");
    // 本地文件路径
    let localPath = path.join(await getCacheRootDir(), ...pArr);

    await fs.promises.access(localPath, fs.constants.F_OK);
    return localPath.replace(/\\/g, '/');
}
