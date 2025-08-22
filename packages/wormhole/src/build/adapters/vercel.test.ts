import { describe, expect, test } from "bun:test";
import { VercelAdapter } from "./vercel";

describe("VercelAdapter", () => {
    test("should create adapter instance", () => {
        const adapter = VercelAdapter();
        
        expect(adapter).toBeDefined();
        expect(typeof adapter.run).toBe("function");
        expect(typeof adapter.buildClientBundle).toBe("function");
        expect(typeof adapter.buildCSS).toBe("function");
        expect(typeof adapter.buildRouteFunction).toBe("function");
        expect(typeof adapter.buildCatchAllFunction).toBe("function");
    });
    
    test("should have correct interface methods", () => {
        const adapter = VercelAdapter();
        
        // Check that it implements the BuildAdapter interface
        expect(adapter.run).toBeDefined();
        
        // Check that it implements the VercelAdapter interface
        expect(adapter.buildClientBundle).toBeDefined();
        expect(adapter.buildCSS).toBeDefined();
        expect(adapter.buildRouteFunction).toBeDefined();
        expect(adapter.buildCatchAllFunction).toBeDefined();
    });
});