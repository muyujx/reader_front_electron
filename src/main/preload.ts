import {contextBridge, ipcRenderer} from 'electron';

// 使用 contextBridge 安全地暴露 ipcRenderer
contextBridge.exposeInMainWorld('ipc', {
    send: (channel: string, ...args: any[]) => {
        ipcRenderer.send(channel, ...args);
    },
    on: (channel: string, listener: (...args: any[]) => void) => {
        ipcRenderer.on(channel, (event, ...args) => {
            listener(...args);
        });
    },
    invoke: (channel: string, ...args: any[]) => {
        return ipcRenderer.invoke(channel, ...args);
    }
});