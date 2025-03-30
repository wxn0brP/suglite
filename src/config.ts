import { homedir } from "os";
import { COLORS, log } from "./logger";
import { deepMerge } from "./utils";
import fs from "fs";

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

// Determine if executed with `node suglite.js` or as `./suglite`
const isDirectExec = process.argv[0].includes("node");

// Configuration interface
interface SugliteConfig {
    cmd?: string;
    args?: string[];
    watch?: string[];
    ignore?: string[];
    restart_cmd?: string;
    events?: Record<string, string>;
    history?: number;
}

// Default configuration
export let config: SugliteConfig = {
    cmd: "",
    args: [],
    watch: [],
    ignore: [],
    restart_cmd: "",
    events: {},
    history: 100,
};

// Predefined configurations
export const preConfigsList =
    fs.readdirSync(import.meta.dirname + "/../config")
        .map((file) => file.replace(".json", ""));

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

function ifFlag(flag: string) {
    return scriptArgs.length > 0 && scriptArgs[0] === "-" + flag;
}

if (ifFlag("h") || (scriptArgs.length >= 1 && scriptArgs[0] === "--help")) {
    log(COLORS.green, "Usage: suglite [options] [command] [args...]");
    log(COLORS.yellow, "Options:");
    log(COLORS.yellow, "", "  -h            \t Show this help message");
    log(COLORS.yellow, "", "  -v            \t Show version number");
    log(COLORS.yellow, "", "  -p <name>     \t Use predefined configuration");
    log(COLORS.yellow, "", "  -c <cmd>      \t Use custom command");
    log(COLORS.yellow, "", "  -mc [name]    \t Make configuration (name for predefined configs)");
    log(COLORS.yellow, "", "  --any=value   \t Set any configuration value");
    log(COLORS.yellow, "", "  -mgc          \t Make global configuration");
    process.exit(0);
}

if (ifFlag("v")) {
    const pkg = JSON.parse(fs.readFileSync(import.meta.dirname + "/../package.json", "utf8"));
    log(COLORS.green, `suglite version: ${pkg.version}`);
    process.exit(0);
}

if (ifFlag("p")) {
    if (scriptArgs.length < 2) {
        log(COLORS.green, "Available predefined configurations:");
        preConfigsList.forEach((key) => {
            log(COLORS.yellow, "", `${key}`);
        });
        process.exit(0);
    }
    const preConfigName = scriptArgs[1];
    if (preConfigsList.includes(preConfigName)) {
        const preConfigData = JSON.parse(fs.readFileSync(import.meta.dirname + `/../config/${preConfigName}.json`, "utf8"));
        config = deepMerge(config, preConfigData);
    }
}

if (ifFlag("mc")) {
    if (fs.existsSync(configPath)) {
        log(COLORS.red, "Configuration already exists.");
        process.exit(1);
    }
    if (scriptArgs.length >= 2) {
        const preConfigName = scriptArgs[1];
        if (preConfigsList.includes(preConfigName)) {
            const preConfigData = JSON.parse(fs.readFileSync(import.meta.dirname + `/../config/${preConfigName}.json`, "utf8"));
            fs.writeFileSync(configPath, JSON.stringify(preConfigData, null, 4));
            log(COLORS.green, "Configuration made based on `" + preConfigName + "`.");
            process.exit(0);
        }
    }
    fs.writeFileSync(configPath, JSON.stringify(config, null, 4));
    log(COLORS.green, "Configuration made.");
    process.exit(0);
}

if (ifFlag("mgc")) {
    if (fs.existsSync(globalConfigPath)) {
        log(COLORS.red, "Global configuration already exists.");
        process.exit(1);
    }

    if (!fs.existsSync(globalConfigDir)) fs.mkdirSync(globalConfigDir, { recursive: true });

    fs.writeFileSync(globalConfigPath, JSON.stringify(config, null, 4));
    log(COLORS.green, "Global configuration made at: " + globalConfigPath + ".");
    process.exit(0);
}

// Load `suglite.json` if exists
if (fs.existsSync(configPath)) {
    const localConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
    config = deepMerge(config, localConfig);
}

if (ifFlag("c")) {
    scriptArgs.shift();
    config.cmd = scriptArgs.join(" ");
}

for (const arg of scriptArgs) {
    if (arg.startsWith("--")) {
        let [key, value] = arg.slice(2).split("=");
        if (
            (value.startsWith("{") && value.endsWith("}")) ||
            (value.startsWith("[") && value.endsWith("]"))
        ) value = JSON.parse(value);
        config[key] = value;
    }
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