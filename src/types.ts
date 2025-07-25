export interface SugliteConfig {
    cmd?: string;
    args?: string[];
    watch?: string[];
    ignore?: string[];
    restart_cmd?: string;
    events?: Record<string, string>;
    history?: number;
    delay?: number;
}

export interface CliNoConfigArgsData {
    isDirectExec: boolean;
    processArgs: string[];
    config: SugliteConfig;
    preConfigsList: string[];
    configPath: string;
    globalConfigPath: string;
    globalConfigDir: string;
}

export interface CliArgsData {
    scriptArgs: string[];
    config: SugliteConfig;
    loadConfig: (config: SugliteConfig, file?: string) => SugliteConfig;
    preConfigsList: string[];
    file: string;
}