import type { ActionTrace, DOPComponent, ValidationResult } from "./types.js";
export type { ActionContext, ActionFn, ActionTrace, DOPComponent, EffectDescriptor, RenderView, ValidationResult, } from "./types.js";
export declare function toData<S extends object, P extends object>(component: DOPComponent<S, P>): DOPComponent<S, P>;
export declare function dataApply<S extends object, P extends object>(component: DOPComponent<S, P>, state: S, actionName: string, payload?: unknown, props?: P): S;
export declare function dataReplay<S extends object, P extends object>(component: DOPComponent<S, P>, trace: ActionTrace, from?: S, props?: P): S;
export declare function dataRender<S extends object, P extends object>(component: DOPComponent<S, P>, state: S, props?: P): string;
export declare function dataValidate<S extends object, P extends object>(component: DOPComponent<S, P>, state: S, props?: P): ValidationResult;
//# sourceMappingURL=index.d.ts.map