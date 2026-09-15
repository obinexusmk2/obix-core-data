# The action execution model

`dataApply` is a direct pass-through to the vendored `dop.ts`'s `reduce` —
the same function [obix-core-func](../../obix-core-func) uses for its
`reduce`/`create().dispatch`. This page documents that shared behavior
from the Data projection's point of view: explicit arguments, no closure.

```ts
export function dataApply<S extends object, P extends object>(
  component: DOPComponent<S, P>,
  state: S,
  actionName: string,
  payload?: unknown,
  props?: P,
): S {
  return reduce(component, state, actionName, payload, props);
}
```

## The input `state` is never mutated

`reduce` deep-clones `state` (via `structuredClone`, or a JSON
stringify/parse fallback) into a `draft` before running the action; the
action mutates `draft`, and `draft` is what comes back. This matters
especially for the Data projection, since callers typically hold `state`
in their own variable across many `dataApply` calls:

```ts
let state = Counter.state;
const after = dataApply(Counter, state, "inc");
state === Counter.state; // true — Counter.state itself was never touched
after === state;         // false — dataApply always returns a new object
```

If you write `state = dataApply(Counter, state, "inc")`, you're
reassigning your own local binding — `dataApply` has no way to do that for
you, matching the "no hidden state" contract described in
[data-projection-contract.md](data-projection-contract.md).

## Unknown action names throw

```ts
dataApply(Counter, Counter.state, "doesNotExist");
// Error: [obix] Counter: unknown action "doesNotExist"
```

Thrown before cloning even happens. `dataReplay` doesn't catch this either
— a bad action name mid-trace propagates straight out, and everything
folded so far in that `dataReplay` call is discarded (there's no partial
result returned).

## `ctx[otherAction]`: actions can call sibling actions

Every action function receives a `ctx` carrying not just `state`/`props`
but a callable for every other action name in `component.actions`,
letting one action trigger another against the same `draft`:

```ts
const Cart = {
  name: "Cart",
  state: { items: [], total: 0 },
  actions: {
    addItem: (ctx, item) => {
      ctx.state.items.push(item);
      ctx.recalculateTotal(); // same draft, same call
    },
    recalculateTotal: (ctx) => {
      ctx.state.total = ctx.state.items.reduce((sum, i) => sum + i.price, 0);
    },
  },
};

dataApply(Cart, Cart.state, "addItem", { price: 9.99 });
// => { items: [{ price: 9.99 }], total: 9.99 } — one dataApply call, two actions ran
```

There's no recursion guard — an action that (directly or via a cycle)
calls a `ctx` helper pointing back at itself recurses until the stack
overflows. See
[obix-core-func's reduce-and-replay.md](../../obix-core-func/docs/reduce-and-replay.md#ctx-carries-every-other-action-as-a-callable)
for the full mechanism (identical here, since it's the same vendored
`dop.ts`).

## `dataReplay` folds independently per step

```ts
export function dataReplay<S extends object, P extends object>(
  component: DOPComponent<S, P>, trace: ActionTrace, from?: S, props?: P,
): S {
  return fold(component, trace, from, props);
}
```

Starts from `from` (or `component.state` if omitted) and calls `reduce`
once per trace entry. Each step gets a fresh `draft`/`ctx` — the
`ctx[otherAction]` helpers from one step don't carry over to the next;
only the resulting state value threads through. `props` is fixed for the
whole trace — no per-step override.

## Cloning caveats

The `structuredClone` fallback (`JSON.parse(JSON.stringify(state))`) drops
`undefined`, functions, symbols, and mangles `Date`/`Map`/`Set` — a
concern only in environments without native `structuredClone` (this
package requires Node ≥ 20.11, which has it; the fallback exists for
unusual embedding environments). See
[obix-core-func's reduce-and-replay.md](../../obix-core-func/docs/reduce-and-replay.md#the-input-state-is-never-mutated)
for the exact same caveat, since it's the same clone helper.
