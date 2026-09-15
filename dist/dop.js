const EMPTY = Object.freeze({});
function clone(value) {
    return typeof structuredClone === "function"
        ? structuredClone(value)
        : JSON.parse(JSON.stringify(value));
}
export function reduce(component, state, actionName, payload, props) {
    const action = component.actions[actionName];
    if (typeof action !== "function") {
        throw new Error(`[obix] ${component.name}: unknown action "${actionName}"`);
    }
    const draft = clone(state);
    const resolvedProps = (props ?? component.props ?? EMPTY);
    const ctx = { state: draft, props: resolvedProps };
    for (const name of Object.keys(component.actions)) {
        ctx[name] = (p) => {
            component.actions[name](ctx, p);
        };
    }
    action(ctx, payload);
    return draft;
}
export function replay(component, trace, from, props) {
    let current = from ?? component.state;
    for (const step of trace) {
        current = reduce(component, current, step[0], step[1], props);
    }
    return current;
}
export function view(component, state, props) {
    const resolvedProps = (props ?? component.props ?? EMPTY);
    const derived = {};
    for (const [key, fn] of Object.entries(component.derived ?? {})) {
        try {
            derived[key] = fn(state, resolvedProps);
        }
        catch {
            derived[key] = undefined;
        }
    }
    return { state, props: resolvedProps, derived, ...resolvedProps, ...state, ...derived };
}
export function renderHtml(component, state, props) {
    return component.render ? component.render(view(component, state, props)) : "";
}
export function validate(component, state, props) {
    const resolvedProps = (props ?? component.props ?? EMPTY);
    return component.validate
        ? component.validate(state, resolvedProps)
        : { valid: true, violations: [] };
}
export function changedKeys(prev, next) {
    const keys = new Set([...Object.keys(prev), ...Object.keys(next)]);
    const out = [];
    for (const key of keys) {
        if (prev[key] !== next[key]) {
            out.push(key);
        }
    }
    return out;
}
//# sourceMappingURL=dop.js.map