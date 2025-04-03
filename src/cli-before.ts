import fs from "fs";
import { COLORS, log } from "./logger";
import { CliNoConfigArgsData } from "./types";

const noConfigFlags: { [key: string]: (data?: CliNoConfigArgsData) => void } = {
    v: () => {
        const pkg = JSON.parse(fs.readFileSync(import.meta.dirname + "/../package.json", "utf8"));
        log(COLORS.green, `suglite version: ${pkg.version}`);
        process.exit(0);
    },

    h: showHelp,

    mc: (data) => {
        const { processArgs, config, preConfigsList, configPath } = data;
        if (fs.existsSync(configPath)) {
            log(COLORS.red, "Configuration already exists.");
            process.exit(1);
        }
        if (processArgs.length >= 2) {
            const preConfigName = processArgs[1];
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
    },
    
    mgc: (data) => {
        const { config, globalConfigDir, globalConfigPath } = data;
        if (fs.existsSync(globalConfigPath)) {
            log(COLORS.red, "Global configuration already exists.");
            process.exit(1);
        }
        if (!fs.existsSync(globalConfigDir)) fs.mkdirSync(globalConfigDir, { recursive: true });
        fs.writeFileSync(globalConfigPath, JSON.stringify(config, null, 4));
        log(COLORS.green, "Global configuration made at: " + globalConfigPath + ".");
        process.exit(0);
    },
}

export function noConfigArgs(data: CliNoConfigArgsData) {
    const processArgs = process.argv.slice(data.isDirectExec ? 2 : 1);
    if (processArgs.length === 0) return;

    const firstArg = processArgs[0];
    if (firstArg.startsWith("--version")) noConfigFlags.v(data);
    if (firstArg.startsWith("--help")) noConfigFlags.h(data);

    if (firstArg.startsWith("-")) {
        const flag = firstArg.slice(1);
        if (noConfigFlags[flag]) noConfigFlags[flag](data);
    }

}

function showHelp() {
    log(COLORS.green, "Usage: suglite [options] [command] [args...]");
    console.log("Meta options:");
    console.log("  -h            \t Show this help message");
    console.log("  -v            \t Show version number");
    console.log();
    console.log("CLI Configuration options:");
    console.log("  -p <name>     \t Use predefined configuration");
    console.log("  -c <cmd>      \t Use custom command");
    console.log("  -w <list>     \t Watch list of files");
    console.log("  --any=value   \t Set any configuration value");
    console.log();
    console.log("File Configuration options:");
    console.log("  -mc [name]    \t Make configuration (name for predefined configs)");
    console.log("  -mgc          \t Make global configuration");
    console.log();
    process.exit(0);
}