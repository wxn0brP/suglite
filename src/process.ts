import { exec, spawn, ChildProcess, execSync } from "child_process";
import { COLORS, log } from "./logger";
import { config, processedCmd } from "./config";
import { customCommandsProcess, handleLine } from "./rl";

export let proc: ChildProcess | null = null;
let restartTimeout: NodeJS.Timeout | null = null;

// Debounce restart
export async function startProcess() {
    if (restartTimeout) clearTimeout(restartTimeout);

    restartTimeout = setTimeout(async () => {
        await restartProcess();
    }, 250 + config.delay);
}

// Function to start/restart the process
async function restartProcess() {
    if (proc) await stopProcess();
    if (config.delay) await new Promise((resolve) => setTimeout(resolve, config.delay));

    if (config.restart_cmd) {
        exec(config.restart_cmd, (err, stdout) => {
            if (stdout) log(COLORS.yellow, stdout.trim());
        });
    }

    log(COLORS.yellow, "Restarting...");
    log(COLORS.yellow, `Running command: ${processedCmd}`);

    proc = spawn(processedCmd, {
        stdio: "inherit",
        shell: true,
    });

    const pid = proc.pid;
    if (!pid) {
        log(COLORS.red, "Failed to start process.");
        return;
    }

    proc.on("exit", (code) => {
        if (code === 0 || code === null) {
            log(COLORS.green, "Majestic exit.");
        } else {
            log(COLORS.red, `Process crashed with exit code ${code}.`);
        }
        proc = null;
    });
}

export async function stopProcess() {
    if (proc && proc.pid) {
        const pid = proc.pid;
        log(COLORS.yellow, `Stopping process ${pid}...`);

        try {
            proc.kill("SIGTERM");

            await new Promise((resolve) => setTimeout(resolve, 100));

            if (isProcessAlive(pid)) {
                log(COLORS.red, `Process ${pid} still alive. Killing forcefully.`);
                proc.kill("SIGKILL");

                await new Promise((resolve) => setTimeout(resolve, 2000));

                if (isProcessAlive(pid)) {
                    log(COLORS.red, `Process ${pid} REFUSES TO DIE. Nuclear option engaged.`);
                    killHard(pid);
                }
            }
        } catch (err) {
            log(COLORS.red, `Failed to kill process ${pid}:`, err);
        }

        proc = null;
    }
}

function isProcessAlive(pid: number): boolean {
    try {
        process.kill(pid, 0);
        return true;
    } catch {
        return false;
    }
}

export function killHard(pid: number) {
    try {
        if (process.platform === "win32") {
            execSync(`taskkill /F /PID ${pid} /T`);
        } else {
            execSync(`kill -9 ${pid}`);
        }
        log(COLORS.green, `Process ${pid} terminated with extreme prejudice.`);
    } catch (err) {
        log(COLORS.red, `Even the nuclear option failed on ${pid}:`, err);
    }
}

export async function startupCommands() {
    await new Promise((resolve) => setTimeout(resolve, config.delay + 500));
    if (config.startup_cmd?.length) config.startup_cmd.forEach(handleLine);
    if (typeof config.server !== "undefined" && typeof config.server !== "boolean" && !isNaN(+config.server)) {
        handleLine(`server ${config.server}`);
    }
}

process.on("exit", () => stopProcess());
async function exitEvent() {
    await stopProcess();
    customCommandsProcess.forEach((process) => killHard(process.pid));
    process.exit();
}
process.on("SIGINT", exitEvent);
process.on("SIGTERM", exitEvent);