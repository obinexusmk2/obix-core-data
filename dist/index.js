import { reduce, replay as fold, renderHtml, validate as validateState } from "./dop.js";
export function toData(component) {
    return component;
}
export function dataApply(component, state, actionName, payload, props) {
    return reduce(component, state, actionName, payload, props);
}
export function dataReplay(component, trace, from, props) {
    return fold(component, trace, from, props);
}
export function dataRender(component, state, props) {
    return renderHtml(component, state, props);
}
export function dataValidate(component, state, props) {
    return validateState(component, state, props);
}
//# sourceMappingURL=index.js.map