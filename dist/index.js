#!/usr/bin/env node
await import("./config.js");
const { startProcess } = await import("./process.js");
await import("./watcher.js");
await import("./rl.js");
startProcess();
export {};
