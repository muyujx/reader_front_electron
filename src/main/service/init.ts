import {initWindowEvent} from "./windowService";
import {BrowserWindow} from "electron/main";
import {initFileEvent} from "./fileService";
import {initStoreService} from "./storeService";
import {initConfigService} from "./configService";
import {initRequestIpc} from "./request";
import {initBookDownloadIpc} from "./bookDownloadService";


export function initIpcEvent(window: BrowserWindow) {

    initWindowEvent(window);

    initFileEvent();

    initStoreService();

    initConfigService();

    initRequestIpc();

    initBookDownloadIpc();
    
}



