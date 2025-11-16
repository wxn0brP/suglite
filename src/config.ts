import { existsSync, mkdirSync, writeFileSync } from "fs";
import { homedir } from "os";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { getSuglitePath, loadJson, loadPredefinedConfig } from "./config.utils";
import { groupArguments } from "./groupArgs";
import { COLORS, log } from "./logger";
import { SugliteConfig } from "./types";
import { deepMerge } from "./utils";

const { version } = loadJson(getSuglitePath() + "package.json");

export let config: SugliteConfig = {
    cmd: "",
    args: [],
    watch: [],
    ignore: [],
    restart_cmd: "",
    events: {},
    history: 100,
    delay: 0,
    trustedShells: [],
    server: false,
    server_map: {
        get: {},
        dir: {},
        redirect: {},
    },
    startup_cmd: [],
}

const globalConfigDir = (
    process.platform === "win32" ?
        process.env.APPDATA || "" :
        homedir() + "/.config"
) + "/suglite";
const globalConfigPath = globalConfigDir + "/config.json";

const rawArgs = groupArguments(process.argv);
export const argv = await yargs(hideBin(rawArgs))
    .scriptName("suglite")
    .version(version)

    // suglite config
    .option("ref", {
        type: "string",
        description: "Reference config to other config (extend)",
    })
    .option("cmd", {
        alias: "c",
        type: "string",
        description: "Command to run",
    })
    .option("args", {
        alias: "a",
        type: "array",
        description: "Command arguments",
    })
    .option("watch", {
        alias: "w",
        type: "array",
        description: "Watch directories",
    })
    .option("ignore", {
        alias: "i",
        type: "array",
        description: "Ignore directories",
    })
    .option("restart-cmd", {
        alias: "r",
        type: "string",
        description: "Command to run on restart",
    })
    .option("history", {
        alias: "y",
        type: "number",
        description: "History size",
    })
    .option("delay", {
        alias: "d",
        type: "number",
        description: "Delay before restarting",
    })
    .option("trusted-shells", {
        alias: "t",
        type: "array",
        description: "Trusted shells",
    })
    .option("server", {
        alias: "s",
        type: "number",
        description: "Port for server",
    })

    // runtime config
    .option("p", {
        type: "string",
        description: "Use predefined config",
    })

    .option("run", {
        type: "string",
        description: "Run command once and exit",
    })

    .option("file", {
        alias: "f",
        type: "string",
        description: "Config file",
        default: "suglite.json",
    })

    // make config
    .command("mc [name]", "Make config", (yargs) => yargs
        .positional("name", { type: "string", description: "Predefined config reference name" }),
        (arg) => {
            const file = arg.file ? arg.file : "suglite.json";
            if (existsSync(file)) {
                log(COLORS.red, file + " already exists");
                process.exit(1);
            }
            if (arg.name) {
                config = deepMerge(config, loadPredefinedConfig(arg.name));
                log(COLORS.yellow, `Using predefined config: ${arg.name}`);
            }
            writeFileSync(file, JSON.stringify(config, null, 4));
            log(COLORS.green, file + " created");
            process.exit(0);
        })

    .command("mgc", "Make global config", () => {
        if (existsSync(globalConfigPath)) {
            log(COLORS.red, globalConfigPath + " already exists");
            process.exit(1);
        }
        if (!existsSync(globalConfigDir)) mkdirSync(globalConfigDir);
        writeFileSync(globalConfigPath, JSON.stringify(config, null, 4));
        log(COLORS.green, globalConfigPath + " created");
        process.exit(0);
    })

    .command("id", "display instance info", () => {
        log(COLORS.cyan, "Dir: ", import.meta.dirname.split("/").slice(0, -1).join("/"));
        log(COLORS.cyan, "Version: ", version);
        process.exit(0);
    })

    .help()
    .alias("h", "help")
    .alias("v", "version")
    .strict()
    .parse();

const globalConfig = existsSync(globalConfigPath) ? loadJson(globalConfigPath) : {};
config = deepMerge(config, globalConfig);
log(COLORS.cyan, "Global configuration loaded from: " + globalConfigPath);

if (argv.p) {
    config = deepMerge(config, loadPredefinedConfig(argv.p));
    log(COLORS.yellow, `Using predefined config: ${argv.p}`);
}

if (existsSync(argv.file)) {
    const localConfig = loadJson(argv.file) as Partial<SugliteConfig>;

    if (localConfig.ref) {
        let refConfig = {};
        if (existsSync(localConfig.ref)) {
            refConfig = loadJson(localConfig.ref);
        } else {
            refConfig = loadPredefinedConfig(localConfig.ref);
        }

        config = deepMerge(config, refConfig);
        log(COLORS.cyan, `Using referenced config: ${localConfig.ref}`);
    }

    config = deepMerge(config, localConfig);
    log(COLORS.cyan, "Local configuration loaded from: " + argv.file);
}

if (argv.cmd) config.cmd = argv.cmd;
if (argv.args) config.args = argv.args as string[];
if (argv.watch) config.watch = argv.watch as string[];
if (argv.ignore) config.ignore = argv.ignore as string[];
if (argv.restart_cmd) config.restart_cmd = argv.restartCmd;
if (argv.history) config.history = argv.history;
if (argv.delay) config.delay = argv.delay;
if (argv.trustedShells) config.trustedShells = argv.trustedShells as string[];
if (argv.server) config.server = argv.server;

// @ts-ignore
if (typeof config.watch === "string") config.watch = [config.watch];
// @ts-ignore
if (typeof config.ignore === "string") config.ignore = [config.ignore];

if (!config.cmd && existsSync("package.json")) {
    const pkg = loadJson("package.json");

    if (pkg?.scripts?.start) {
        config.cmd = pkg.scripts.start;
    } else if (pkg?.main) {
        config.cmd = "node " + pkg.main;
    }
}

if (!config.cmd) {
    log(COLORS.red, "No `cmd` found in config or `package.json`. Exiting.");
    process.exit(1);
}

const dash = rawArgs.indexOf("--");
const cmdArgs = dash !== -1 ? rawArgs.slice(dash + 1) : [];
export let processedCmd =
    config.cmd +
    (config.args?.length > 0 ? " " + config.args.join(" ") : "") +
    (cmdArgs.length > 0 ? " " + cmdArgs.join(" ") : "");

if ((processedCmd.startsWith(`"`) && processedCmd.endsWith(`"`)) || (processedCmd.startsWith(`'`) && processedCmd.endsWith(`'`))) {
    processedCmd = processedCmd.slice(1, -1);
}