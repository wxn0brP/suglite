import { ChildProcess, spawn, SpawnOptions } from "child_process";
import { config } from "./config";
import { COLORS, log } from "./logger";
import Readline from "readline";
import { killHard, startProcess, stopProcess } from "./process";

export const customCommandsProcess = new Map<string, ChildProcess>();

// Handle terminal input events
const rl = Readline.createInterface({ input: process.stdin, output: process.stdout });
rl.on("line", (input) => {
    const cmdTrim = input.trim();
    
    const isNoLog = cmdTrim.startsWith("!");
    const eventKey = isNoLog ? cmdTrim.slice(1) : cmdTrim;
    const cmdEvents = config.events[eventKey];
    if (cmdEvents) {
        runCustomCommand(cmdEvents, !isNoLog);
        return;
    }

    if (cmdTrim.startsWith("$")) {
        const noLog = cmdTrim.startsWith("$!");
        runCustomCommand(cmdTrim.slice(noLog ? 2 : 1), noLog);
        return;
    }

    switch (cmdTrim) {
        case "rs":
            startProcess();
            break;
        case "quit":
            log(COLORS.green, "Shutting down...");
            process.exit(0);
        case "help":
            log(COLORS.green, "Available commands:");
            for (const [key, value] of Object.entries(config.events)) {
                log(COLORS.green, "", `${key} -> ${value}`);
            }
            break;
        case "config":
            log(COLORS.green, "Current config:");
            console.log(JSON.stringify(config, null, 2));
            break;
        case "cls":
            console.clear();
            break;
    }
});

function logExit(code: number) {
    if (code === 0 || code === null) 
        log(COLORS.cyan, "Majestic exit from custom command.");
    else 
        log(COLORS.magenta, `Custom command crashed with exit code ${code}.`);
}

function runCustomCommand(command: string, prettyLog: boolean = true) {
    let cmdTrim = command.trim();
    log(COLORS.blue, `Running command: ${command}`);

    const opts: SpawnOptions = {
        shell: true,
    }
    if (!prettyLog) opts.stdio = "inherit";
    
    const cmdProcess = spawn(command, opts);
    customCommandsProcess.set(cmdTrim, cmdProcess);

    if (prettyLog) {
        cmdProcess.stdout.on("data", (data) => {
            log(COLORS.cyan, "[stdout] ", data.toString().trim());
        });
        cmdProcess.stderr.on("data", (data) => {
            log(COLORS.magenta, "[stderr] ", data.toString().trim());
        });
    }

    cmdProcess.on("exit", (code) => {
        logExit(code);
        if (customCommandsProcess.has(cmdTrim)) customCommandsProcess.delete(cmdTrim);
    });
}

async function exitEvent() {
    log(COLORS.green, "Process interrupted. Exiting...");
    rl.close();
    await stopProcess();
    customCommandsProcess.forEach((process) => killHard(process.pid));
    process.exit(0);
}

// Ensure Ctrl+C exits immediately
rl.on("SIGINT", exitEvent);
rl.on("SIGTERM", exitEvent);