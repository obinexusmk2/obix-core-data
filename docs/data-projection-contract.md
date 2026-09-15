# The Data projection contract

"Data projection" describes a specific, narrow design point among the
`@obinexusltd/obix-adapter-*` family: **no instance, no hidden state, no
convenience defaults beyond what the component itself supplies.** This
page is about what that means concretely, and how it differs from
[obix-core-func](../../obix-core-func)'s `Functional` projection, which
wraps the exact same underlying reducer.

## No instance

There is no `create()` here, and no equivalent. Every function in this
package — `dataApply`, `dataReplay`, `dataRender`, `dataValidate` — takes
the `component` and `state` as explicit arguments on every single call.
Nothing is remembered between calls:

```ts
// Functional projection (obix-core-func): state lives in a closure
const inst = toFunctional(Counter).create();
inst.dispatch("inc");
inst.getState(); // { count: 1 } — remembered

// Data projection (this package): state is threaded by the caller
let state = Counter.state;
state = dataApply(Counter, state, "inc");
// state is now { count: 1 } — but only because YOU reassigned it;
// nothing inside this package remembers it for you
```

If you call `dataApply(Counter, Counter.state, "inc")` twice in a row
without capturing and re-threading the result yourself, you get the same
`{ count: 1 }` both times — the second call still starts from
`Counter.state` (`{ count: 0 }`), because `Counter.state` itself is never
mutated (see [action-execution-model.md](action-execution-model.md)).

## No hidden props

`dataApply`/`dataReplay`/`dataRender`/`dataValidate` all accept `props` as
an explicit, optional final argument. When omitted, the underlying
`reduce`/`replay`/`renderHtml`/`validate` functions fall back to
`component.props ?? {}` — there's no merging, freezing, or defaulting
logic in *this* package's own code the way
[obix-core-func](../../obix-core-func)'s `create()` does (`Object.freeze({
...component.props, ...opts.props })`). If you need per-call props that
differ from `component.props`, you pass them yourself, every call; this
package does no merging on your behalf.

## `toData` as a type-level signal, not a runtime step

Given the above, `toData(component)` doing literally nothing (see
[api-reference.md](api-reference.md#todatacomponent)) makes sense as a
*naming convention* rather than a required step: calling
`dataApply(toData(Counter), ...)` versus `dataApply(Counter, ...)` behaves
identically, but the former reads as "I am intentionally using the Data
projection's contract for this component" in code that might otherwise be
ambiguous about which adapter's calling convention is in play. It costs
nothing to call and nothing to skip.

## When to reach for this over `obix-core-func`

Prefer the Data projection when:

- You already have your own state-holding mechanism (a store, a
  framework's own state primitive) and don't want a second, competing
  place state could live.
- You want every state transition visible at the call site — no
  `dispatch()` hiding which `state` value it's about to read and write.
- You're calling into this from a context where creating and holding onto
  a closure instance is awkward (e.g. a stateless request handler that
  gets a fresh `state` value from elsewhere on every call).

Prefer [obix-core-func](../../obix-core-func)'s `create()` when you want
this package's own module to hold and mutate the current state for you,
with `getState()`/`dispatch()` as the interface.

Both call into the exact same vendored `reduce` — see
[action-execution-model.md](action-execution-model.md) — so the actual
transition semantics (cloning, unknown-action throw, `ctx[otherAction]`
composition) are identical either way; the only difference is *who holds
the state between calls.*
