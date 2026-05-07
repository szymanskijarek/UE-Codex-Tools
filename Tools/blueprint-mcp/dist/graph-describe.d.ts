export interface NodeMap {
    [id: string]: any;
}
export declare function describeNode(node: any): string;
/** Annotate a node description with data pin input connections (#10) */
export declare function annotateDataFlow(node: any, nodeMap: NodeMap): string;
/** Annotate output data pins that feed into other nodes (#10) */
export declare function annotateDataOutputs(node: any, nodeMap: NodeMap): string[];
export declare function walkExecChain(startNodeId: string, nodeMap: NodeMap, visited: Set<string>, depth?: number): string[];
export declare function describeGraph(graphData: any): string;
export declare function summarizeBlueprint(data: any): string;
