export function groupArguments(input: string[]): string[] {
    const result: string[] = [];

    let command = "";
    let hasCommand = false;

    for (const token of input) {
        if (!hasCommand) {
            if (token === "-c" || token === "--cmd") hasCommand = true;
            result.push(token);
        } else {
            if (token.startsWith("-")) {
                result.push(`"` + command.trim() + `"`);
                command = "";
                hasCommand = false;
                result.push(token);
                continue;
            }
            command += " " + token;
        }
    }

    return result;
}