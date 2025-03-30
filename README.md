# Suglite  

**Suglite** is a simple tool for watching file changes and automatically restarting processes.  

## Installation  

Run the following command:  

```sh
yarn global add github:wxn0brP/suglite#dist
```

This downloads the `suglite` script and makes it executable.  

## Usage  

Run with the default command:  
```sh
suglite
```

Run with a custom command:  
```sh
suglite -c "node server.js"
```

Use a predefined configuration:  
```sh
suglite -p ts
```

Set a configuration value:  
```sh
suglite --cmd="node server.js" --watch="src"
```

See `suglite --help` for more options.

## Configuration  

Create a `suglite.json` file in your project directory eg:  
```json
{
  "cmd": "npm start",
  "watch": ["src"],
  "ignore": ["node_modules"],
  "restart_cmd": "clear",
  "history": 100,
  "events": {
    "clean": "rm -rf dist"
  }
}
```
or run
```sh
suglite -mc
```

## Interactive Commands  

While `suglite` is running, you can type:  
| Command | Description |
| --- | --- |
| `rs` | manual restart |
| `quit` | exit the program |
| `help` | list available commands |
| `config` | show current configuration |
| `cls` | clear the console |
| `$<command>` | execute a custom command (eg `$yarn add`) |
| `$!<command>` | execute a custom command with pretty logging |
| `<event>` | execute a custom command from `events` |
| `<!event>` | execute a custom command from `events` without pretty logging |