import fs from "fs";
import { COLORS, log } from "./logger.js";
import { deepMerge } from "./utils.js";
const cliConfigFlags = {
    p: (data) => {
        const { scriptArgs, config, preConfigsList } = data;
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
            data.config = deepMerge(config, preConfigData);
        }
    },
};
const cliAliases = {
    w: "watch",
};
export function handleCliArgs(data) {
    const { scriptArgs, config, loadConfig } = data;
    for (const arg of scriptArgs) {
        if (arg.startsWith("-")) {
            const flag = arg.slice(1);
            if (cliConfigFlags[flag])
                cliConfigFlags[flag](data);
        }
    }
    data.config = loadConfig(config);
    if (scriptArgs.length >= 2 && scriptArgs[0] === "-c") {
        const isOnlyC = scriptArgs.map(arg => arg.includes("--")).filter(Boolean).length === 0;
        if (isOnlyC) {
            config.cmd = scriptArgs.slice(1).join(" ");
        }
        else {
            const index = scriptArgs.findIndex(arg => arg.includes("--"));
            config.cmd = scriptArgs.slice(1, index).join(" ");
        }
    }
    for (let i = 0; i < scriptArgs.length; i++) {
        const arg = scriptArgs[i];
        let key;
        if (arg.startsWith("--"))
            key = arg.slice(2);
        else if (arg.startsWith("-") && cliAliases[arg.slice(1)])
            key = cliAliases[arg.slice(1)];
        if (!key)
            continue;
        let value;
        if (arg.includes("="))
            [key, value] = arg.slice(2).split("=");
        else {
            const index = scriptArgs.slice(i + 1).findIndex(arg => arg.startsWith("--"));
            if (index !== -1) {
                value = scriptArgs.slice(i, index);
                i = index + i;
            }
            else
                value = scriptArgs.slice(i + 1);
            value = value.join(" ");
        }
        if (!value || value.trim() === "")
            continue;
        if ((value.startsWith("{") && value.endsWith("}")) ||
            (value.startsWith("[") && value.endsWith("]")))
            value = JSON.parse(value);
        else if (!isNaN(Number(value)))
            value = Number(value);
        else if (value === "true")
            value = true;
        else if (value === "false")
            value = false;
        config[key] = value;
    }
    return data.config;
}
