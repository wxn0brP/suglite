import { ChildProcess, exec, execSync, spawn } from "child_process";
import { COLORS, log, logAdv } from "./logger";
import { customCommandsProcess, handleLine } from "./rl";
import { runCustomCommand } from "./rl.utils";
import { SugliteConfig } from "./types";
import { startWatcher } from "./watcher";

export class SugliteProcess {
	proc: ChildProcess | null = null;
	restartTimeout: NodeJS.Timeout | null = null;
	buildId = 0;
	blockedUntil = 0;
	snooze: number;
	index: number;

	constructor(private config: SugliteConfig) {
		this.snooze = config.snooze ?? 0;
		startWatcher(config, this);
	}

	blockRestarts(seconds: number) {
		this.blockedUntil = Date.now() + seconds * 1000;
		logAdv({
			color: COLORS.yellow,
			prefix: `Auto-restarts on hold for ${seconds}s. Use 'rs' to force.`,
			index: this.index,
		});
	}

	setSnooze(seconds: number) {
		this.snooze = seconds;
		logAdv({
			color: COLORS.yellow,
			prefix:
				seconds > 0
					? `Snooze set to ${seconds}s after each restart.`
					: "Snooze disabled.",
			index: this.index,
		});
	}

	// Debounce restart
	async startProcess(force = false) {
		if (this.restartTimeout) clearTimeout(this.restartTimeout);

		this.restartTimeout = setTimeout(async () => {
			if (force) {
				this.blockedUntil = 0;
			} else if (Date.now() < this.blockedUntil) {
				const left = Math.ceil((this.blockedUntil - Date.now()) / 1000);
				logAdv({
					color: COLORS.yellow,
					prefix: `Restart blocked for ${left}s more.`,
					index: this.index,
				});
				return;
			}
			await this.restartProcess();
		}, 750 + this.config.delay);
	}

	// Function to start/restart the process
	async restartProcess() {
		const buildId = ++this.buildId;
		const env = {
			...process.env,
			...this.config.env,
			SUGLITE_BUILD_ID: String(buildId),
		};

		if (this.proc) await this.stopProcess();
		if (this.config.delay)
			await new Promise(resolve => setTimeout(resolve, this.config.delay));

		if (this.config.clear_screen && buildId > 1) console.clear();

		if (
			this.config.restart_cmd &&
			(buildId > 1 || this.config.restart_cmd_first_run !== false)
		) {
			exec(
				this.config.restart_cmd,
				{
					env,
				},
				(err, stdout) => {
					if (stdout) log(COLORS.yellow, stdout.trim());
				},
			);
		}

		logAdv({
			color: COLORS.yellow,
			prefix: `Restarting... #${buildId}`,
			index: this.index,
		});
		logAdv({
			color: COLORS.yellow,
			prefix: "Running command:",
			msg: this.config.cmd,
			index: this.index,
		});

		this.proc = spawn(this.config.cmd, {
			stdio: "inherit",
			shell: true,
			cwd: this.config.cwd,
			env,
		});

		const pid = this.proc.pid;
		if (!pid) {
			logAdv({
				color: COLORS.red,
				prefix: "Failed to start process.",
				index: this.index,
			});
			return;
		}

		if (this.snooze > 0) {
			this.blockedUntil = Date.now() + this.snooze * 1000;
			logAdv({
				color: COLORS.yellow,
				prefix: `Snoozed: auto-restarts blocked for ${this.snooze}s.`,
				index: this.index,
			});
		}

		this.proc.on("exit", code => {
			const success = code === 0 || code === null;
			logAdv({
				color: success ? COLORS.green : COLORS.red,
				prefix: success
					? "Majestic exit."
					: `Process crashed with exit code ${code}.${process.platform === "win32" ? " Using Windows? That explains a lot." : ""}`,
				index: this.index,
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
				index: this.index,
			});

			try {
				this.proc.kill("SIGTERM");

				await new Promise(resolve => setTimeout(resolve, 100));

				if (isProcessAlive(pid)) {
					logAdv({
						color: COLORS.red,
						prefix: "Process",
						msg: `${pid} still alive. killing forcefully.`,
						index: this.index,
					});
					this.proc.kill("SIGKILL");

					await new Promise(resolve => setTimeout(resolve, 2000));

					if (isProcessAlive(pid)) {
						logAdv({
							color: COLORS.red,
							prefix: "Process",
							msg: `${pid} REFUSES TO DIE. Nuclear option engaged.`,
							index: this.index,
						});
						killHard(pid, this.index);
					}
				}
			} catch (err) {
				logAdv({
					color: COLORS.red,
					prefix: "Failed to kill process",
					msg: `${pid}: ${err}`,
					index: this.index,
				});
			}

			this.proc = null;
		}
	}

	async startupCommands() {
		await new Promise(resolve => setTimeout(resolve, this.config.delay + 500));
		if (this.config.startup_cmd?.length)
			this.config.startup_cmd.forEach(handleLine);
		if (
			typeof this.config.server !== "undefined" &&
			typeof this.config.server !== "boolean" &&
			!Number.isNaN(+this.config.server)
		) {
			runCustomCommand(`wxn-server ${this.config.server}`, false);
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
			index,
		});
	} catch (err) {
		logAdv({
			color: COLORS.red,
			msg: `Even the nuclear option failed on ${pid}: ${err}`,
			index,
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
	processes.forEach(process => process.stopProcess());
});

export async function exitEvent(code = 0) {
	log(COLORS.green, "Process interrupted. Exiting...");
	globalThis.rl?.close?.();
	processes.forEach(process => process.stopProcess());
	customCommandsProcess.forEach((process, i) => killHard(process.pid));
	process.exit(code);
}
process.on("SIGINT", () => exitEvent());
process.on("SIGTERM", () => exitEvent());

process.on("unhandledRejection", (reason, p) => {
	log(COLORS.red, "Unhandled rejection. A promise broke its word.");
	console.log(p, "reason:", reason);
	exitEvent(1);
});

process.on("uncaughtException", (err, origin) => {
	log(COLORS.red, "Uncaught exception. Something exploded.");
	console.log(err, "origin:", origin);
	exitEvent(1);
});
