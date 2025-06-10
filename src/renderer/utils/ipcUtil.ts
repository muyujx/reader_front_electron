/**
 * 向 electron main process 发送消息
 */
export function ipcSend(channel: string): void {
    // @ts-ignore
    window.ipc.send(channel);
}


/**
 * 监听 electron main process 的消息
 */
export function ipcOn(channel: string, listener: (event: any, args: any[]) => void): void {
    // @ts-ignore
    window.ipc.on(channel, listener);
}

/**
 *
 * 调用 ipcMain handle 的方法, 并且获取返回值
 *
 */
export function ipcInvoke(channel: string, ...args: any[]): Promise<any> {
    // @ts-ignore
    return window.ipc.invoke(channel, args);
}
