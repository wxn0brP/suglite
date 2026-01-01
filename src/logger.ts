// Color codes for terminal output
export const COLORS = {
    reset: "\x1b[0m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    red: "\x1b[31m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
};

export interface LogConfig {
    color: string;
    msg?: string;
    prefix?: string;
    index?: number;
}

export function logAdv(config: LogConfig) {
    const index = config.index !== undefined ? `[${config.index}] ` : "";
    const prefix = config.prefix !== undefined ? `${config.prefix} ` : "";
    let prefixMsg = `${config.color}[Suglite] ${index}${prefix}${COLORS.reset}`;
    console.log(`${prefixMsg}${config.msg ?? ""}`);
}

export function log(color: string, prefix: string, msg?: any) {
    logAdv({ color, prefix, msg });
}