import { exec } from "child_process";
import { config } from "./config.js";
import { COLORS, log } from "./logger.js";
import Readline from "readline";
import { proc, startProcess } from "./process.js";
const rl = Readline.createInterface({ input: process.stdin, output: process.stdout });
rl.on("line", (input) => {
    const trim = input.trim();
    const cmd = config.events[trim];
    if (cmd) {
        exec(cmd, (err, stdout) => {
            if (!stdout)
                return;
            log(COLORS.green, "[stdout] ", stdout.trim());
        });
    }
    switch (trim) {
        case "rs":
            startProcess();
            break;
        case "quit":
            log(COLORS.green, "Shutting down...");
            process.exit(0);
        case "help":
            log(COLORS.green, "Available commands:");
            for (const [key, value] of Object.entries(config.events)) {
                log(COLORS.green, "", `${key} - ${value}`);
            }
            break;
        case "config":
            log(COLORS.green, "Current config:");
            console.log(JSON.stringify(config, null, 2));
            break;
    }
});
rl.on("SIGINT", () => {
    log(COLORS.green, "Process interrupted. Exiting...");
    rl.close();
    if (proc)
        proc.kill();
    process.exit(0);
});
