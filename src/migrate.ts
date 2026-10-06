import { existsSync, readFileSync, rmSync, writeFileSync } from "fs";
import { loadJson, saveJson5 } from "./config.utils";
import { COLORS, log } from "./logger";

interface MigrationResult {
	config: Record<string, any>;
	warnings: string[];
	source: string;
}

function cleanConfig(config: Record<string, any>) {
	const cleaned: Record<string, any> = {};
	for (const [key, value] of Object.entries(config)) {
		if (!value) continue;
		if (Array.isArray(value) && value.length === 0) continue;
		if (
			typeof value === "object" &&
			!Array.isArray(value) &&
			Object.keys(value).length === 0
		)
			continue;
		cleaned[key] = value;
	}
	return cleaned;
}

export function migrateFromNodemon(path = "nodemon.json"): MigrationResult {
	const warnings: string[] = [];
	const config: Record<string, any> = {};

	if (!existsSync(path)) {
		throw new Error(`File not found: ${path}`);
	}

	const nodemon = JSON.parse(readFileSync(path, "utf8"));

	if (nodemon.exec) config.cmd = nodemon.exec;
	if (nodemon.delay) config.delay = parseInt(nodemon.delay) / 1000;
	if (nodemon.env) config.env = nodemon.env;
	if (nodemon.restartable) warnings.push("restartable not supported");

	if (nodemon.watch)
		config.watch = Array.isArray(nodemon.watch)
			? nodemon.watch
			: [
					nodemon.watch,
				];

	if (nodemon.ignore)
		config.ignore = Array.isArray(nodemon.ignore)
			? nodemon.ignore
			: [
					nodemon.ignore,
				];

	if (nodemon.ext) {
		const exts = nodemon.ext.split(",").map((e: string) => e.trim());
		warnings.push(
			`File extensions (${exts.join(", ")}) - use watch patterns if needed`,
		);
	}

	if (nodemon.execMap) {
		warnings.push("execMap converted to cmd - verify the command");
		if (nodemon.execMap.ts || nodemon.execMap.js)
			config.cmd = nodemon.execMap.ts || nodemon.execMap.js;
	}

	if (nodemon.events) {
		warnings.push("events deprecated - use cmds instead");
		config.cmds = {};
		if (nodemon.events.restart) config.cmds.restart = nodemon.events.restart;
	}

	return {
		config: cleanConfig(config),
		warnings,
		source: path,
	};
}

export function detectMigrationSource() {
	for (const file of Object.keys(migrationSources)) {
		if (existsSync(file)) return file;
	}
	return null;
}

function migrateFromJson(): MigrationResult {
	if (!existsSync("suglite.json")) {
		throw new Error("No suglite.json found");
	}
	log(COLORS.cyan, "Migrating suglite.json to suglite.json5...");
	const config = loadJson("suglite.json");
	rmSync("suglite.json");
	return {
		config: cleanConfig(config),
		warnings: [],
		source: "suglite.json",
	};
}

const migrationSources: Record<string, (path: string) => MigrationResult> = {
	"suglite.json": () => migrateFromJson(),
	"nodemon.json": path => migrateFromNodemon(path),
	".nodemonrc": path => migrateFromNodemon(path),
};

export function migrate(source?: string, outputPath = "suglite.json5") {
	const detectedSource = source ?? detectMigrationSource();
	if (!detectedSource) {
		log(COLORS.red, "No migration source detected");
		process.exit(1);
	}

	const handler = migrationSources[detectedSource];
	if (!handler) {
		log(COLORS.red, `Unknown migration source: ${detectedSource}`);
		process.exit(1);
	}

	let result: MigrationResult;
	try {
		result = handler(detectedSource);
	} catch (err) {
		log(COLORS.red, `Migration failed: ${err}`);
		process.exit(1);
	}

	log(COLORS.cyan, `Migrating from ${result.source}`);
	for (const [key, value] of Object.entries(result.config))
		log(COLORS.green, "", `${key}: ${JSON.stringify(value)}`);

	for (const warning of result.warnings) log(COLORS.yellow, "", warning);

	if (existsSync(outputPath)) {
		writeFileSync(outputPath + ".backup", readFileSync(outputPath));
		log(COLORS.yellow, `Backup saved: ${outputPath}.backup`);
	}

	saveJson5(outputPath, result.config);
	log(COLORS.green, `Config saved: ${outputPath}`);
}
