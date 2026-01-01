import chokidar from "chokidar";
import { SugliteProcess } from "./process";
import { SugliteConfig } from "./types";
import { join } from "path";

export function startWatcher(config: SugliteConfig, process: SugliteProcess) {
    const watchList = config.watch.length > 0 ? config.watch : ["."];

    const watcher = chokidar.watch(addCwd(config.cwd, watchList), {
        ignored: addCwd(config.cwd, config.ignore || []),
        ignoreInitial: true,
    });

    function restart() {
        process.startProcess();
    }

    watcher.on("change", restart);
    watcher.on("unlink", restart);
    watcher.on("add", restart);
}

function addCwd(cwd: string, paths: string[]) {
    return paths.map(path => join(cwd, path));
}