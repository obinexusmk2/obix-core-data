/**
 * Canonical OBIX data types.
 *
 * `obix-core-data` is the paradigm-neutral substrate every OBIX component
 * representation (functional, OOP, reactive, JSX, …) sits above. A
 * `Definition` is reusable, immutable template data; a `DataInstance`
 * materializes isolated, mutable state from it. Nothing here assumes a
 * rendering target, a class hierarchy, or a specific runtime.
 */

/** The mutable context an action runs against. `state` is the owning instance's own state. */
export interface OBIXDataContext<State> {
  state: State;
}

/**
 * A state transition: reads/writes `context.state`, optionally takes typed
 * arguments. Returns nothing — the effect is the mutation (or full
 * reassignment) of `context.state`.
 */
export type OBIXAction<State, Args extends readonly unknown[] = readonly unknown[]> = (
  context: OBIXDataContext<State>,
  ...args: Args
) => void;

/**
 * A named map of actions over the same `State`. Each action may take
 * different argument tuples, so the map itself must use `any` here — this
 * is the one documented boundary where precise inference is impossible
 * because the map is heterogeneous; individual actions stay fully typed via
 * `OBIXAction<State, Args>` and `OBIXActionArgs` below.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type OBIXActionMap<State> = Record<string, OBIXAction<State, any>>;

/** Extracts the trailing argument tuple of one action in an `OBIXActionMap`. */
export type OBIXActionArgs<State, Action> = Action extends (
  context: OBIXDataContext<State>,
  ...args: infer Args
) => void
  ? Args
  : never;

/**
 * Reusable, immutable template data. Not the mutable runtime state — see
 * `OBIXDataInstance`. Produced only by `defineData()`.
 */
export interface OBIXDataDefinition<
  State extends object,
  Actions extends OBIXActionMap<State> = OBIXActionMap<State>,
> {
  readonly name: string;
  readonly state: Readonly<State>;
  readonly actions: Readonly<Actions>;
}

/** `definition.actions`, bound to one instance's own state and pre-applied (no `context` argument). */
export type OBIXBoundActions<State extends object, Actions extends OBIXActionMap<State>> = {
  readonly [K in keyof Actions]: (...args: OBIXActionArgs<State, Actions[K]>) => void;
};

/**
 * Isolated, mutable runtime state materialized from a definition. Two
 * instances of the same definition never share state, and mutating one
 * never mutates the definition it came from.
 */
export interface OBIXDataInstance<
  State extends object,
  Actions extends OBIXActionMap<State> = OBIXActionMap<State>,
> {
  readonly definition: OBIXDataDefinition<State, Actions>;
  readonly state: State;
  readonly actions: OBIXBoundActions<State, Actions>;
}

/**
 * A detached, point-in-time observation of an instance's state — `S(t)`.
 * Independent of the mutable instance it was taken from: later mutation of
 * the instance never changes a snapshot already taken.
 */
export interface OBIXSnapshot<State extends object> {
  readonly name: string;
  readonly state: Readonly<State>;
}

/** Thrown by `serializeData`/`deserializeData` for anything outside the serializable-data boundary. */
export class OBIXSerializationError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "OBIXSerializationError";
  }
}
