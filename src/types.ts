export interface SugliteConfig {
    ref?: string;
    cmd?: string;
    args?: string[];
    watch?: string[];
    ignore?: string[];
    restart_cmd?: string;
    events?: Record<string, string>;
    history?: number;
    delay?: number;
    trustedShells?: string[];
}