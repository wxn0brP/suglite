import fs from "fs";
import { homedir } from "os";
import { handleCliArgs } from "./cli-after.js";
import { noConfigArgs } from "./cli-before.js";
import { COLORS, log } from "./logger.js";
import { deepMerge } from "./utils.js";
export let config = {
    cmd: "",
    args: [],
    watch: [],
    ignore: [],
    restart_cmd: "",
    events: {},
    history: 100,
    delay: 0,
};
const isDirectExec = process.argv[0].includes("node");
const packagePath = "package.json";
const globalConfigDir = (process.platform === "win32" ?
    process.env.APPDATA || "" :
    homedir() + "/.config") + "/suglite";
const globalConfigPath = globalConfigDir + "/config.json";
export const preConfigsList = fs.readdirSync(import.meta.dirname + "/../config")
    .map((file) => file.replace(".json", ""));
noConfigArgs({
    processArgs: [],
    isDirectExec,
    preConfigsList,
    config,
    configPath: "suglite.json",
    globalConfigPath,
    globalConfigDir
});
if (fs.existsSync(globalConfigPath)) {
    const globalConfig = JSON.parse(fs.readFileSync(globalConfigPath, "utf8"));
    config = deepMerge(config, globalConfig);
    log(COLORS.cyan, "Global configuration loaded from: " + globalConfigPath);
}
const rawArgs = process.argv.slice(isDirectExec ? 2 : 1);
const doubleDashIndex = rawArgs.indexOf("--");
const scriptArgs = doubleDashIndex !== -1 ? rawArgs.slice(0, doubleDashIndex) : rawArgs;
const cmdArgs = doubleDashIndex !== -1 ? rawArgs.slice(doubleDashIndex + 1) : [];
function loadConfig(config, configPath = "suglite.json") {
    if (fs.existsSync(configPath)) {
        const localConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
        return deepMerge(config, localConfig);
    }
    return config;
}
config = handleCliArgs({
    scriptArgs,
    config,
    loadConfig,
    preConfigsList,
    file: "suglite.json"
});
if (typeof config.watch === "string") {
    config.watch = [config.watch];
}
if (!config.cmd && fs.existsSync(packagePath)) {
    const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
    if (pkg.main) {
        config.cmd = "node";
        config.args = [pkg.main];
    }
}
if (!config.cmd) {
    log(COLORS.red, "No `cmd` found in config or `package.json`. Exiting.");
    process.exit(1);
}
export const processedCmd = config.cmd +
    (config.args?.length > 0 ? " " + config.args.join(" ") : "") +
    (cmdArgs.length > 0 ? " " + cmdArgs.join(" ") : "");
