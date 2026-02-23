import chalk from 'chalk';

export class Logger {
    public static info(message: string) {
        console.log(`${chalk.blue('[INFO]')} ${message}`);
    }

    public static success(message: string) {
        console.log(`${chalk.green('[SUCCESS]')} ${message}`);
    }

    public static warn(message: string) {
        console.log(`${chalk.yellow('[WARN]')} ${message}`);
    }

    public static error(message: string, error?: any) {
        console.error(`${chalk.red('[ERROR]')} ${message}`, error || '');
    }

    public static debug(message: string) {
        if (process.env.DEBUG) {
            console.log(`${chalk.gray('[DEBUG]')} ${message}`);
        }
    }
}
