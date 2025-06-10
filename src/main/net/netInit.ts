import {protocol, session, net} from "electron/main";
import * as url from "node:url";
import {completeListener, requestListener} from "./listener";
import path from "node:path";
import log from "electron-log";
import {getCacheRootDir} from "../config";

export default function () {

    log.log("init net config start!");

    // 注册自定义协议
    protocol.handle('local', req => {
        const reqURL = new URL(req.url)
        // log.info(`load local file ${reqURL}`)

        return net.fetch(url.pathToFileURL(reqURL.pathname).toString());
    });

    // 监听下载完成事件
    session.defaultSession.on('will-download', async (event, item, webContents) => {

        let url = new URL(item.getURL());
        let ph = url.pathname;
        let pArr = ph.substring(1).split('/');
        let localPath = path.join(await getCacheRootDir(), ...pArr);

        // 设置保存路径
        item.setSavePath(localPath);

        // 监听下载完成事件
        item.once('done', (event, state) => {

            log.info(`image saved ${localPath}`);

        });
    });

    // 请求前置处理
    session.defaultSession.webRequest.onBeforeRequest({
        urls: ['*://*/*'],
    }, requestListener);

    // 请求完成处理
    session.defaultSession.webRequest.onCompleted({
        urls: ['*://*/*'],
    }, completeListener);

    log.log("init net config success!");

}


