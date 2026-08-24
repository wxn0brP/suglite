import { spawn, SpawnOptions } from "child_process";
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "fs";
import { COLORS, log, logAdv, LogConfig } from "./logger";
import { customCommandsProcess } from "./rl";

export function runCustomCommand(
	command: string,
	prettyLog: boolean = true,
	cwd = process.cwd(),
	index?: number,
) {
	const cmdTrim = command.trim();
	log(COLORS.blue, `Running command: ${command}`);

	const opts: SpawnOptions = {
		shell: true,
		cwd,
	};
	if (!prettyLog) opts.stdio = "inherit";

	const cmdProcess = spawn(command, opts);
	customCommandsProcess.set(cmdTrim, cmdProcess);

	if (prettyLog) {
		cmdProcess.stdout.on("data", data => {
			logAdv({
				color: COLORS.cyan,
				prefix: "[stdout]",
				msg: data.toString().trim(),
				index,
			});
		});
		cmdProcess.stderr.on("data", data => {
			logAdv({
				color: COLORS.magenta,
				prefix: "[stderr]",
				msg: data.toString().trim(),
				index,
			});
		});
	}

	cmdProcess.on("exit", code => {
		logExit(code);
		if (customCommandsProcess.has(cmdTrim))
			customCommandsProcess.delete(cmdTrim);
	});
}

function logExit(code: number, index?: number) {
	const cfg: LogConfig = {
		index,
	} as any;
	if (code === 0 || code === null) {
		cfg.color = COLORS.cyan;
		cfg.msg = "Majestic exit from custom command.";
	} else {
		cfg.color = COLORS.magenta;
		cfg.msg = `Custom command crashed with exit code ${code}.`;
	}
	logAdv(cfg);
}

function readHistory() {
	return existsSync(".suglite_history")
		? readFileSync(".suglite_history", "utf8").split("\n")
		: [];
}

export function appendHistory(input: string) {
	appendFileSync(".suglite_history", input + "\n");
}

export function uniqueHistory(history?: string[]) {
	if (!history) history = readHistory();
	history = [
		...new Set(history),
	];
	writeFileSync(".suglite_history", history.join("\n"));
	return history;
}
