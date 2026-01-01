#!/usr/bin/env bun

import { spawn } from "child_process";
import { startWatcher } from "./watcher";
const { argv, mainConfig: config } = await import("./config");

if (argv.run !== undefined) {
    let cmd = config.cmd;
    const sliceNum = parseInt(argv.run as string);

    if (!isNaN(sliceNum) && sliceNum > 0) {
        cmd = cmd.split("&&").slice(0, sliceNum).join("&&").trim();
    }

    console.log(`$ ${cmd}`);
    const child = spawn(cmd, {
        stdio: "inherit",
        shell: true,
    });

    child.on("exit", (code) => {
        process.exit(code ?? 0);
    });

} else {
    const { addProcess } = await import("./process");
    await import("./watcher");
    await import("./rl");

    const process = addProcess(config);
    process.startProcess();
    process.startupCommands();
    process.index = argv.multi ? 0 : undefined

    if (argv.multi)
        await import("./multi");
}

export { };