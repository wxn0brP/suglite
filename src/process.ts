import { exec, spawn, ChildProcess, execSync } from "child_process";
import { COLORS, log, logAdv } from "./logger";
import { customCommandsProcess, handleLine } from "./rl";
import { SugliteConfig } from "./types";
import { startWatcher } from "./watcher";

export class SugliteProcess {
    proc: ChildProcess | null = null;
    restartTimeout: NodeJS.Timeout | null = null;
    index: number;

    constructor(private config: SugliteConfig) {
        startWatcher(config, this);
    }

    // Debounce restart
    async startProcess() {
        if (this.restartTimeout) clearTimeout(this.restartTimeout);

        this.restartTimeout = setTimeout(async () => {
            await this.restartProcess();
        }, 250 + this.config.delay);
    }

    // Function to start/restart the process
    async restartProcess() {
        if (this.proc) await this.stopProcess();
        if (this.config.delay) await new Promise((resolve) => setTimeout(resolve, this.config.delay));

        if (this.config.restart_cmd) {
            exec(this.config.restart_cmd, (err, stdout) => {
                if (stdout) log(COLORS.yellow, stdout.trim());
            });
        }

        logAdv({
            color: COLORS.yellow,
            prefix: "Restarting...",
            index: this.index
        });
        logAdv({
            color: COLORS.yellow,
            prefix: "Running command:",
            msg: this.config.cmd,
            index: this.index
        });

        this.proc = spawn(this.config.cmd, {
            stdio: "inherit",
            shell: true,
            cwd: this.config.cwd,
        });

        const pid = this.proc.pid;
        if (!pid) {
            logAdv({
                color: COLORS.red,
                prefix: "Failed to start process.",
                index: this.index
            });
            return;
        }

        this.proc.on("exit", (code) => {
            const success = code === 0 || code === null;
            logAdv({
                color: success ? COLORS.green : COLORS.red,
                prefix: success ? "Majestic exit." : `Process crashed with exit code ${code}.`,
                index: this.index
            });
            this.proc = null;
        });
    }

    async stopProcess() {
        if (this.proc && this.proc.pid) {
            const pid = this.proc.pid;
            logAdv({
                color: COLORS.yellow,
                prefix: "Stopping process",
                msg: `${pid}...`,
                index: this.index
            });

            try {
                this.proc.kill("SIGTERM");

                await new Promise((resolve) => setTimeout(resolve, 100));

                if (isProcessAlive(pid)) {
                    logAdv({
                        color: COLORS.red,
                        prefix: "Process",
                        msg: `${pid} still alive. killing forcefully.`,
                        index: this.index
                    });
                    this.proc.kill("SIGKILL");

                    await new Promise((resolve) => setTimeout(resolve, 2000));

                    if (isProcessAlive(pid)) {
                        logAdv({
                            color: COLORS.red,
                            prefix: "Process",
                            msg: `${pid} REFUSES TO DIE. Nuclear option engaged.`,
                            index: this.index
                        });
                        killHard(pid, this.index);
                    }
                }
            } catch (err) {
                logAdv({
                    color: COLORS.red,
                    prefix: "Failed to kill process",
                    msg: `${pid}: ${err}`,
                    index: this.index
                });
            }

            this.proc = null;
        }
    }

    async startupCommands() {
        await new Promise((resolve) => setTimeout(resolve, this.config.delay + 500));
        if (this.config.startup_cmd?.length) this.config.startup_cmd.forEach(handleLine);
        if (typeof this.config.server !== "undefined" && typeof this.config.server !== "boolean" && !isNaN(+this.config.server)) {
            handleLine(`server ${this.config.server}`);
        }
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

export function killHard(pid: number, index?: number) {
    try {
        if (process.platform === "win32") {
            execSync(`taskkill /F /PID ${pid} /T`);
        } else {
            execSync(`kill -9 ${pid}`);
        }
        logAdv({
            color: COLORS.green,
            msg: `Process ${pid} terminated with extreme prejudice.`,
            index
        });
    } catch (err) {
        logAdv({
            color: COLORS.red,
            msg: `Even the nuclear option failed on ${pid}: ${err}`,
            index
        });
    }
}

export const processes: SugliteProcess[] = [];

export function addProcess(config: SugliteConfig) {
    const process = new SugliteProcess(config);
    processes.push(process);
    return process;
}

process.on("exit", () => {
    processes.forEach((process) => process.stopProcess());
});

async function exitEvent() {
    processes.forEach((process) => process.stopProcess());
    customCommandsProcess.forEach((process, i) => killHard(process.pid));
    process.exit();
}
process.on("SIGINT", exitEvent);
process.on("SIGTERM", exitEvent);