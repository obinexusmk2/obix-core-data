/**
 * Vendored DOP core — the single action path.
 *
 * BYTE-IDENTICAL across every @obinexusltd/obix-adapter-* package. These
 * packages take ZERO dependencies, so this reducer is duplicated rather than
 * imported. Every projection (data / func / oop / reactive / ssr) runs state
 * transitions through `reduce` here and nowhere else — the same invariant the
 * frozen obix-ir graph enforces, without the dependency.
 */
import type {
  ActionContext,
  ActionTrace,
  DOPComponent,
  RenderView,
  ValidationResult,
} from "./types.js";

const EMPTY: Record<string, unknown> = Object.freeze({});

function clone<T>(value: T): T {
  return typeof structuredClone === "function"
    ? structuredClone(value)
    : (JSON.parse(JSON.stringify(value)) as T);
}

/** Run one action. Returns a NEW state object; the input is never mutated. */
export function reduce<S extends object, P extends object>(
  component: DOPComponent<S, P>,
  state: S,
  actionName: string,
  payload?: unknown,
  props?: P,
): S {
  const action = component.actions[actionName];
  if (typeof action !== "function") {
    throw new Error(`[obix] ${component.name}: unknown action "${actionName}"`);
  }
  const draft = clone(state);
  const resolvedProps = (props ?? component.props ?? (EMPTY as P)) as P;
  const ctx = { state: draft, props: resolvedProps } as ActionContext<S, P>;
  for (const name of Object.keys(component.actions)) {
    ctx[name] = (p?: unknown): void => {
      component.actions[name]!(ctx, p);
    };
  }
  action(ctx, payload);
  return draft;
}

/** Fold an action trace into a final state. */
export function replay<S extends object, P extends object>(
  component: DOPComponent<S, P>,
  trace: ActionTrace,
  from?: S,
  props?: P,
): S {
  let current = from ?? component.state;
  for (const step of trace) {
    current = reduce(component, current, step[0], step[1], props);
  }
  return current;
}

/** Compute the render view: state + props + derived, flattened for templates. */
export function view<S extends object, P extends object>(
  component: DOPComponent<S, P>,
  state: S,
  props?: P,
): RenderView<S, P> {
  const resolvedProps = (props ?? component.props ?? (EMPTY as P)) as P;
  const derived: Record<string, unknown> = {};
  for (const [key, fn] of Object.entries(component.derived ?? {})) {
    try {
      derived[key] = fn(state, resolvedProps);
    } catch {
      derived[key] = undefined;
    }
  }
  return { state, props: resolvedProps, derived, ...resolvedProps, ...state, ...derived };
}

/** Render a state to an HTML string via the artifact's own `render`. */
export function renderHtml<S extends object, P extends object>(
  component: DOPComponent<S, P>,
  state: S,
  props?: P,
): string {
  return component.render ? component.render(view(component, state, props)) : "";
}

/** Run the artifact's own `validate`, or pass. */
export function validate<S extends object, P extends object>(
  component: DOPComponent<S, P>,
  state: S,
  props?: P,
): ValidationResult {
  const resolvedProps = (props ?? component.props ?? (EMPTY as P)) as P;
  return component.validate
    ? component.validate(state, resolvedProps)
    : { valid: true, violations: [] };
}

/** Shallow changed-key diff between two states. */
export function changedKeys<S extends object>(prev: S, next: S): string[] {
  const keys = new Set([...Object.keys(prev), ...Object.keys(next)]);
  const out: string[] = [];
  for (const key of keys) {
    if ((prev as Record<string, unknown>)[key] !== (next as Record<string, unknown>)[key]) {
      out.push(key);
    }
  }
  return out;
}
