import {ipcMain} from "electron";
import ipcChannel from "../../common/ipcChannel";
import {GetParam, PostParam} from "../../common/request";
import {DEV_MOD, SERVER_DEV_HOST, SERVER_PROD_HOST} from "../../common/hostConfig";
import {isDevEnv} from "../util/env";
import axios from "axios";
import setCookieParser from 'set-cookie-parser';
import {session} from "electron/main";

function parseUrl(path: string): string {
    if (DEV_MOD) {
        const prefix = "/api";
        if (path.startsWith(prefix)) {
            return SERVER_DEV_HOST + path.substring(prefix.length);
        }
    }

    return SERVER_PROD_HOST + path;
}

const axiosObj = axios.create({
    withCredentials: true
});

const loginPath = "/api/login";

// 设置 cookie 用的 host, 只要是有效的 host 即可, 不需要是真实的
const cookieHost = "https://test.com";

async function setCookie(headers: any) {
    const cookies = setCookieParser.parse(headers['set-cookie'], {map: false});
    for (const c of cookies) {
        const maxAge = c.maxAge == undefined ? 0 : c.maxAge;
        await session.defaultSession.cookies.set({
            url: cookieHost,
            name: c.name,
            value: c.value,
            path: '/',
            httpOnly: true,
            secure: true,
            sameSite: "lax",
            expirationDate: Math.floor(new Date().getTime() / 1000) + maxAge,
        });
    }
}


async function getCookieHeader() {
    const cookies = await session.defaultSession.cookies.get({
        url: cookieHost
    });
    return cookies.map(c => `${c.name}=${c.value}`).join('; ');
}


export function initRequestIpc() {

    ipcMain.handle(ipcChannel.rqGet, async (event: any, args: GetParam[]) => {
        const param = args[0];
        const url = parseUrl(param.path);

        console.debug(`[http] [get] url = ${url}`);

        return axiosObj.get(url, {
            params: param.query,
            headers: {
                Cookie: await getCookieHeader()
            }
        }).then(res => {
            return res.data;
        });

    });

    ipcMain.handle(ipcChannel.rqPost, async (event: any, args: PostParam[]) => {
        const param = args[0];
        const url = parseUrl(param.path);

        console.debug(`[http] [post] url = ${url}`);

        return axiosObj.post(url, param.body, {
            headers: {
                Cookie: await getCookieHeader()
            }
        }).then(async (res) => {

            if (param.path == loginPath) {
                await setCookie(res.headers)
            }

            return res.data;
        });
    });

}
