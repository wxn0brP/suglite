#!/usr/bin/env node

await import("./config");
const { startProcess } = await import("./process");
await import("./watcher");
await import("./rl");

startProcess();

export { };