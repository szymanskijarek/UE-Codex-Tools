export declare const TYPE_NAME_DOCS = "Type name formats: C++ USTRUCTs use F-prefixed name (e.g. 'FVitals', 'FDeviceState'), BP structs (UserDefinedStruct) use asset name (e.g. 'S_Vitals'), enums use enum name (e.g. 'ELungSound'). Object references use colon syntax: 'object:Actor', 'softobject:Actor', 'class:Actor' (TSubclassOf), 'softclass:Actor', 'interface:MyInterface'.";
export declare const UNRESOLVED_TYPE_PATTERNS: string[];
export declare function flagType(typeName: string): string;
export declare function formatVarType(v: any): string;
/** Format parameter list for functions/events/delegates with type flagging (#9) */
export declare function formatParams(params: any[] | undefined): string;
/** Format updated state returned by mutation tools (#11) */
export declare function formatUpdatedState(data: any): string[];
