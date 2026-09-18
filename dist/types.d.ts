export interface OBIXDataContext<State> {
    state: State;
}
export type OBIXAction<State, Args extends readonly unknown[] = readonly unknown[]> = (context: OBIXDataContext<State>, ...args: Args) => void;
export type OBIXActionMap<State> = Record<string, OBIXAction<State, any>>;
export type OBIXActionArgs<State, Action> = Action extends (context: OBIXDataContext<State>, ...args: infer Args) => void ? Args : never;
export interface OBIXDataDefinition<State extends object, Actions extends OBIXActionMap<State> = OBIXActionMap<State>> {
    readonly name: string;
    readonly state: Readonly<State>;
    readonly actions: Readonly<Actions>;
}
export type OBIXBoundActions<State extends object, Actions extends OBIXActionMap<State>> = {
    readonly [K in keyof Actions]: (...args: OBIXActionArgs<State, Actions[K]>) => void;
};
export interface OBIXDataInstance<State extends object, Actions extends OBIXActionMap<State> = OBIXActionMap<State>> {
    readonly definition: OBIXDataDefinition<State, Actions>;
    readonly state: State;
    readonly actions: OBIXBoundActions<State, Actions>;
}
export interface OBIXSnapshot<State extends object> {
    readonly name: string;
    readonly state: Readonly<State>;
}
export declare class OBIXSerializationError extends Error {
    constructor(message: string, options?: {
        cause?: unknown;
    });
}
//# sourceMappingURL=types.d.ts.map