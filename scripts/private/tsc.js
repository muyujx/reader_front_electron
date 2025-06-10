import ChildProcess from 'child_process';
import Chalk from 'chalk';

export default function compile(directory) {
    return new Promise((resolve, reject) => {

        const tscProcess = ChildProcess.exec('tsc', {
            cwd: directory
        }, (error, stdout, stderr) => {

            if (error != null) {
                process.stderr.write(Chalk.redBright(`tsc exec fail! `) + Chalk.white(error.toString()))
            }
        });

        tscProcess.stdout.on('data', data =>
            process.stdout.write(Chalk.yellowBright(`[tsc] `) + Chalk.white(data.toString()))
        );

        tscProcess.on('exit', exitCode => {
            if (exitCode > 0) {
                reject(exitCode);
            } else {
                resolve();
            }
        });
    });
}