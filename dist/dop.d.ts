import type { ActionTrace, DOPComponent, RenderView, ValidationResult } from "./types.js";
export declare function reduce<S extends object, P extends object>(component: DOPComponent<S, P>, state: S, actionName: string, payload?: unknown, props?: P): S;
export declare function replay<S extends object, P extends object>(component: DOPComponent<S, P>, trace: ActionTrace, from?: S, props?: P): S;
export declare function view<S extends object, P extends object>(component: DOPComponent<S, P>, state: S, props?: P): RenderView<S, P>;
export declare function renderHtml<S extends object, P extends object>(component: DOPComponent<S, P>, state: S, props?: P): string;
export declare function validate<S extends object, P extends object>(component: DOPComponent<S, P>, state: S, props?: P): ValidationResult;
export declare function changedKeys<S extends object>(prev: S, next: S): string[];
//# sourceMappingURL=dop.d.ts.map