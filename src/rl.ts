import { ChildProcess } from "child_process";
import { existsSync, writeFileSync } from "fs";
import Readline from "readline";
import { configs, mainConfig } from "./config";
import { HISTORY_FILE } from "./const";
import { COLORS, log } from "./logger";
import { multi } from "./multi";
import { killHard, processes } from "./process";
import { appendHistory, runCustomCommand, uniqueHistory } from "./rl.utils";

export const customCommandsProcess = new Map<string, ChildProcess>();

if (mainConfig.history && mainConfig.history > 0) {
	if (!existsSync(HISTORY_FILE)) writeFileSync(HISTORY_FILE, "");
}

const rlOpts: Readline.ReadLineOptions = {
	input: process.stdin,
	output: process.stdout,
	historySize: mainConfig.history,
	history: uniqueHistory(),
};

const trustedShells = [
	// TS/JS
	"yarn",
	"npm",
	"pnpm",
	"node",
	"bun",
	"tsc",
	// My tools
	"bumr",
	// Bash
	"git",
	// Docker
	"docker",
	"docker-compose",
	// Python
	"python",
	"pip",
	// Rust
	"cargo",
	// Go
	"go",
	// c/cpp
	"make",
	"cmake",
	"gcc",
	"clang",
	"g++",
	"qmake",
	"ninja",
];

// Handle terminal input events
const rl = Readline.createInterface(rlOpts);
rl.on("line", handleLine);

function interpolateCmd(template: string, args: string[]): string {
	let result = template;
	// Replace $1, $2, $3, ... with corresponding args (1-indexed like bash)
	result = result.replace(/\$(\d+)/g, (_, n) => {
		const idx = +n - 1;
		return idx >= 0 && idx < args.length ? args[idx] : "";
	});
	// Replace $@ with all args joined
	result = result.replace(/\$@/g, () => args.join(" "));
	// Replace $* with all args joined (alias for $@)
	result = result.replace(/\$\*/g, () => args.join(" "));

	const hasPlaceholders = /\$\d+|\$@|\$\*/.test(template);
	// If no placeholders were used, append args at the end
	if (!hasPlaceholders && args.length > 0) {
		result += " " + args.join(" ");
	}

	return result;
}

export function handleLine(input: string) {
	let cmdTrim = input.trim();
	const split = cmdTrim.split(" ");
	let index = +split[0];
	if (Number.isNaN(index)) index = 0;
	else cmdTrim = split.slice(1).join(" ");

	if (processes.length <= index) {
		log(COLORS.red, "Invalid process index");
		return;
	}

	const isNoLog = cmdTrim.startsWith("!");
	const rawKey = isNoLog ? cmdTrim.slice(1) : cmdTrim;
	const cmdParts = rawKey.split(" ");
	const eventKey = cmdParts[0];
	const cmdArgs = cmdParts.slice(1);

	const cmdTemplate = mainConfig.cmds[eventKey];
	if (cmdTemplate) {
		const resolved = interpolateCmd(cmdTemplate, cmdArgs);
		runCustomCommand(resolved, !isNoLog, configs[index].cwd);
	}

	if (cmdTrim.startsWith("$")) {
		const noLog = cmdTrim.startsWith("$!");
		runCustomCommand(cmdTrim.slice(noLog ? 2 : 1), noLog, configs[index].cwd);
		if (mainConfig.history && mainConfig.history > 0) appendHistory(cmdTrim);
	}

	const mergedShells = [
		...trustedShells,
		...mainConfig.trustedShells,
	];
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
			break;
		case "help":
			log(COLORS.green, "Commands:");
			log(
				COLORS.green,
				"",
				"<cmd> -> Run pre-defined command (see 'show-cmd')",
			);
			log(
				COLORS.green,
				"",
				"!<cmd> -> Run pre-defined command without pretty logging",
			);
			log(COLORS.green, "", "$<command> -> Run shell command");
			log(
				COLORS.green,
				"",
				"$!<command> -> Run shell command with pretty logging",
			);
			log(COLORS.green, "System commands:");
			log(COLORS.green, "", "rs -> Restart process");
			log(COLORS.green, "", "quit/exit -> Exit");
			log(COLORS.green, "", "help -> Show help");
			log(COLORS.green, "", "config -> Show current config");
			log(COLORS.green, "", "cls -> Clear console");
			log(COLORS.green, "", "unique-history -> Make history unique");
			log(COLORS.green, "", "show-cmd -> Show available custom commands");
			log(COLORS.green, "", "m -> Run multiple instances");
			log(COLORS.green, "", "show-m -> Show multiple configs");
			log(COLORS.green, "", "server [port] -> Start server");
			log(COLORS.green, "", "server stop -> Stop server");
			log(COLORS.green, "", "server open / so -> Open server link");
			log(COLORS.green, "Trusted shells:", trustedShells.join(", "));
			break;
		case "config":
			log(COLORS.green, "Current config:");
			console.log(Bun.JSON5.stringify(mainConfig, null, 2));
			break;
		case "cls":
			console.clear();
			break;
		case "unique-history":
			uniqueHistory();
			break;
		case "show-cmd":
			log(COLORS.green, "Available custom commands:");
			for (const [key, value] of Object.entries(mainConfig.cmds)) {
				log(COLORS.green, "", `${key} -> ${value}`);
			}
			break;
		case "m":
			multi();
			break;
		case "show-m":
			log(COLORS.green, "Available multiple configs:");
			for (const [key, value] of Object.entries(configs)) {
				log(
					COLORS.green,
					"",
					`${key} -> ${value.cmd} -> ${value.cwd} / ${value.watch.join(",")}`,
				);
			}
			break;
		case "so":
			cmdTrim = "server open";
	}

	if (cmdTrim.startsWith("server")) {
		const exists =
			[
				...customCommandsProcess.keys(),
			].filter(key => key.startsWith("server")).length > 0;
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

async function exitEvent() {
	log(COLORS.green, "Process interrupted. Exiting...");
	rl.close();
	processes.forEach(process => process.stopProcess());
	customCommandsProcess.forEach(process => killHard(process.pid));
	process.exit(0);
}

// Ensure Ctrl+C exits immediately
rl.on("SIGINT", exitEvent);
rl.on("SIGTERM", exitEvent);
