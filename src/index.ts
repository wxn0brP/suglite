#!/usr/bin/env bun

import { spawn } from "child_process";
const { argv, processedCmd } = await import("./config");

if (argv.run !== undefined) {
    let cmd = processedCmd;
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
    const { startProcess, startupCommands } = await import("./process");
    await import("./watcher");
    await import("./rl");

    startProcess();
    startupCommands();
}

export { };