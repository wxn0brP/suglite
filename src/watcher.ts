import { watch } from "fs";
import pm from "picomatch";
import { SugliteProcess } from "./process";
import { SugliteConfig } from "./types";

function normalizePatterns(patterns: string[]) {
    return patterns.map(p => {
        if (!p.includes("*") && !p.includes("."))
            return p.endsWith("/") ? `${p}**` : `${p}/**`;
        return p;
    });
};

export function startWatcher(config: SugliteConfig, process: SugliteProcess) {
    const rawWatchList = config.watch.length > 0 ? config.watch : ["**/*"];
    const rawIgnoreList = config.ignore || [];

    const watchPatterns = normalizePatterns(rawWatchList);
    const ignorePatterns = normalizePatterns(rawIgnoreList);

    const isMatch = pm(watchPatterns, { ignore: ignorePatterns, dot: true });

    watch(config.cwd, { recursive: true }, (event, filename) => {
        if (!filename) return;

        const rel = filename.replace(/\\/g, "/");
        if (!isMatch(rel)) return;

        process.startProcess();
    });
}
