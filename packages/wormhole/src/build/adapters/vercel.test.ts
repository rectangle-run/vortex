import { describe, expect, test } from "bun:test";
import { VercelAdapter } from "./vercel";

describe("VercelAdapter", () => {
    test("should create adapter instance", () => {
        const adapter = VercelAdapter();
        
        expect(adapter).toBeDefined();
        expect(typeof adapter.run).toBe("function");
        expect(typeof adapter.buildForLocation).toBe("function");
        expect(typeof adapter.buildCSS).toBe("function");
    });
    
    test("should have correct interface methods", () => {
        const adapter = VercelAdapter();
        
        // Check that it implements the BuildAdapter interface
        expect(adapter.run).toBeDefined();
        
        // Check that it implements the VercelAdapter interface
        expect(adapter.buildForLocation).toBeDefined();
        expect(adapter.buildCSS).toBeDefined();
    });
});