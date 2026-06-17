# Suglite  

**Suglite** is a simple tool for watching file changes and automatically restarting processes.  

## Installation  

Run the following command:  

```sh
ingr suglite
```

OR

```sh
bunx @wxn0brp/ing i suglite
```

This downloads the `suglite` script and makes it executable.  

## Usage  

Run with the default command:

```sh
suglite
```

Run with a custom command:

```sh
suglite -c bun run server.js
```

Use a predefined configuration: (e.g. for python)

```sh
suglite -p py
```

See `suglite --help` for more options.

## Global Configuration  

Global configuration is stored in:
- Linux: `~/.config/suglite/config.json`.
- Windows: `%APPDATA%\suglite\config.json`.

## VSC Lint

```json
"json5.schemas": [
    {
        "fileMatch": [
            "suglite.json5"
        ],
        "url": "https://raw.githubusercontent.com/wxn0brP/suglite/refs/heads/master/schema.json"
    },
],
```

## License

MIT
