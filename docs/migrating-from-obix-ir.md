# Migrating from the `obix-spec`/`obix-ir`-based API (v0.2.1 → v0.3.0)

This package's `v0.2.1` depended on `@obinexusltd/obix-spec` +
`@obinexusltd/obix-ir`. `v0.3.0` is a zero-dependency rewrite. The five
exported function *names* (`toData`, `dataApply`, `dataReplay`,
`dataRender`, `dataValidate`) and their call shapes are unchanged, but the
artifact type they operate on, and the action-calling convention
underneath, both changed. This page is the precise diff.

## Artifact type: `DOPArtifact` → `DOPComponent`

```ts
// OLD — @obinexusltd/obix-spec's DOPArtifact<S, P>
interface DOPArtifact<S, P> {
  readonly name: string;
  readonly initialState: S;      // <- "initialState", not "state"
  readonly props: P;             // <- required, not optional
  readonly actions: Readonly<Record<string, ActionFn<S, P>>>;
  readonly derived: Readonly<Record<string, DerivedFn<S, P>>>;   // required
  readonly effects: Readonly<Record<string, EffectDescriptor>>;  // required
  readonly validate?: (state: S, props: P) => ValidationResult;
  readonly render?: (state: S, props: P) => string;              // (state, props), not (view)
  readonly meta: DopArtifactMeta;                                 // required, compiler metadata
  // ...plus template, style, a11y — compiler-facing fields this package never read
}

// NEW — this package's vendored DOPComponent<S, P>
interface DOPComponent<S, P> {
  name: string;
  state: S;                      // <- "state", not "initialState"
  props?: P;                     // <- optional
  actions: Record<string, ActionFn<S, P>>;
  derived?: Record<string, (state: S, props: P) => unknown>;     // optional
  effects?: Record<string, EffectDescriptor<S, P>>;               // optional, unused (see README)
  render?: (view: RenderView<S, P>) => string;                    // (view), not (state, props)
  validate?: (state: S, props: P) => ValidationResult;
}
```

**If you have an existing `DOPArtifact`-shaped object**, the minimum
change to use it with this package is renaming `initialState` → `state`.
`derived`/`effects`/`meta`/`template`/`style`/`a11y` being required on the
old type but optional-or-absent on the new one means you can simply drop
whatever you don't need — nothing here requires them.

## Action-calling convention changed

```ts
// OLD — applyAction(artifact, state, name, payload, props) called:
artifact.actions[name](state, payload, props); // -> returns a NEW state (pure function)

// NEW — reduce(component, state, name, payload, props) calls:
component.actions[name](ctx, payload); // ctx.state is a pre-cloned draft; mutate it, return void
```

This is the single most important behavioral change. Old-style action
functions **must be rewritten**, not just re-typed:

```ts
// OLD action (pure, returns new state):
const inc = (state, payload, props) => ({ ...state, count: state.count + (payload ?? 1) });

// NEW action (mutates the draft, returns nothing):
const inc = (ctx, payload) => {
  ctx.state.count += payload ?? 1;
};
```

Two consequences of this change worth knowing:

- **Cloning moved.** The old `applyAction` did **no cloning at all** —
  each action was individually responsible for not mutating its `state`
  argument (a discipline enforced by convention/review, not the type
  system or the runtime). The new `reduce` does the cloning for you,
  centrally, once, before every action call — see
  [action-execution-model.md](action-execution-model.md). This means an
  old action that *did* mutate its `state` argument in place (a latent
  bug under the old contract, since `applyAction` returned whatever the
  action returned, not necessarily a fresh object) behaves more safely
  under the new one by construction, but a rewritten action still needs to
  target `ctx.state`, not a plain `state` parameter — there's no `state`
  parameter in the new signature at all.
- **Sibling-action composition is new.** The old convention had no
  equivalent to `ctx[otherAction]` — the old `applyAction` only ever
  invoked the one named action per call. If you want one action to trigger
  another under the new model, use `ctx.otherActionName(payload)` instead
  of manually re-implementing that logic inline (see
  [action-execution-model.md](action-execution-model.md)).

## Error message format changed

```
// OLD (obix-ir, coded diagnostic):
[OBIX] OBIX-S001: unknown action "doesNotExist" on artifact "Counter"

// NEW (this package's vendored dop.ts, plain message):
[obix] Counter: unknown action "doesNotExist"
```

If any calling code pattern-matches on the old `OBIX-S001` diagnostic code
or its exact message shape, it needs updating — the new error has no
machine-readable code, just a plain `Error` with a differently-formatted
message.

## `render`'s signature changed

```ts
// OLD: artifact.render(state, props)
// NEW: component.render(view)  — where view = { state, props, derived, ...props, ...state, ...derived }
```

A `render` function written for the old artifact type needs its signature
updated to accept one `RenderView` argument. See
[obix-core-func's reduce-and-replay.md](../../obix-core-func/docs/reduce-and-replay.md#view-and-renderhtml)
for exactly how `view` is assembled (including the flattened spread and
per-key try/catch around each `derived` function).

## What stayed the same

- `dataValidate(component, state, props?)`'s call shape and
  `component.validate(state, props)`'s two-argument signature are
  **unchanged**.
- All five function names (`toData`, `dataApply`, `dataReplay`,
  `dataRender`, `dataValidate`) and their argument order are unchanged.
- The "no instance, no hidden state" contract this package has always had
  (see [data-projection-contract.md](data-projection-contract.md)) is
  unchanged — this migration only affects the artifact shape and the
  action function bodies, not how you call this package's own exports.
