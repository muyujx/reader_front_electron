import {app} from "electron/main";
import * as fs from "node:fs";
import * as path from "node:path";
import log from "electron-log";

const userPath = app.getPath("userData");
const appName = app.getName();
const configFile = path.join(userPath, appName + ".json");

log.info("config file path is ", configFile);

const config = new Map<string, string>();

let finish = false;

async function loadConfig() {
    try {
        await fs.promises.access(configFile, fs.constants.F_OK);
    } catch (err: any) {
        if (err.code == 'ENOENT') {
            await fs.promises.writeFile(configFile, '{}');
        } else {
            throw err;
        }
    }
    const str = await fs.promises.readFile(configFile, 'utf-8');
    const json = JSON.parse(str);
    for (let key in json) {
        config.set(key, json[key]);
    }

    finish = true;
}

export async function getStore(key: string): Promise<string | null> {
    if (key == null) {
        return null;
    }

    if (!finish) {
        await loadConfig();
    }

    let res = config.get(key);
    return res == undefined ? null : res;
}

export function setStore(key: string, val: string) {
    if (key == null) {
        return;
    }
    config.set(key, val);
    fs.promises.writeFile(configFile, JSON.stringify(Object.fromEntries(config))).catch((err) => {
        log.error("write config json file fail!", err)
    });
}


