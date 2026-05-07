import { type ChildProcess } from "node:child_process";
export declare const UE_PROJECT_DIR: string;
export declare const UE_PORT: number;
export declare const UE_BASE_URL: string;
export declare const PLUGIN_MODULE_NAME = "BlueprintMCP";
export declare const PLUGIN_DLL_NAME = "UnrealEditor-BlueprintMCP.dll";
export declare const state: {
    ueProcess: ChildProcess | null;
    editorMode: boolean;
    startupPromise: Promise<string | null> | null;
};
/**
 * Read the EngineAssociation field from the .uproject file.
 * Returns a short version string like "5.4" or "5.7", or null.
 */
export declare function readEngineVersion(): string | null;
export declare function findEditorCmd(): string | null;
/** Find the .uproject file in UE_PROJECT_DIR (auto-detect by globbing). */
export declare function findUProject(): string | null;
/**
 * Ensure the .modules file in Binaries/Win64/ lists the BlueprintMCP module.
 * A build of only the Game target will overwrite this file without the editor module,
 * causing the commandlet to fail with "module could not be found".
 */
export declare function ensureModulesFile(): void;
/**
 * Ask the UE5 server to shut down gracefully via /api/shutdown, then wait for
 * the process to exit. Falls back to kill after a timeout.
 */
export declare function gracefulShutdown(): Promise<void>;
/** Returns the health payload if the server is reachable, or null. */
export declare function getUEHealth(): Promise<{
    status: string;
    mode: string;
    blueprintCount: number;
    mapCount: number;
} | null>;
export declare function isUEHealthy(): Promise<boolean>;
export declare function waitForHealthy(timeoutSeconds?: number): Promise<boolean>;
export declare function spawnAndWait(): Promise<string | null>;
export declare function ensureUE(): Promise<string | null>;
export declare function ueGet(endpoint: string, params?: Record<string, string>): Promise<any>;
export declare function uePost(endpoint: string, body: Record<string, any>): Promise<any>;
