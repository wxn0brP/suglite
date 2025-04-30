import fs from "fs";
import { homedir } from "os";
import { handleCliArgs } from "./cli-after";
import { noConfigArgs } from "./cli-before";
import { COLORS, log } from "./logger";
import { SugliteConfig } from "./types";
import { deepMerge } from "./utils";

// Default configuration
export let config: SugliteConfig = {
    cmd: "",
    args: [],
    watch: [],
    ignore: [],
    restart_cmd: "",
    events: {},
    history: 100,
    delay: 0,
};

// Determine if executed with `node suglite.js` or as `./suglite`
const isDirectExec = process.argv[0].includes("node");

// Paths to configuration files
const configPath = "suglite.json";
const packagePath = "package.json";

// Paths to global configuration
const globalConfigDir = (
    process.platform === "win32" ?
        process.env.APPDATA || "" :
        homedir() + "/.config"
) + "/suglite";
const globalConfigPath = globalConfigDir + "/config.json";

// Predefined configurations
export const preConfigsList =
    fs.readdirSync(import.meta.dirname + "/../config")
        .map((file) => file.replace(".json", ""));


noConfigArgs({
    processArgs: [],
    isDirectExec,
    preConfigsList,
    config,
    configPath,
    globalConfigPath,
    globalConfigDir
});

// Load global configuration
if (fs.existsSync(globalConfigPath)) {
    const globalConfig = JSON.parse(fs.readFileSync(globalConfigPath, "utf8"));
    config = deepMerge(config, globalConfig);
    log(COLORS.cyan, "Global configuration loaded from: " + globalConfigPath);
}

// Parse arguments
const rawArgs = process.argv.slice(isDirectExec ? 2 : 1);
const doubleDashIndex = rawArgs.indexOf("--");

const scriptArgs = doubleDashIndex !== -1 ? rawArgs.slice(0, doubleDashIndex) : rawArgs;
const cmdArgs = doubleDashIndex !== -1 ? rawArgs.slice(doubleDashIndex + 1) : [];

function loadConfig(config: SugliteConfig) {
    // Load `suglite.json` if exists
    if (fs.existsSync(configPath)) {
        const localConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
        return deepMerge(config, localConfig);
    }

    return config;
}

// Handle CLI arguments and `suglite.json`
config = handleCliArgs({
    scriptArgs,
    config,
    loadConfig,
    preConfigsList,
});

// -w dist -> -w ["dist"]
if (typeof config.watch === "string") {
    config.watch = [config.watch];
}

// If no custom command, check `package.json`
if (!config.cmd && fs.existsSync(packagePath)) {
    const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
    if (pkg.main) {
        config.cmd = "node";
        config.args = [pkg.main];
    }
}

// If still no `cmd`, exit with error
if (!config.cmd) {
    log(COLORS.red, "No `cmd` found in config or `package.json`. Exiting.");
    process.exit(1);
}

export const processedCmd =
    config.cmd +
    (config.args?.length > 0 ? " " + config.args.join(" ") : "") +
    (cmdArgs.length > 0 ? " " + cmdArgs.join(" ") : "");