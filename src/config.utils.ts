import { readFileSync } from "fs";
import JSON5 from "json5";
import { SugliteConfig } from "./types";

export function loadJson<T = any>(path: string): T {
    try {
        return JSON5.parse(readFileSync(path, "utf8"));
    } catch (err) {
        return {} as T;
    }
}

export function getSuglitePath() {
    return import.meta.dirname + "/../";
}

export function loadPredefinedConfig(name: string) {
    return loadJson(getSuglitePath() + `config/${name}.json`);
}

export function getEmptyConfig() {
    let config: SugliteConfig = {
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
        cwd: process.cwd(),
    }
    return config;
}