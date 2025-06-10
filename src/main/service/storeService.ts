import {ipcMain} from "electron";
import {getStore, setStore} from "../util/stroreUtil";
import ipcChannel from "../../common/ipcChannel";

export function initStoreService() {

    ipcMain.on(ipcChannel.setStore, (key: any, val: any) => {
        setStore(key, val);
    });

    ipcMain.handle(ipcChannel.getStore, (key: any) => {
        return getStore(key);
    });

}
