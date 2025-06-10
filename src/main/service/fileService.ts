import {dialog, ipcMain, ipcRenderer} from "electron";

export function initFileEvent() {

    // 文件夹选择
    ipcMain.handle('folderChoose', () => {
        const res = dialog.showOpenDialogSync({properties: ['openDirectory']});

        if (res == null || res.length == 0) {
            return null;
        }

        // 选择的文件夹路径
        return res[0];
    });

}

