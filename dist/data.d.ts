import type { OBIXActionMap, OBIXDataDefinition, OBIXDataInstance, OBIXSnapshot } from "./types.js";
export declare function cloneData<T>(value: T): T;
export declare function isDataDefinition(value: unknown): value is OBIXDataDefinition<object>;
export declare function isDataInstance(value: unknown): value is OBIXDataInstance<object>;
export declare function defineData<State extends object, Actions extends OBIXActionMap<State>>(input: {
    name: string;
    state: State;
    actions?: Actions;
}): OBIXDataDefinition<State, Actions>;
export declare function createDataInstance<State extends object, Actions extends OBIXActionMap<State>>(definition: OBIXDataDefinition<State, Actions>, overrides?: {
    state?: State;
}): OBIXDataInstance<State, Actions>;
export declare function snapshotData<State extends object>(instance: OBIXDataInstance<State, OBIXActionMap<State>>): OBIXSnapshot<State>;
export declare function serializeData<State extends object>(snapshot: OBIXSnapshot<State>): string;
export declare function deserializeData<State extends object>(serialized: string): OBIXSnapshot<State>;
//# sourceMappingURL=data.d.ts.map