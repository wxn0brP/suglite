const commandTrigger = ["-c", "--cmd"];
export function groupArguments(input) {
    const result = [];
    let command = "";
    let hasCommand = false;
    for (const token of input) {
        if (!hasCommand) {
            if (commandTrigger.includes(token))
                hasCommand = true;
            result.push(token);
        }
        else {
            if (token.startsWith("-")) {
                result.push(command.trim());
                command = "";
                hasCommand = false;
                result.push(token);
                continue;
            }
            command += " " + token;
        }
    }
    if (command)
        result.push(command.trim());
    return result;
}
