/**
 * Vendored DOP artifact types.
 *
 * BYTE-IDENTICAL across every @obinexusltd/obix-adapter-* package and the
 * canonical copy in @obinexusltd/obix. These packages take ZERO dependencies,
 * so the shape is duplicated rather than imported; TypeScript structural typing
 * lets one artifact object satisfy all five adapters at once.
 */

export interface ValidationResult {
  valid: boolean;
  violations: string[];
}

export interface ActionContext<S extends object, P extends object = Record<string, unknown>> {
  state: S;
  props: P;
  [action: string]: unknown;
}

export type ActionFn<S extends object, P extends object = Record<string, unknown>> = (
  ctx: ActionContext<S, P>,
  payload?: unknown,
) => void;

export interface RenderView<S extends object, P extends object = Record<string, unknown>> {
  state: S;
  props: P;
  derived: Record<string, unknown>;
  [key: string]: unknown;
}

export interface EffectDescriptor<S extends object, P extends object = Record<string, unknown>> {
  everyMs: number;
  while: (state: S, props: P) => boolean;
  dispatch: string;
}

export interface DOPComponent<
  S extends object = Record<string, unknown>,
  P extends object = Record<string, unknown>,
> {
  name: string;
  state: S;
  props?: P;
  actions: Record<string, ActionFn<S, P>>;
  derived?: Record<string, (state: S, props: P) => unknown>;
  effects?: Record<string, EffectDescriptor<S, P>>;
  render?: (view: RenderView<S, P>) => string;
  validate?: (state: S, props: P) => ValidationResult;
}

export type ActionTrace = ReadonlyArray<readonly [string, unknown?]>;
