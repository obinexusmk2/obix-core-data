# @obinexusltd/obix-core-data

**The canonical OBIX data substrate.** Definitions, isolated instances,
typed actions, snapshots, and a serializable-data boundary — paradigm
neutral, zero dependencies.

```bash
npm install @obinexusltd/obix-core-data
```

## Why this package exists

OBIX components can eventually be authored as functions, classes, or
reactive objects — but none of those representations should own the
canonical state. That belongs here. A component starts life as plain,
declarative data:

```ts
import { defineData, createDataInstance, snapshotData } from "@obinexusltd/obix-core-data";

const CounterData = defineData({
  name: "Counter",
  state: {
    count: 0,
  },
  actions: {
    increment(ctx) {
      ctx.state.count++;
    },
    add(ctx, amount: number) {
      ctx.state.count += amount;
    },
  },
});

const counterA = createDataInstance(CounterData);
const counterB = createDataInstance(CounterData);

counterA.actions.increment();
counterA.actions.add(4);

console.log(counterA.state.count); // 5
console.log(counterB.state.count); // 0 — a separate, isolated instance

const snapshot = snapshotData(counterA);
```

Functional, OOP, reactive, and JSX-facing component representations are
all adapters *over* this data — see
[docs/architecture.md](docs/architecture.md) for how that layering is
meant to work and why the package deliberately doesn't do rendering.

## Migration note: this package changed shape in `0.4.0`

`<= 0.3.0` was a different design point entirely: an instance-less
"identity projection" (`toData`, `dataApply`, `dataReplay`, `dataRender`,
`dataValidate`) that vendored its own copy of a `DOPComponent` type and
`reduce` function, one of five near-identical sibling packages
(`data`/`func`/`oop`/`reactive`/`ssr`) with no shared foundation between
them. `0.4.0` replaces that with the definition/instance model described
above and in [docs/architecture.md](docs/architecture.md) — none of the
old exports exist anymore. Nothing else in this monorepo imported the old
API, so there is no cross-package migration needed.

## API

```ts
defineData({ name, state, actions? })        // -> OBIXDataDefinition — reusable, frozen template data
createDataInstance(definition, overrides?)   // -> OBIXDataInstance — isolated, mutable state + bound actions
snapshotData(instance)                       // -> OBIXSnapshot — detached, frozen state at this moment
serializeData(snapshot)                      // -> string — throws on functions/symbols/bigint/undefined/cycles
deserializeData(serialized)                  // -> OBIXSnapshot
cloneData(value)                             // -> deterministic deep clone (structuredClone, JSON fallback)
isDataDefinition(value) / isDataInstance(value)  // -> type guards
```

See [docs/api-reference.md](docs/api-reference.md) for the full type
reference, and [docs/architecture.md](docs/architecture.md) for the
definition -> instance -> transition -> snapshot pipeline and the
serializable-data/executable-behavior boundary.

## Invariants

- **Isolation** — `createDataInstance(D)` called twice never shares state:
  `a.state !== b.state !== D.state`, always. Mutating one instance's state
  never affects another instance or the definition it came from.
- **Definitions are frozen** — `defineData` deep-clones and deep-freezes
  the `state` you pass it; `definition.state.x = y` throws.
- **Snapshots are detached** — `snapshotData(instance)` returns a
  deep-frozen copy; later mutation of `instance` never changes a snapshot
  already taken.
- **Behavior never leaks into data** — `snapshotData`/`serializeData` only
  ever see `state`, never `actions`; `serializeData` additionally throws
  (rather than silently dropping) if a function, symbol, bigint,
  `undefined`, or circular reference shows up inside `state` itself.
- **Deterministic** — no timestamps, random IDs, or environment-dependent
  values anywhere in this package's own code.
- **Runtime-neutral** — no Node-only or browser-only API; the only ambient
  global used (`structuredClone`, declared in `src/env.d.ts`) is available
  in Node ≥ 17, Deno, Bun, and every modern browser.

## Boundary

This package does not render, validate against a schema, or run effects —
those are Non-Goals here on purpose; see
[docs/architecture.md](docs/architecture.md#why-no-reducerendervalidate-here).
It also does not implement a transition log, replay, or state
minimization — but its definition/instance/snapshot split is designed so a
future OBIX package can add those on top without requiring changes here.

MIT — OBINexus Computing
