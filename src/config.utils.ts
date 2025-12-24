import { readFileSync } from "fs";
import JSON5 from "json5";

export function loadJson(path: string) {
    try {
        return JSON5.parse(readFileSync(path, "utf8"));
    } catch (err) {
        return {};
    }
}

export function getSuglitePath() {
    return import.meta.dirname + "/../";
}

export function loadPredefinedConfig(name: string) {
    return loadJson(getSuglitePath() + `config/${name}.json`);
}