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

// Function to print colored logs
export function log(color: string, message: string, after?: string) {
    return console.log(`${color}[Suglite] ${message}${COLORS.reset}${after ?? ""}`);
}