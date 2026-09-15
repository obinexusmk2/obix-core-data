# @obinexusltd/obix-core-data

**The Data projection — identity over the DOP artifact.**
Zero dependencies. Vendors its own DOP artifact types and reducer
(`src/types.ts`, `src/dop.ts`), the same way every
`@obinexusltd/obix-adapter-*` sibling package does.

```bash
npm install @obinexusltd/obix-core-data
```

No hidden props. No instance. No `create()` closure. The caller owns
`state`, `payload` and `props` and passes all of them, every call. Every
transition goes through the **same** vendored `reduce` the other adapter
projections (`func` / `oop` / `reactive` / `ssr`) use.

## Migration note: this package changed its dependency model

This package previously (`v0.2.1`) depended on `@obinexusltd/obix-spec` +
`@obinexusltd/obix-ir`, whose `applyAction` invoked actions in the pure
functional shape `artifact.actions[name](state, payload, props) ->
newState` — the action itself was responsible for returning a new state
object, with **no cloning** done by `applyAction`.

As of `v0.3.0`, this package is zero-dependency and vendors its own
`DOPComponent` type and reducer (matching
[@obinexusltd/obix-core-func](../obix-core-func)'s identical rewrite —
see that package's
[zero-dependency-vendoring.md](../obix-core-func/docs/zero-dependency-vendoring.md)
for the shared rationale). This changes the action-calling convention:
actions now mutate a `ctx.state` **draft** and return `void`, and the
draft is deep-cloned from the input `state` before the action runs —
see [docs/migrating-from-obix-ir.md](docs/migrating-from-obix-ir.md) for
the full comparison and what it means for existing `DOPArtifact`-shaped
components.

## The DOP artifact

```ts
interface DOPComponent<S, P = {}> {
  name: string;
  state: S;
  actions: Record<string, (ctx, payload?) => void>;   // mutate ctx.state
  derived?: Record<string, (state, props) => unknown>;
  render?: (view: { state; props; derived }) => string;
  validate?: (state, props) => { valid: boolean; violations: string[] };
}
```

## API

```ts
import { toData, dataApply, dataReplay, dataRender, dataValidate } from "@obinexusltd/obix-core-data";

toData(Counter);                              // === Counter (identity, always)
dataApply(Counter, Counter.state, "inc");      // => { count: 1 } — Counter.state itself is untouched
dataReplay(Counter, [["inc"], ["inc"]]);       // fold a trace
dataRender(Counter, { count: 3 });             // '<button aria-label="count: 3">3</button>'
dataValidate(Counter, { count: 3 });           // { valid: true, violations: [] }
```

| Export | Role |
|---|---|
| `toData(component)` | returns the component unchanged — a pure identity, `toData(c) === c` always |
| `dataApply(component, state, actionName, payload?, props?)` | one transition via the vendored `reduce` |
| `dataReplay(component, trace, from?, props?)` | fold a trace |
| `dataRender(component, state, props?)` / `dataValidate(component, state, props?)` | render / validate at a given state |

See [docs/api-reference.md](docs/api-reference.md) for the full type
reference.

## Docs

- [docs/api-reference.md](docs/api-reference.md) — full type reference for `DOPComponent` and the five exported functions
- [docs/data-projection-contract.md](docs/data-projection-contract.md) — what "no instance, no hidden state" actually means here, and how it differs from the `Functional` projection's `create()`
- [docs/action-execution-model.md](docs/action-execution-model.md) — `dataApply`'s clone-then-mutate semantics, the unknown-action throw, and the `ctx[otherAction]` composition mechanism
- [docs/migrating-from-obix-ir.md](docs/migrating-from-obix-ir.md) — exactly what changed between the `obix-spec`/`obix-ir`-based `v0.2.1` and this zero-dependency `v0.3.0`
- [docs/zero-dependency-vendoring.md](docs/zero-dependency-vendoring.md) — why `types.ts`/`dop.ts`/`env.d.ts` are duplicated from `obix-core-func` rather than imported

## Boundary

- **`toData` does nothing at runtime.** It exists purely as a naming
  device — calling it signals "this component is being used via the Data
  projection," but `toData(c) === c` by reference, always. You can skip it
  entirely and call `dataApply`/`dataReplay`/`dataRender`/`dataValidate`
  directly on the component.
- **No `effects` runner** — `DOPComponent.effects` is typed and exported
  but nothing in this package schedules or executes them, same as
  [obix-core-func](../obix-core-func).
- **Every call re-threads `component` explicitly.** There is no
  module-level or closure-held state anywhere in this package — two
  concurrent `dataApply` calls against the same `component` but different
  `state` arguments never interfere with each other, because nothing is
  shared between calls except the (never-mutated) `component` object
  itself.

MIT — OBINexus Computing
