import fs from "fs";
import { COLORS, log } from "./logger";
import { CliArgsData } from "./types";
import { deepMerge } from "./utils";

const cliConfigFlags: { [key: string]: (data: CliArgsData) => void } = {
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
    f: (data) => {
        const filePath = data.scriptArgs[1];
        data.file = filePath;
    },
}

const cliAliases: { [key: string]: string } = {
    w: "watch",
    c: "cmd",
    d: "delay",
}

function parseValue(value: string): any {
    if (
        (value.startsWith("{") && value.endsWith("}")) ||
        (value.startsWith("[") && value.endsWith("]"))
    ) return JSON.parse(value);
    else if (!isNaN(Number(value))) return Number(value);
    else if (value === "true") return true;
    else if (value === "false") return false;
    return value;
}

export function handleCliArgs(data: CliArgsData) {
    const { scriptArgs, config, loadConfig } = data;

    for (const arg of scriptArgs) {
        if (arg.startsWith("-")) {
            const flag = arg.slice(1);
            if (cliConfigFlags[flag]) cliConfigFlags[flag](data);
        }
    }

    data.config = loadConfig(config, data.file);

    let temp = "";

    for (let i = 0; i < scriptArgs.length; i++) {
        const arg = scriptArgs[i];

        if (arg.startsWith("-")) {
            for (let j = i + 1; j < scriptArgs.length; j++) {
                const nextArg = scriptArgs[j];
                if (nextArg.startsWith("-")) break;
                i = j;
                temp += nextArg + " ";
            }
        }

        const value = parseValue(temp.trim());
        temp = "";

        let key: string;

        if (arg.startsWith("--")) key = arg.slice(2);
        else if (arg.startsWith("-") && cliAliases[arg.slice(1)]) key = cliAliases[arg.slice(1)];

        if (!key) continue;

        config[key] = value;
    }

    return data.config;
}