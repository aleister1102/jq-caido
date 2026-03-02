# Components Notes

## `JqQueryInput` and `modelValue`

`JqQueryInput.vue` uses `modelValue` instead of a `query` prop because it implements Vue 3's standard `v-model` API contract.

### Why `modelValue`

- Vue convention for custom `v-model` is:
  - prop: `modelValue`
  - event: `update:modelValue`
- Parent `JqViewMode.vue` binds `v-model="query"`, so the parent keeps the semantic variable name `query`.
- The input component stays generic and reusable while still participating in two-way binding.

### Practical Effect

- Parent writes: `<JqQueryInput v-model="query" />`
- Child reads: `props.modelValue`
- Child updates: `emit("update:modelValue", nextValue)`

This keeps component APIs idiomatic for Vue tooling and contributors.
