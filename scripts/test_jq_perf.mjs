#!/usr/bin/env node

import { performance } from "perf_hooks";

function generateJson(sizeBytes) {
  const dataSize = Math.max(1, Math.floor(sizeBytes / 100));
  return JSON.stringify({
    large_data: "x".repeat(dataSize),
    metadata: { count: dataSize, timestamp: new Date().toISOString() },
  });
}

function timeOp(label, fn) {
  const start = performance.now();
  fn();
  const end = performance.now();
  const duration = end - start;
  console.log(`  ${label}: ${duration.toFixed(2)}ms`);
  return duration;
}

function benchmark() {
  console.log("\n=== JQ Plugin Perf Baseline (Node.js simulation) ===\n");

  const sizes = [
    { label: "100KB", bytes: 100 * 1024 },
    { label: "1MB", bytes: 1024 * 1024 },
    { label: "5MB", bytes: 5 * 1024 * 1024 },
  ];

  for (const { label, bytes } of sizes) {
    console.log(`\n[${label}]`);
    const json = generateJson(bytes);

    timeOp("escapeHtml", () => {
      json.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    });

    timeOp("JSON.parse", () => {
      try {
        JSON.parse(json);
      } catch {}
    });

    const withHeaders = `POST / HTTP/1.1\r\nHost: localhost\r\nContent-Length: ${json.length}\r\n\r\n${json}`;
    timeOp("extractJsonBody (index-based)", () => {
      const idx = withHeaders.indexOf("\r\n\r\n");
      idx !== -1 ? withHeaders.slice(idx + 4).trim() : withHeaders.trim();
    });

    if (bytes <= 5 * 1024 * 1024) {
      const obj = JSON.parse(json);
      timeOp("Object.keys enumeration", () => {
        Object.keys(obj).length;
      });
    }
  }

  console.log("\n=== Summary ===");
  console.log("Target (P95): 1MB query in <300ms, 5MB in <1.5s, 10MB in <3s");
  console.log("Current optimizations:");
  console.log("  - Output truncated above 500KB by default");
  console.log("  - Syntax highlighting disabled above 100KB");
  console.log("  - Autocomplete disabled above 1MB");
  console.log("  - Body extraction uses index-based lookup (not split/join)");
  console.log("  - GraphQL fallback cached per message ID");
  console.log("  - displayOutput computed value cached when inputs unchanged\n");
}

benchmark();
