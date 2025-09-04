import { readFileSync } from "fs";
export function loadJson(path) {
    try {
        return JSON.parse(readFileSync(path, "utf8"));
    }
    catch (err) {
        return {};
    }
}
export function getSuglitePath() {
    return import.meta.dirname + "/../";
}
export function loadPredefinedConfig(name) {
    return loadJson(getSuglitePath() + `config/${name}.json`);
}
