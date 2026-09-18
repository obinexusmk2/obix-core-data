/**
 * Canonical OBIX data core: define -> instantiate -> transition -> snapshot
 * -> serialize. Zero dependencies, no rendering, no runtime-specific APIs.
 */
import { OBIXSerializationError } from "./types.js";
import type {
  OBIXActionMap,
  OBIXBoundActions,
  OBIXDataContext,
  OBIXDataDefinition,
  OBIXDataInstance,
  OBIXSnapshot,
} from "./types.js";

const DEFINITION_BRAND = Symbol("obix.core-data.definition");
const INSTANCE_BRAND = Symbol("obix.core-data.instance");

interface Branded {
  [DEFINITION_BRAND]?: true;
  [INSTANCE_BRAND]?: true;
}

/** Deterministic deep clone. Throws if `value` contains a function (see structuredClone's DataCloneError). */
export function cloneData<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

function deepFreeze<T>(value: T, seen: Set<unknown> = new Set()): T {
  if (value === null || typeof value !== "object" || seen.has(value)) {
    return value;
  }
  seen.add(value);
  for (const key of Object.keys(value as object)) {
    deepFreeze((value as Record<string, unknown>)[key], seen);
  }
  return Object.freeze(value);
}

/** True for any value produced by `defineData()`. */
export function isDataDefinition(value: unknown): value is OBIXDataDefinition<object> {
  return typeof value === "object" && value !== null && (value as Branded)[DEFINITION_BRAND] === true;
}

/** True for any value produced by `createDataInstance()`. */
export function isDataInstance(value: unknown): value is OBIXDataInstance<object> {
  return typeof value === "object" && value !== null && (value as Branded)[INSTANCE_BRAND] === true;
}

/**
 * Declares reusable template data: a name, an initial state shape, and the
 * named actions that transition it. The input `state` is cloned and
 * deep-frozen — `defineData` never shares or mutates the caller's own
 * object, and the resulting definition can never be mutated afterward
 * (Invariant 1: definition state is not instance state).
 */
export function defineData<State extends object, Actions extends OBIXActionMap<State>>(input: {
  name: string;
  state: State;
  actions?: Actions;
}): OBIXDataDefinition<State, Actions> {
  if (typeof input?.name !== "string" || input.name.length === 0) {
    throw new TypeError("[obix-core-data] defineData: `name` must be a non-empty string");
  }
  if (input.state === null || typeof input.state !== "object") {
    throw new TypeError(`[obix-core-data] defineData("${input.name}"): \`state\` must be a plain object`);
  }
  const actions = (input.actions ?? {}) as Actions;
  for (const [key, action] of Object.entries(actions)) {
    if (typeof action !== "function") {
      throw new TypeError(`[obix-core-data] defineData("${input.name}"): action "${key}" must be a function`);
    }
  }

  const definition = {
    name: input.name,
    state: deepFreeze(cloneData(input.state)),
    actions: Object.freeze({ ...actions }),
    [DEFINITION_BRAND]: true as const,
  };
  return Object.freeze(definition) as OBIXDataDefinition<State, Actions>;
}

/**
 * Materializes isolated, mutable state from a definition. Each call
 * produces a state object that is independent of the definition's own
 * state and of every other instance (Invariant 2). Actions are bound to
 * this instance's own context, so calling `instance.actions.foo(...)`
 * never touches another instance.
 *
 * `overrides.state`, when given, seeds the instance from that state
 * instead of the definition's default — e.g. restoring a previously taken
 * snapshot.
 */
export function createDataInstance<State extends object, Actions extends OBIXActionMap<State>>(
  definition: OBIXDataDefinition<State, Actions>,
  overrides: { state?: State } = {},
): OBIXDataInstance<State, Actions> {
  if (!isDataDefinition(definition)) {
    throw new TypeError("[obix-core-data] createDataInstance: expected a definition created by defineData()");
  }

  const context: OBIXDataContext<State> = {
    state: cloneData(overrides.state ?? (definition.state as State)),
  };

  const actions = {} as Record<string, (...args: unknown[]) => void>;
  for (const key of Object.keys(definition.actions)) {
    const action = definition.actions[key]!;
    actions[key] = (...args: unknown[]): void => {
      action(context, ...args);
    };
  }

  const instance = {
    definition,
    actions: Object.freeze(actions) as OBIXBoundActions<State, Actions>,
    [INSTANCE_BRAND]: true as const,
    get state(): State {
      return context.state;
    },
  };
  return instance as OBIXDataInstance<State, Actions>;
}

/**
 * Detaches a point-in-time copy of an instance's state. Later mutation of
 * the instance never changes a snapshot already taken (Invariant 4), and
 * the snapshot's state is itself deep-frozen.
 */
export function snapshotData<State extends object>(
  instance: OBIXDataInstance<State, OBIXActionMap<State>>,
): OBIXSnapshot<State> {
  if (!isDataInstance(instance)) {
    throw new TypeError("[obix-core-data] snapshotData: expected an instance created by createDataInstance()");
  }
  return Object.freeze({
    name: instance.definition.name,
    state: deepFreeze(cloneData(instance.state)),
  });
}

function assertSerializable(value: unknown, path: string, seen: Set<unknown>): void {
  if (value === undefined) {
    throw new OBIXSerializationError(`[obix-core-data] serializeData: unsupported \`undefined\` at ${path}`);
  }
  if (typeof value === "function") {
    throw new OBIXSerializationError(`[obix-core-data] serializeData: unsupported function at ${path}`);
  }
  if (typeof value === "symbol") {
    throw new OBIXSerializationError(`[obix-core-data] serializeData: unsupported symbol at ${path}`);
  }
  if (typeof value === "bigint") {
    throw new OBIXSerializationError(`[obix-core-data] serializeData: unsupported bigint at ${path}`);
  }
  if (value === null || typeof value !== "object") {
    return;
  }
  if (seen.has(value)) {
    throw new OBIXSerializationError(`[obix-core-data] serializeData: circular reference at ${path}`);
  }
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertSerializable(item, `${path}[${index}]`, seen));
    return;
  }
  for (const [key, item] of Object.entries(value)) {
    assertSerializable(item, `${path}.${key}`, seen);
  }
}

/**
 * Serializes a snapshot's data to JSON. Only plain, JSON-safe data is
 * supported — functions, symbols, bigints and `undefined` anywhere in the
 * snapshot throw `OBIXSerializationError` rather than being silently
 * dropped (as `JSON.stringify` alone would do). Behaviour (actions) is
 * never part of a snapshot, so it is never at risk of being serialized.
 */
export function serializeData<State extends object>(snapshot: OBIXSnapshot<State>): string {
  assertSerializable(snapshot.state, "$.state", new Set());
  return JSON.stringify({ name: snapshot.name, state: snapshot.state });
}

/** Parses a string produced by `serializeData` back into a detached, frozen snapshot. */
export function deserializeData<State extends object>(serialized: string): OBIXSnapshot<State> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch (cause) {
    throw new OBIXSerializationError("[obix-core-data] deserializeData: invalid JSON", { cause });
  }
  if (
    parsed === null ||
    typeof parsed !== "object" ||
    typeof (parsed as Record<string, unknown>).name !== "string" ||
    typeof (parsed as Record<string, unknown>).state !== "object" ||
    (parsed as Record<string, unknown>).state === null
  ) {
    throw new OBIXSerializationError(
      "[obix-core-data] deserializeData: expected a serialized OBIX snapshot (`{ name, state }`)",
    );
  }
  const { name, state } = parsed as { name: string; state: State };
  return Object.freeze({ name, state: deepFreeze(state) });
}
