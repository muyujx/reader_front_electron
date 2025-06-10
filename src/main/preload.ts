import {contextBridge, ipcRenderer} from 'electron';

// 使用 contextBridge 安全地暴露 ipcRenderer
contextBridge.exposeInMainWorld('ipc', {
    send: ipcRenderer.send,
    on: ipcRenderer.on,
    invoke: ipcRenderer.invoke
});