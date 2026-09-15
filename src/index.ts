/**
 * @obinexusltd/obix-core-data
 *
 * The Data projection: the identity over a DOP artifact. No hidden props, no
 * instance, no lifecycle. The caller threads `component`, `state`, `payload`
 * and `props` itself, every call. All transitions route through the vendored
 * `reduce` (./dop.js) — the same single action path the other adapter
 * projections (func / oop / reactive / ssr) use.
 *
 * Zero dependencies.
 */
import { reduce, replay as fold, renderHtml, validate as validateState } from "./dop.js";
import type { ActionTrace, DOPComponent, ValidationResult } from "./types.js";

export type {
  ActionContext,
  ActionFn,
  ActionTrace,
  DOPComponent,
  EffectDescriptor,
  RenderView,
  ValidationResult,
} from "./types.js";

/** Data projection === the artifact itself. Pure identity, `toData(c) === c` always. */
export function toData<S extends object, P extends object>(
  component: DOPComponent<S, P>,
): DOPComponent<S, P> {
  return component;
}

/** Apply one action. Caller owns everything. */
export function dataApply<S extends object, P extends object>(
  component: DOPComponent<S, P>,
  state: S,
  actionName: string,
  payload?: unknown,
  props?: P,
): S {
  return reduce(component, state, actionName, payload, props);
}

/** Fold a trace over the Data projection. */
export function dataReplay<S extends object, P extends object>(
  component: DOPComponent<S, P>,
  trace: ActionTrace,
  from?: S,
  props?: P,
): S {
  return fold(component, trace, from, props);
}

export function dataRender<S extends object, P extends object>(
  component: DOPComponent<S, P>,
  state: S,
  props?: P,
): string {
  return renderHtml(component, state, props);
}

export function dataValidate<S extends object, P extends object>(
  component: DOPComponent<S, P>,
  state: S,
  props?: P,
): ValidationResult {
  return validateState(component, state, props);
}
