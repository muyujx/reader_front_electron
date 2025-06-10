import log from 'electron-log';
import path from "node:path";
import {getLogDir} from "../config";
import {isDevEnv} from "./env";


export async function initLog() {

    log.initialize();

    if (isDevEnv()) {
        log.transports.console.level = "debug";
    } else {
        log.transports.console.level = "info";
    }

    log.transports.console.useStyles = true;
    log.transports.console.format = '[{h}:{i}:{s}.{ms}] [{level}] >  {text}';

    log.transports.file.level = "info";
    const logDir = path.join(await getLogDir(), 'main.log');
    log.transports.file.resolvePathFn = () => logDir;
    log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] >  {text}';

    console.log = log.log;
    console.debug = log.debug;
    console.error = log.error;
    console.info = log.info;

    log.log("log initialize success!");
}