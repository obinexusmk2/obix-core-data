# API reference

Full type and function surface of `@obinexusltd/obix-core-data`. Everything
is exported from the package root (`src/index.ts`); there is no subpath
export beyond the raw `./src` re-export in `package.json`.

## Functions

```ts
function defineData<State extends object, Actions extends OBIXActionMap<State>>(input: {
  name: string;
  state: State;
  actions?: Actions;
}): OBIXDataDefinition<State, Actions>;

function createDataInstance<State extends object, Actions extends OBIXActionMap<State>>(
  definition: OBIXDataDefinition<State, Actions>,
  overrides?: { state?: State },
): OBIXDataInstance<State, Actions>;

function snapshotData<State extends object>(
  instance: OBIXDataInstance<State, OBIXActionMap<State>>,
): OBIXSnapshot<State>;

function serializeData<State extends object>(snapshot: OBIXSnapshot<State>): string;

function deserializeData<State extends object>(serialized: string): OBIXSnapshot<State>;

function cloneData<T>(value: T): T;

function isDataDefinition(value: unknown): value is OBIXDataDefinition<object>;

function isDataInstance(value: unknown): value is OBIXDataInstance<object>;
```

### `defineData({ name, state, actions? })`

Declares reusable template data. Validates `name` (non-empty string) and
`state` (a plain object) and, if given, that every entry of `actions` is a
function — throwing a `TypeError` with a message naming the offending
field otherwise. The input `state` is deep-cloned and deep-frozen before
being stored, so:

- the definition never shares a reference with the object the caller
  passed in (mutating your own object after `defineData` has no effect on
  the definition), and
- `definition.state.whatever = x` throws (strict mode, which ES modules
  always run in) instead of silently mutating shared template data.

`actions` is optional — a definition with no actions is valid data on its
own.

### `createDataInstance(definition, overrides?)`

Materializes isolated, mutable state from a definition. `overrides.state`,
when given, seeds the instance from that state instead of the definition's
default — the supported way to resume from a previously taken snapshot
(`createDataInstance(Counter, { state: snapshot.state })`). Either way the
seed value is deep-cloned, so the new instance never shares state with the
definition, with `overrides.state`'s original object, or with any other
instance.

The returned instance's `actions` are the definition's actions **bound**
to that instance's own state — call them directly
(`instance.actions.increment()`), with no `context` argument; the instance
supplies it internally. `instance.state` always reflects the instance's
current state, including a full reassignment of `context.state` from
inside an action.

Throws `TypeError` if `definition` wasn't produced by `defineData`.

### `snapshotData(instance)`

Returns `{ name, state }` where `state` is a deep-cloned, deep-frozen copy
of `instance.state` at the moment of the call. Later mutation of the
instance (via its actions, or via `createDataInstance` overrides on a
different instance) never changes a snapshot already taken. Throws
`TypeError` if `instance` wasn't produced by `createDataInstance`.

### `serializeData(snapshot)` / `deserializeData(serialized)`

`serializeData` walks `snapshot.state` and throws `OBIXSerializationError`
if it finds a function, symbol, bigint, `undefined`, or a circular
reference anywhere in it, then returns
`JSON.stringify({ name: snapshot.name, state: snapshot.state })`.
`deserializeData` parses that string back into a `{ name, state }`
snapshot (itself deep-frozen), throwing `OBIXSerializationError` if the
input isn't valid JSON or doesn't have that shape.

These only ever see a snapshot's `state` — never `actions` — so there is
no path by which behavior (functions) is treated as data by accident; see
[architecture.md](architecture.md#serializable-data-vs-executable-behavior).

### `cloneData(value)`

The deep-clone primitive used internally by `defineData`,
`createDataInstance` and `snapshotData`; exported because callers
implementing their own OBIX-adjacent tooling need the same deterministic
clone. Uses `structuredClone` where available, falling back to a
`JSON.parse(JSON.stringify(...))` round-trip. Throws if `value` contains a
function (same as `structuredClone` does), which is why `defineData` and
`createDataInstance` only ever call it on `state`, never on `actions`.

### `isDataDefinition(value)` / `isDataInstance(value)`

Type guards backed by internal, non-enumerable symbol brands — not
duck-typing on shape — so a plain object that happens to have `name`/
`state`/`actions` fields is correctly reported as `false`.

## Types (`src/types.ts`)

```ts
interface OBIXDataContext<State> {
  state: State;
}

type OBIXAction<State, Args extends readonly unknown[] = readonly unknown[]> = (
  context: OBIXDataContext<State>,
  ...args: Args
) => void;

type OBIXActionMap<State> = Record<string, OBIXAction<State, any>>;

type OBIXActionArgs<State, Action> = /* extracts Action's trailing argument tuple */;

interface OBIXDataDefinition<State extends object, Actions extends OBIXActionMap<State> = OBIXActionMap<State>> {
  readonly name: string;
  readonly state: Readonly<State>;
  readonly actions: Readonly<Actions>;
}

type OBIXBoundActions<State extends object, Actions extends OBIXActionMap<State>> = {
  readonly [K in keyof Actions]: (...args: OBIXActionArgs<State, Actions[K]>) => void;
};

interface OBIXDataInstance<State extends object, Actions extends OBIXActionMap<State> = OBIXActionMap<State>> {
  readonly definition: OBIXDataDefinition<State, Actions>;
  readonly state: State;
  readonly actions: OBIXBoundActions<State, Actions>;
}

interface OBIXSnapshot<State extends object> {
  readonly name: string;
  readonly state: Readonly<State>;
}

class OBIXSerializationError extends Error {}
```

`OBIXActionMap<State>`'s `any` in `OBIXAction<State, any>` is the one
documented boundary where precise inference is impossible: the map is
heterogeneous (each action may take different arguments), so the map type
itself can't be more specific than that. Individual actions stay exactly
typed — `OBIXActionArgs<State, Actions[K]>` recovers each one's real
argument tuple for `OBIXBoundActions`, which is what makes
`counter.actions.add(4)` type-check `4` against `add`'s actual parameter
and reject a mismatched call.

## What this package does **not** export

- No `reduce`/`replay`/`render`/`validate`/`view` — this package has no
  rendering concept and no opinion on how a transition trace should be
  folded or replayed; see [architecture.md](architecture.md).
- No `effects` field on the definition — scheduling is out of scope here.
- No class or `React.Component` requirement anywhere in the public API.
