import {ipcMain} from 'electron';
import {BrowserWindow} from "electron/main";


export function initWindowEvent(window: BrowserWindow) {

    // 监听最小化事件
    ipcMain.on('window-minimize', () => {
        window.minimize();
    });


    // 监听最大化/恢复事件
    ipcMain.on('window-maximize', () => {
        if (window.isMaximized()) {
            window.unmaximize();
        } else {
            window.maximize();
        }
    });

    // 监听关闭事件
    ipcMain.on('window-close', () => {
        window.close();
    });

}


