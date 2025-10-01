# Suglite  

**Suglite** is a simple tool for watching file changes and automatically restarting processes.  

## Installation  

Run the following command:  

```sh
yarn global add github:wxn0brP/suglite
```
OR
```sh
bun add -g github:wxn0brP/suglite
```

This downloads the `suglite` script and makes it executable.  

## Usage  

Run with the default command:  
```sh
suglite
```

Run with a custom command:  
```sh
suglite -c node server.js
```

Use a predefined configuration: (e.g. for python)
```sh
suglite -p py
```

See `suglite --help` for more options.

## Interactive Commands  

While `suglite` is running, you can type:  
| Command | Description |
| --- | --- |
| `rs` | manual restart |
| `quit` | exit the program |
| `help` | list available commands |
| `config` | show current configuration |
| `cls` | clear the console |
| `$<command>` | execute a shell command (eg `$yarn add`) |
| `$!<command>` | execute a shell command with pretty logging |
| `<event>` | execute a custom command from `events` |
| `<!event>` | execute a custom command from `events` without pretty logging |

## Global Configuration  

Global configuration is stored in:
- Linux: `~/.config/suglite/config.json`.
- Windows: `%APPDATA%\suglite\config.json`.