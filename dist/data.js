import { OBIXSerializationError } from "./types.js";
const DEFINITION_BRAND = Symbol("obix.core-data.definition");
const INSTANCE_BRAND = Symbol("obix.core-data.instance");
export function cloneData(value) {
    if (typeof structuredClone === "function") {
        return structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value));
}
function deepFreeze(value, seen = new Set()) {
    if (value === null || typeof value !== "object" || seen.has(value)) {
        return value;
    }
    seen.add(value);
    for (const key of Object.keys(value)) {
        deepFreeze(value[key], seen);
    }
    return Object.freeze(value);
}
export function isDataDefinition(value) {
    return typeof value === "object" && value !== null && value[DEFINITION_BRAND] === true;
}
export function isDataInstance(value) {
    return typeof value === "object" && value !== null && value[INSTANCE_BRAND] === true;
}
export function defineData(input) {
    if (typeof input?.name !== "string" || input.name.length === 0) {
        throw new TypeError("[obix-core-data] defineData: `name` must be a non-empty string");
    }
    if (input.state === null || typeof input.state !== "object") {
        throw new TypeError(`[obix-core-data] defineData("${input.name}"): \`state\` must be a plain object`);
    }
    const actions = (input.actions ?? {});
    for (const [key, action] of Object.entries(actions)) {
        if (typeof action !== "function") {
            throw new TypeError(`[obix-core-data] defineData("${input.name}"): action "${key}" must be a function`);
        }
    }
    const definition = {
        name: input.name,
        state: deepFreeze(cloneData(input.state)),
        actions: Object.freeze({ ...actions }),
        [DEFINITION_BRAND]: true,
    };
    return Object.freeze(definition);
}
export function createDataInstance(definition, overrides = {}) {
    if (!isDataDefinition(definition)) {
        throw new TypeError("[obix-core-data] createDataInstance: expected a definition created by defineData()");
    }
    const context = {
        state: cloneData(overrides.state ?? definition.state),
    };
    const actions = {};
    for (const key of Object.keys(definition.actions)) {
        const action = definition.actions[key];
        actions[key] = (...args) => {
            action(context, ...args);
        };
    }
    const instance = {
        definition,
        actions: Object.freeze(actions),
        [INSTANCE_BRAND]: true,
        get state() {
            return context.state;
        },
    };
    return instance;
}
export function snapshotData(instance) {
    if (!isDataInstance(instance)) {
        throw new TypeError("[obix-core-data] snapshotData: expected an instance created by createDataInstance()");
    }
    return Object.freeze({
        name: instance.definition.name,
        state: deepFreeze(cloneData(instance.state)),
    });
}
function assertSerializable(value, path, seen) {
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
export function serializeData(snapshot) {
    assertSerializable(snapshot.state, "$.state", new Set());
    return JSON.stringify({ name: snapshot.name, state: snapshot.state });
}
export function deserializeData(serialized) {
    let parsed;
    try {
        parsed = JSON.parse(serialized);
    }
    catch (cause) {
        throw new OBIXSerializationError("[obix-core-data] deserializeData: invalid JSON", { cause });
    }
    if (parsed === null ||
        typeof parsed !== "object" ||
        typeof parsed.name !== "string" ||
        typeof parsed.state !== "object" ||
        parsed.state === null) {
        throw new OBIXSerializationError("[obix-core-data] deserializeData: expected a serialized OBIX snapshot (`{ name, state }`)");
    }
    const { name, state } = parsed;
    return Object.freeze({ name, state: deepFreeze(state) });
}
//# sourceMappingURL=data.js.map