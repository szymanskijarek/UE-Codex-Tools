import { isUEHealthy, ueGet } from "../ue-bridge.js";
export function registerBlueprintListResource(server) {
    server.resource("blueprint-list", "blueprint:///list", { description: "List of all exported Blueprints", mimeType: "application/json" }, async (uri) => {
        if (!(await isUEHealthy())) {
            return { contents: [{ uri: uri.href, text: "[]", mimeType: "application/json" }] };
        }
        const data = await ueGet("/api/list");
        return { contents: [{ uri: uri.href, text: JSON.stringify(data.blueprints, null, 2), mimeType: "application/json" }] };
    });
}
//# sourceMappingURL=blueprint-list.js.map