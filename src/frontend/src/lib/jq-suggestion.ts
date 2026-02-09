export interface Suggestion {
    text: string;
    type: "property" | "index";
}

/**
 * Splits a simple jq query into path segments.
 * Only handles basic syntax like .foo.bar, .foo["bar"], [0], .[0]
 */
export function parseJqPath(query: string): string[] {
    if (!query || query === ".") return [];

    const segments: string[] = [];
    let current = "";
    let insideBrackets = false;
    let insideQuotes = false;

    for (let i = 0; i < query.length; i++) {
        const char = query[i];

        if (char === "[" && !insideQuotes) {
            if (current) segments.push(current);
            current = "";
            insideBrackets = true;
            continue;
        }

        if (char === "]" && insideBrackets && !insideQuotes) {
            if (current) segments.push(current);
            current = "";
            insideBrackets = false;
            continue;
        }

        if (char === '"' && insideBrackets) {
            insideQuotes = !insideQuotes;
            continue;
        }

        if (char === "." && !insideBrackets && !insideQuotes) {
            if (current) segments.push(current);
            current = "";
            continue;
        }

        current += char;
    }

    if (current) segments.push(current);
    return segments.filter(s => s !== "");
}

/**
 * Traverses the JSON object following the segments.
 * Returns the object at that path, or null if not found.
 */
export function resolvePath(json: any, segments: string[]): any {
    let current = json;
    for (const segment of segments) {
        if (current === null || typeof current !== "object") return null;

        // Check if it's an array index
        if (Array.isArray(current)) {
            const index = parseInt(segment, 10);
            if (isNaN(index)) return null;
            current = current[index];
        } else {
            current = current[segment];
        }
    }
    return current;
}

/**
 * Gets suggestions for the current query.
 */
export function getSuggestions(json: any, query: string): Suggestion[] {
    if (json === null || json === undefined) return [];

    // Normalize [] to [0] so we can resolve through array iterators to their element properties
    query = query.replace(/\[\]/g, "[0]");

    // Determine the base path and the prefix
    // e.g. ".foo.ba" -> base: ["foo"], prefix: "ba"
    // e.g. ".foo." -> base: ["foo"], prefix: ""
    // e.g. "." -> base: [], prefix: ""

    let baseSegments: string[] = [];
    let prefix = "";

    if (query.endsWith(".")) {
        baseSegments = parseJqPath(query.slice(0, -1));
        prefix = "";
    } else {
        const lastDot = query.lastIndexOf(".");
        const lastBracket = query.lastIndexOf("[");
        const lastBoundary = Math.max(lastDot, lastBracket);

        if (lastBoundary === -1) {
            prefix = query.startsWith(".") ? query.slice(1) : query;
            baseSegments = [];
        } else {
            const basePathStr = query.slice(0, lastBoundary);
            prefix = query.slice(lastBoundary + 1);

            // If it's a bracket boundary, we might need to handle it differently
            // but for simple cases, let's treat it as a segment separator.
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
                suggestions.push({ text: key, type: "property" });
            }
        }
    }

    return suggestions;
}
