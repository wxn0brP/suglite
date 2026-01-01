import { ChildProcess, spawn, SpawnOptions } from "child_process";
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "fs";
import Readline from "readline";
import { mainConfig, configs } from "./config";
import { COLORS, log, logAdv, LogConfig } from "./logger";
import { killHard, processes } from "./process";

export const customCommandsProcess = new Map<string, ChildProcess>();

if (mainConfig.history && mainConfig.history > 0) {
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
    historySize: mainConfig.history,
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
rl.on("line", handleLine);

export function handleLine(input: string) {
    let cmdTrim = input.trim();
    const split = cmdTrim.split(" ");
    let index = +split[0];
    if (isNaN(index)) index = 0;
    else cmdTrim = split.slice(1).join(" ");

    const isNoLog = cmdTrim.startsWith("!");
    const eventKey = isNoLog ? cmdTrim.slice(1) : cmdTrim;
    const cmdEvents = mainConfig.events[eventKey];
    if (cmdEvents) {
        runCustomCommand(cmdEvents, !isNoLog, configs[index].cwd);
    }

    if (cmdTrim.startsWith("$")) {
        const noLog = cmdTrim.startsWith("$!");
        runCustomCommand(cmdTrim.slice(noLog ? 2 : 1), noLog, configs[index].cwd);
        if (mainConfig.history && mainConfig.history > 0) appendHistory(cmdTrim);
    }

    const mergedShells = [...trustedShells, ...mainConfig.trustedShells];
    const firstWord = cmdTrim.split(" ")[0].toLowerCase();
    if (mergedShells.includes(firstWord)) {
        runCustomCommand(cmdTrim, false, configs[index].cwd);
        if (mainConfig.history && mainConfig.history > 0) appendHistory(cmdTrim);
    }

    switch (cmdTrim) {
        case "rs":
            processes[index].startProcess();
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
            log(COLORS.green, "", "server [port] -> Start server");
            log(COLORS.green, "", "server stop -> Stop server");
            log(COLORS.green, "Trusted shells:");
            for (const shell of trustedShells) {
                log(COLORS.green, "", shell);
            }
            break;
        case "config":
            log(COLORS.green, "Current config:");
            console.log(JSON.stringify(mainConfig, null, 2));
            break;
        case "cls":
            console.clear();
            break;
        case "unique-history":
            uniqueHistory();
            break;
        case "show-cmd":
            log(COLORS.green, "Available custom commands:");
            for (const [key, value] of Object.entries(mainConfig.events)) {
                log(COLORS.green, "", `${key} -> ${value}`);
            }
            break;
    }

    if (cmdTrim.startsWith("server")) {
        const exists = [...customCommandsProcess.keys()].filter(key => key.startsWith("server")).length > 0;
        if (cmdTrim.includes("stop")) {
            if (!exists) {
                log(COLORS.red, "Server not running");
                return;
            }
            log(COLORS.green, "Stopping server...");
            killHard(customCommandsProcess.get("server").pid);
            customCommandsProcess.delete("server");
            return;
        }

        if (cmdTrim.includes("open")) {
            if (!exists) {
                log(COLORS.red, "Server not running");
                return;
            }
            log(COLORS.green, "Opening server...");
            const url = `http://localhost:${mainConfig.server}`;
            if (process.platform === "win32") {
                runCustomCommand(`start "" "${url}"`);
            } else if (process.platform === "darwin") {
                runCustomCommand(`open ${url}`);
            } else {
                runCustomCommand(`xdg-open ${url}`);
            }
            return;
        }

        if (exists) {
            log(COLORS.red, "Server already running");
            return;
        }

        log(COLORS.green, "Starting server...");
        runCustomCommand(cmdTrim, false);
    }
}

function logExit(code: number, index?: number) {
    const cfg: LogConfig = { index } as any;
    if (code === 0 || code === null) {
        cfg.color = COLORS.cyan;
        cfg.msg = "Majestic exit from custom command.";
    } else {
        cfg.color = COLORS.magenta;
        cfg.msg = `Custom command crashed with exit code ${code}.`;
    }
    logAdv(cfg);
}

function runCustomCommand(command: string, prettyLog: boolean = true, cwd = process.cwd(), index?: number) {
    let cmdTrim = command.trim();
    log(COLORS.blue, `Running command: ${command}`);

    const opts: SpawnOptions = {
        shell: true,
        cwd,
    }
    if (!prettyLog) opts.stdio = "inherit";

    const cmdProcess = spawn(command, opts);
    customCommandsProcess.set(cmdTrim, cmdProcess);

    if (prettyLog) {
        cmdProcess.stdout.on("data", (data) => {
            logAdv({
                color: COLORS.cyan,
                prefix: "[stdout]",
                msg: data.toString().trim(),
                index
            });
        });
        cmdProcess.stderr.on("data", (data) => {
            logAdv({
                color: COLORS.magenta,
                prefix: "[stderr]",
                msg: data.toString().trim(),
                index
            });
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
    processes.forEach((process) => process.stopProcess());
    customCommandsProcess.forEach((process) => killHard(process.pid));
    process.exit(0);
}

// Ensure Ctrl+C exits immediately
rl.on("SIGINT", exitEvent);
rl.on("SIGTERM", exitEvent);