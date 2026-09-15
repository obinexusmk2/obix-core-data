import test from "node:test";
import assert from "node:assert/strict";
import { toData, dataApply, dataReplay, dataRender, dataValidate } from "../dist/index.js";

const Counter = {
  name: "Counter",
  state: { count: 0 },
  actions: {
    inc: (ctx, by = 1) => {
      ctx.state.count += by;
    },
    reset: (ctx) => {
      ctx.state.count = 0;
    },
  },
  derived: { label: (s) => `count: ${s.count}` },
  render: (v) => `<button aria-label="${v.derived.label}">${v.state.count}</button>`,
  validate: (s) => ({ valid: s.count >= 0, violations: [] }),
};

test("toData is identity over the artifact", () => {
  assert.equal(toData(Counter), Counter);
});

test("dataApply / dataReplay thread state+payload+props explicitly", () => {
  const s1 = dataApply(Counter, Counter.state, "inc");
  assert.deepEqual(s1, { count: 1 });
  const s2 = dataReplay(Counter, [["inc"], ["inc"], ["reset"], ["inc", 4]]);
  assert.deepEqual(s2, { count: 4 });
});

test("dataApply does not mutate the state object passed in", () => {
  const before = { count: 0 };
  dataApply(Counter, before, "inc");
  assert.deepEqual(before, { count: 0 });
});

test("dataRender / dataValidate at a given state", () => {
  const s = { count: 3 };
  assert.equal(dataRender(Counter, s), '<button aria-label="count: 3">3</button>');
  assert.equal(dataValidate(Counter, s).valid, true);
});

test("dataApply throws on an unknown action name", () => {
  assert.throws(() => dataApply(Counter, Counter.state, "doesNotExist"), /unknown action "doesNotExist"/);
});
