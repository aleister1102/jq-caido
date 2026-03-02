import get from "lodash-es/get";
import toPath from "lodash-es/toPath";

export interface Suggestion {
    text: string;
    type: "property" | "index";
    dataType?: string;
}

/**
 * Splits a simple jq query into path segments.
 * Only handles basic syntax like .foo.bar, .foo["bar"], [0], .[0]
 */
export function parseJqPath(query: string): string[] {
    if (!query || query === ".") return [];

    const normalized = query
        .trim()
        .replace(/^\./, "")
        .replace(/\[\]/g, "[0]");

    if (!normalized) return [];

    return toPath(normalized)
        .map(String)
        .filter((segment) => segment.length > 0);
}

/**
 * Traverses the JSON object following the segments.
 * Returns the object at that path, or null if not found.
 */
export function resolvePath(json: any, segments: string[]): any {
    if (segments.length === 0) return json;
    const value = get(json, segments);
    return value === undefined ? null : value;
}

/**
 * Gets a human-readable type name for a value
 */
function getDataType(value: any): string {
    if (value === null) return "null";
    if (Array.isArray(value)) return "array";
    if (typeof value === "object") return "object";
    return typeof value;
}
export function getSuggestions(json: any, query: string): Suggestion[] {
    if (json === null || json === undefined) return [];

    // Normalize [] to [0] so we can resolve through array iterators to their element properties
    query = query.replace(/\[\]/g, "[0]");

    // Determine the base path and the prefix for autocomplete suggestions
    // e.g. ".foo.ba" -> base: ["foo"], prefix: "ba" (suggest properties of foo starting with "ba")
    // e.g. ".foo." -> base: ["foo"], prefix: "" (suggest all properties of foo)
    // e.g. "." -> base: [], prefix: "" (suggest all root properties)
    // e.g. "ba" -> base: [], prefix: "ba" (suggest root properties starting with "ba")

    let baseSegments: string[] = [];
    let prefix = "";

    if (query.endsWith(".")) {
        // Query ends with dot, so we're at a complete path wanting all properties
        // e.g. ".user." -> base is ".user", prefix is empty
        baseSegments = parseJqPath(query.slice(0, -1));
        prefix = "";
    } else {
        // Find the last meaningful boundary (dot or bracket) to split complete vs incomplete parts
        const lastDot = query.lastIndexOf(".");
        const lastBracket = query.lastIndexOf("[");
        const lastBoundary = Math.max(lastDot, lastBracket);

        if (lastBoundary === -1) {
            // No dots or brackets found - this is a root-level property prefix
            // e.g. "us" -> we're typing a root property starting with "us"
            prefix = query.startsWith(".") ? query.slice(1) : query;
            baseSegments = [];
        } else {
            // Split at the last boundary: base path + current prefix being typed
            // e.g. ".user.na" -> base: ".user", prefix: "na"
            // e.g. ".items[0].ti" -> base: ".items[0]", prefix: "ti"
            const basePathStr = query.slice(0, lastBoundary);
            prefix = query.slice(lastBoundary + 1);

            // Parse the base path to get navigation segments
            baseSegments = parseJqPath(basePathStr);
        }
    }

    const baseNode = resolvePath(json, baseSegments);
    if (baseNode === null || typeof baseNode !== "object") return [];

    const suggestions: Suggestion[] = [];

    if (Array.isArray(baseNode)) {
        // If it's an array, suggest indices? 
        // Usually jq users want to know the length or patterns.
        // For now, let's suggest the available indices if short, or just types.
        if (baseNode.length > 0) {
            for (let i = 0; i < Math.min(baseNode.length, 10); i++) {
                if (String(i).startsWith(prefix)) {
                    suggestions.push({ text: `[${i}]`, type: "index" });
                }
            }
        }
    } else {
        // It's an object, suggest keys
        const keys = Object.keys(baseNode);
        for (const key of keys) {
            if (key.startsWith(prefix)) {
                const value = (baseNode as any)[key];
                suggestions.push({
                    text: key,
                    type: "property",
                    dataType: getDataType(value)
                });
            }
        }
    }

    return suggestions;
}
