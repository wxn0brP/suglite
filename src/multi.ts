import { existsSync } from "fs";
import { dirname, join, resolve } from "path";
import { configs } from "./config";
import { getEmptyConfig, loadJson } from "./config.utils";
import { COLORS, log } from "./logger";
import { addProcess } from "./process";
import { SugliteConfig } from "./types";

export const file = "suglite.multi.json5";

export function multi() {
    if (globalThis.multiRun) return log(COLORS.red, "Multi already running");
    globalThis.multiRun = true;

    if (!existsSync(file)) {
        log(COLORS.red, `File ${file} not found`);
        return;
    }

    const multiConfigRaw = loadJson<(string | SugliteConfig)[]>(file);

    const multiConfig = multiConfigRaw.map((config) => {
        if (typeof config === "string") {
            let cwd = process.cwd();

            if (config.endsWith("/")) {
                cwd = join(cwd, config);
                config = config + "suglite.json5";
            } else {
                cwd = resolve(dirname(config));
            }

            if (!existsSync(config)) {
                log(COLORS.red, `File ${config} not found`);
                process.exit(1);
            }

            const cfg = Object.assign(getEmptyConfig(), loadJson<SugliteConfig>(config));
            cfg.cwd = cwd;
            return cfg;
        }
        return Object.assign(getEmptyConfig(), config);
    });

    multiConfig.forEach((config, i) => {
        let cmd = config.cmd;
        if (config.args?.length) cmd += " " + config.args.join(" ");
        configs.push(config);

        const process = addProcess(config);
        process.index = i + 1;
        process.startProcess();
        process.startupCommands();
    });
}