#!/usr/bin/env node
import { spawn } from "child_process";
const { argv, processedCmd } = await import("./config.js");
if (argv.run !== undefined) {
    let cmd = processedCmd;
    const sliceNum = parseInt(argv.run);
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
}
else {
    const { startProcess } = await import("./process.js");
    await import("./watcher.js");
    await import("./rl.js");
    startProcess();
}
