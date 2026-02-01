import * as jq from "jq-wasm";

console.log("Benchmark script loaded.");

async function benchmark() {
    console.log("Generating 20MB JSON...");
    const data = [];
    for (let i = 0; i < 200000; i++) {
        data.push({
            id: i,
            name: `Item ${i}`,
            nested: {
                value: Math.random(),
                tags: ["a", "b", "c"]
            }
        });
    }
    const largeObject = { data };
    const jsonString = JSON.stringify(largeObject);
    const sizeMB = (jsonString.length / 1024 / 1024).toFixed(2);
    console.log(`JSON Size: ${sizeMB} MB`);

    const query = ".data[0:10]";

    console.log("\n--- Scenario 1: JSON.parse (Main Thread) + jq.raw(Object) ---");
    const start1 = performance.now();
    const parsed = JSON.parse(jsonString) as object;
    const mid1 = performance.now();
    const result1 = await jq.raw(parsed, query);
    const end1 = performance.now();
    console.log(`JSON.parse time: ${(mid1 - start1).toFixed(2)}ms`);
    console.log(`jq.raw(Object) time: ${(end1 - mid1).toFixed(2)}ms`);
    console.log(`Total time: ${(end1 - start1).toFixed(2)}ms`);

    console.log("\n--- Scenario 2: jq.raw(String) Directly ---");
    const start2 = performance.now();
    const result2 = await jq.raw(jsonString, query);
    const end2 = performance.now();
    console.log(`jq.raw(String) time: ${(end2 - start2).toFixed(2)}ms`);
    console.log(`Total time: ${(end2 - start2).toFixed(2)}ms`);

    console.log("\n--- Comparison ---");
    const scenario1Total = end1 - start1;
    const scenario2Total = end2 - start2;
    const diff = scenario1Total - scenario2Total;
    const improvement = (diff / scenario1Total * 100).toFixed(2);
    console.log(`Performance Improvement: ${improvement}%`);

    if (result1.stdout === result2.stdout) {
        console.log("Outputs match! Verification successful.");
    } else {
        console.error("Outputs DO NOT match!");
    }
}

benchmark().catch((err) => {
    console.error("Benchmark failed:", err);
});
