# API reference

Full type and function surface of `@obinexusltd/obix-core-data`. Everything
is exported from the package root (`src/index.ts`); there is no subpath
export beyond the raw `./src` re-export in `package.json`.

## Public exports (`src/index.ts`)

```ts
export function toData<S extends object, P extends object>(component: DOPComponent<S, P>): DOPComponent<S, P>;

export function dataApply<S extends object, P extends object>(
  component: DOPComponent<S, P>,
  state: S,
  actionName: string,
  payload?: unknown,
  props?: P,
): S;

export function dataReplay<S extends object, P extends object>(
  component: DOPComponent<S, P>,
  trace: ActionTrace,
  from?: S,
  props?: P,
): S;

export function dataRender<S extends object, P extends object>(
  component: DOPComponent<S, P>,
  state: S,
  props?: P,
): string;

export function dataValidate<S extends object, P extends object>(
  component: DOPComponent<S, P>,
  state: S,
  props?: P,
): ValidationResult;
```

Also re-exported (type-only): `ActionContext`, `ActionFn`, `ActionTrace`,
`DOPComponent`, `EffectDescriptor`, `RenderView`, `ValidationResult` — all
from `src/types.ts`, identical to
[obix-core-func](../../obix-core-func)'s copies. See
[zero-dependency-vendoring.md](zero-dependency-vendoring.md).

### `toData(component)`

```ts
export function toData<S extends object, P extends object>(component: DOPComponent<S, P>): DOPComponent<S, P> {
  return component;
}
```

The entire implementation. No validation, no cloning, no wrapping — the
argument is the return value, by reference. See
[data-projection-contract.md](data-projection-contract.md) for why this
function exists at all if it does nothing.

### `dataApply(component, state, actionName, payload?, props?)`

```ts
export function dataApply<S extends object, P extends object>(
  component: DOPComponent<S, P>, state: S, actionName: string, payload?: unknown, props?: P,
): S {
  return reduce(component, state, actionName, payload, props);
}
```

A direct pass-through to the vendored `dop.ts`'s `reduce` — see
[action-execution-model.md](action-execution-model.md) for the full clone/
dispatch/throw semantics, which are identical to what
[obix-core-func](../../obix-core-func)'s `reduce`/`create().dispatch` use.

### `dataReplay(component, trace, from?, props?)`

Pass-through to `dop.ts`'s `replay`. `from` defaults to `component.state`
when omitted (inside `replay` itself, not here); `props` defaults to
`component.props ?? {}`.

### `dataRender(component, state, props?)` / `dataValidate(component, state, props?)`

Pass-throughs to `dop.ts`'s `renderHtml`/`validate` — `dataRender` returns
`""` if `component.render` is unset; `dataValidate` returns
`{ valid: true, violations: [] }` if `component.validate` is unset.

## `DOPComponent<S, P>` (`src/types.ts`)

```ts
interface DOPComponent<S extends object = Record<string, unknown>, P extends object = Record<string, unknown>> {
  name: string;
  state: S;
  props?: P;
  actions: Record<string, ActionFn<S, P>>;
  derived?: Record<string, (state: S, props: P) => unknown>;
  effects?: Record<string, EffectDescriptor<S, P>>;
  render?: (view: RenderView<S, P>) => string;
  validate?: (state: S, props: P) => ValidationResult;
}
```

Identical, field-for-field, to
[obix-core-func](../../obix-core-func)'s `DOPComponent` — a single
component object satisfies both packages' types simultaneously. See
[obix-core-func/docs/api-reference.md](../../obix-core-func/docs/api-reference.md#dopcomponents-p-srctypests)
for the full per-field breakdown (which fields are read by `reduce`/
`replay`/`view`/`renderHtml`/`validate`, and that `effects` is typed but
unused).

## What this package does **not** export

- No `create()` / closure-instance API — that's
  [obix-core-func](../../obix-core-func)'s job. This package is
  deliberately instance-less.
- No `changedKeys` re-export, even though `dop.ts` provides it (same as
  `obix-core-func` — see that package's
  [zero-dependency-vendoring.md](../../obix-core-func/docs/zero-dependency-vendoring.md)
  for how to reach it anyway via the `"./src"` export or the compiled
  `dist/dop.js`).
- No `view()` re-export — `dataRender` calls it internally, but the
  intermediate `RenderView` object it builds isn't exposed as its own
  entry point here.
