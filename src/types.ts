export interface SugliteConfig {
	ref?: string;
	cmd?: string;
	args?: string[];
	watch?: string[];
	ignore?: string[];
	restart_cmd?: string;
	restart_cmd_first_run?: boolean;
	clear_screen?: boolean;
	cmds?: Record<string, string>;
	history?: number;
	delay?: number;
	trustedShells?: string[];
	server?: false | number;
	server_map?: {
		get?: Record<string, string>;
		dir?: Record<string, string>;
		redirect?: Record<string, string>;
	};
	startup_cmd?: string[];
	cwd?: string;
}

declare global {
	var multiRun: boolean;
}
