import {DEV_MOD, SERVER_DEV_HOST, SERVER_PROD_HOST} from "../../common/hostConfig.ts"
import {ipcInvoke} from "../utils/ipcUtil.ts";
import ipcChannel from "../../common/ipcChannel.ts";
import {GetParam, PostParam} from "../../common/request.ts";
import router from "../route";

export interface ResponseModel<T> {
    data: T,
    code: number,
    message: string
}

interface RequestParam {
    url: string,
    body?: any
    queryParam?: any
}


let toLogin = true;

async function afterRq<T>(axiosRq: Promise<any>): Promise<T> {

    let result: ResponseModel<T>;
    try {
        result = await axiosRq;
    } catch (e) {
        console.error("request error", e);
        return Promise.reject();
    }

    // 报错需要登录
    if (result.code == 100) {

        if (toLogin) {
            toLogin = false;

            await router.push({
                name: "Login"
            });

            setTimeout(() => {
                toLogin = true;
            }, 500);

        }

        return Promise.reject("need login!");
    }

    if (result.code != 0) {
        return Promise.reject(result);
    }
    return result.data;
}

export default {

    post<T>(rqParam: RequestParam): Promise<T> {
        return afterRq(ipcInvoke(ipcChannel.rqPost, <PostParam>{
            path: rqParam.url,
            body: rqParam.body
        }));
    },

    get<T>(rqParam: RequestParam): Promise<T> {
        return afterRq(ipcInvoke(ipcChannel.rqGet, <GetParam>{
            path: rqParam.url,
            query: rqParam.queryParam
        }));
    }
}

export function addHost(path: string): string {
    if (path.includes("://")) {
        let idx = path.indexOf("resource");
        if (idx != -1) {
            path = path.substring(idx);
        } else {
            let url = new URL(path);
            path = url.pathname;
        }
    }

    let host = SERVER_PROD_HOST;

    if (DEV_MOD && path.startsWith("/api")) {
        host = SERVER_DEV_HOST;
        path = path.substring("/api".length);
    }


    if (path.startsWith("/")) {
        return host + path;
    }
    return host + "/" + path;
}
