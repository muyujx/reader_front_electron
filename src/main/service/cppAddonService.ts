import {ipcMain} from 'electron';
import log from 'electron-log';
import ipcChannel from '../../common/ipcChannel';
import * as path from 'node:path';

/** C++ addon 返回的对象类型 */
interface CppObject {
    name: string;
    value: number;
    success: boolean;
}

/**
 * 加载 C++ addon 模块
 * __dirname 在编译后是 build/main/service/
 * .node 文件在 src/cc/build/Release/
 */
function loadAddon(): any {
    // 从 build/main/service/ 回到项目根目录，再到 src/cc/build/Release/
    const addonPath = path.join(__dirname, '../../../src/cc/build/Release/reader-addon.node');
    log.info('Loading C++ addon from:', addonPath);
    try {
        const addon = require(addonPath);
        log.info('Addon loaded successfully:', addon);
        return addon;
    } catch (err) {
        log.error('Failed to require addon:', err);
        throw err;
    }
}

/**
 * 初始化 C++ addon 的 IPC 事件
 */
export function initCppAddonIpc() {
    // 延迟加载 addon，避免模块加载时错误
    let addon: any = null;

    try {
        addon = loadAddon();
        log.info('C++ addon loaded successfully');
        log.info('Addon exports:', Object.keys(addon));
    } catch (err) {
        log.error('Failed to load C++ addon:', err);
    }

    // 注册 IPC handle
    ipcMain.handle(ipcChannel.cppGetObject, async (): Promise<CppObject | null> => {
        try {
            if (!addon) {
                addon = loadAddon();
            }
            log.info('Calling addon.getCppObject()...');
            const result = addon.getCppObject();
            log.info('C++ addon returned:', result);
            return result;
        } catch (err) {
            log.error('C++ addon call failed:', err);
            return null;
        }
    });
}
