export function isDevEnv(): boolean {
    return process.env.NODE_ENV === 'dev';
}