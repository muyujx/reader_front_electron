import {app, BrowserWindow, Menu} from 'electron/main';

import * as path from "node:path";
import netInit from "./net/netInit";
import {initLog} from "./util/logUtil";
import log from "electron-log";
import {initIpcEvent} from "./service/init";
import {getWinSize} from "./config";
import {isDevEnv} from "./util/env";

// if (isDevEnv()) {
//     app.commandLine.appendSwitch('show-fps-counter');
// }

process.on('uncaughtException', err => {
    log.error('Main process error:', err);
});

const createWindow = async () => {

    const winSize = await getWinSize();

    const win = new BrowserWindow({
        width: winSize[0],
        height: winSize[1],
        frame: false,

        webPreferences: {
            webSecurity: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
        }
    })

    // 初始化 ipc 事件
    initIpcEvent(win);

    // 移除默认菜单
    Menu.setApplicationMenu(null);


    if (isDevEnv()) {
        const rendererPort = process.argv[2];
        win.loadURL(`http://localhost:${rendererPort}`).catch(err => {
            log.error("load dev server fail!", err)
        });

        // 打开开发者工具
        win.webContents.openDevTools();
    } else {
        win.loadFile(path.join(__dirname, '../renderer/index.html')).catch(err => {
            log.error("load index.html fail!", err)
        });
    }

    // 当有第二个实例启动时，会触发这个事件，并且之前的实例会被传递到这里。
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        if (win.isMinimized()) {
            win.restore();
        }
        win.focus();
    });
}


app.whenReady().then(async () => {
    // 限制只能启动一个主窗口
    if (!app.requestSingleInstanceLock()) {
        app.quit();
        return;
    }

    // 初始化 log
    await initLog();

    // 初始化网络设置
    netInit();


    createWindow();

}).catch(err => {
    log.error("app start fail!");
    log.error(err);
});


app.on('window-all-closed', () => {
    app.quit()
})

