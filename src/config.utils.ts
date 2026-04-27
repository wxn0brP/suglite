import { readFileSync, writeFileSync } from "fs";
import { SugliteConfig } from "./types";

export function loadJson<T = any>(path: string): T {
    try {
        return Bun.JSON5.parse(readFileSync(path, "utf8")) as any;
    } catch (err) {
        return {} as T;
    }
}

export function saveJson5(path: string, data: any) {
    writeFileSync(path, Bun.JSON5.stringify(data, null, 4));
}

export function getSuglitePath() {
    return import.meta.dirname + "/../";
}

export function loadPredefinedConfig(name: string) {
    return loadJson(getSuglitePath() + `config/${name}.json5`);
}

export function getEmptyConfig() {
    let config: SugliteConfig = {
        cmd: "",
        args: [],
        watch: [],
        ignore: [],
        restart_cmd: "",
        cmds: {},
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
