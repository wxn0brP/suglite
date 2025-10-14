import { ChildProcess, spawn, SpawnOptions } from "child_process";
import { config } from "./config";
import { COLORS, log } from "./logger";
import Readline from "readline";
import { killHard, startProcess, stopProcess } from "./process";
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "fs";

export const customCommandsProcess = new Map<string, ChildProcess>();

if (config.history && config.history > 0) {
    if (!existsSync(".suglite_history")) writeFileSync(".suglite_history", "");
}

function readHistory() {
    return existsSync(".suglite_history") ? readFileSync(".suglite_history", "utf8").split("\n") : [];
}

function appendHistory(input: string) {
    appendFileSync(".suglite_history", input + "\n");
}

function uniqueHistory(history?: string[]) {
    if (!history) history = readHistory();
    history = [...new Set(history)];
    writeFileSync(".suglite_history", history.join("\n"));
    return history;
}

const rlOpts: Readline.ReadLineOptions = {
    input: process.stdin,
    output: process.stdout,
    historySize: config.history,
    history: uniqueHistory(),
}

const trustedShells = [
    // TS/JS
    "yarn", "npm", "pnpm", "node", "bun", "tsc",
    // My tools
    "bumr",
    // Bash
    "git",
    // Docker
    "docker", "docker-compose",
    // Python
    "python", "pip",
    // Rust
    "cargo",
    // Go
    "go",
];

// Handle terminal input events
const rl = Readline.createInterface(rlOpts);
rl.on("line", (input) => {
    const cmdTrim = input.trim();

    const isNoLog = cmdTrim.startsWith("!");
    const eventKey = isNoLog ? cmdTrim.slice(1) : cmdTrim;
    const cmdEvents = config.events[eventKey];
    if (cmdEvents) {
        runCustomCommand(cmdEvents, !isNoLog);
    }

    if (cmdTrim.startsWith("$")) {
        const noLog = cmdTrim.startsWith("$!");
        runCustomCommand(cmdTrim.slice(noLog ? 2 : 1), noLog);
        if (config.history && config.history > 0) appendHistory(cmdTrim);
    }

    const mergedShells = [...trustedShells, ...config.trustedShells];
    const firstWord = cmdTrim.split(" ")[0].toLowerCase();
    if (mergedShells.includes(firstWord)) {
        runCustomCommand(cmdTrim, false);
        if (config.history && config.history > 0) appendHistory(cmdTrim);
    }

    switch (cmdTrim) {
        case "rs":
            startProcess();
            break;
        case "quit":
        case "exit":
            log(COLORS.green, "Shutting down...");
            process.exit(0);
        case "help":
            log(COLORS.green, "Commands:");
            log(COLORS.green, "", "<event> -> Run event command (see 'show-cmd')");
            log(COLORS.green, "", "!<event> -> Run event command without pretty logging");
            log(COLORS.green, "", "$<command> -> Run shell command");
            log(COLORS.green, "", "$!<command> -> Run shell command with pretty logging");
            log(COLORS.green, "System commands:");
            log(COLORS.green, "", "rs -> Restart process");
            log(COLORS.green, "", "quit/exit -> Exit");
            log(COLORS.green, "", "help -> Show help");
            log(COLORS.green, "", "config -> Show current config");
            log(COLORS.green, "", "cls -> Clear console");
            log(COLORS.green, "", "unique-history -> Make history unique");
            log(COLORS.green, "", "show-cmd -> Show available custom commands");
            break;
        case "config":
            log(COLORS.green, "Current config:");
            console.log(JSON.stringify(config, null, 2));
            break;
        case "cls":
            console.clear();
            break;
        case "unique-history":
            uniqueHistory();
            break;
        case "show-cmd":
            log(COLORS.green, "Available custom commands:");
            for (const [key, value] of Object.entries(config.events)) {
                log(COLORS.green, "", `${key} -> ${value}`);
            }
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