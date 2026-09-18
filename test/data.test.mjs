import test from "node:test";
import assert from "node:assert/strict";
import {
  cloneData,
  createDataInstance,
  defineData,
  deserializeData,
  isDataDefinition,
  isDataInstance,
  serializeData,
  snapshotData,
  OBIXSerializationError,
} from "../dist/index.js";

function makeCounter() {
  return defineData({
    name: "Counter",
    state: { count: 0 },
    actions: {
      increment(ctx) {
        ctx.state.count++;
      },
      add(ctx, amount) {
        ctx.state.count += amount;
      },
    },
  });
}

// 1. Creating a data definition.
test("defineData creates a named, branded definition", () => {
  const Counter = makeCounter();
  assert.equal(Counter.name, "Counter");
  assert.deepEqual(Counter.state, { count: 0 });
  assert.equal(typeof Counter.actions.increment, "function");
  assert.equal(isDataDefinition(Counter), true);
  assert.equal(isDataDefinition({ name: "Fake", state: {}, actions: {} }), false);
});

// 2. Creating an instance from a definition.
test("createDataInstance materializes state and bound actions from a definition", () => {
  const Counter = makeCounter();
  const counter = createDataInstance(Counter);
  assert.equal(isDataInstance(counter), true);
  assert.deepEqual(counter.state, { count: 0 });
  assert.equal(typeof counter.actions.increment, "function");
  assert.throws(() => createDataInstance({ not: "a definition" }), TypeError);
});

// 3. State isolation between two instances.
test("two instances of the same definition never share state", () => {
  const Counter = makeCounter();
  const a = createDataInstance(Counter);
  const b = createDataInstance(Counter);
  assert.notEqual(a.state, b.state);
  assert.notEqual(a.state, Counter.state);
});

// 4. Actions mutating only their own instance.
// 5. Arguments passed into typed actions.
test("actions mutate only the owning instance, with arguments threaded through", () => {
  const Counter = makeCounter();
  const a = createDataInstance(Counter);
  const b = createDataInstance(Counter);

  a.actions.increment();
  a.actions.add(4);

  assert.equal(a.state.count, 5);
  assert.equal(b.state.count, 0);
});

// 6. Snapshot independence.
test("a snapshot is detached from later mutation of the instance it was taken from", () => {
  const Counter = makeCounter();
  const counter = createDataInstance(Counter);
  counter.actions.add(3);

  const snap = snapshotData(counter);
  assert.deepEqual(snap.state, { count: 3 });

  counter.actions.add(10);
  assert.equal(counter.state.count, 13);
  assert.equal(snap.state.count, 3, "snapshot must not observe later mutation");

  assert.throws(() => {
    snap.state.count = 999;
  }, TypeError, "snapshot state is frozen");

  assert.throws(() => snapshotData({ not: "an instance" }), TypeError);
});

// 7. Definition state is not mutated by instances.
test("definition state is frozen and unaffected by instance mutation", () => {
  const Counter = makeCounter();
  const a = createDataInstance(Counter);
  a.actions.add(7);

  assert.deepEqual(Counter.state, { count: 0 }, "definition state must stay at its original value");
  assert.throws(() => {
    Counter.state.count = 42;
  }, TypeError, "definition state is frozen");
});

// 8. Serialization of valid serializable state.
// 9. Deserialization.
test("serializeData / deserializeData round-trip a snapshot's state", () => {
  const Counter = makeCounter();
  const counter = createDataInstance(Counter);
  counter.actions.add(9);

  const snap = snapshotData(counter);
  const json = serializeData(snap);
  assert.equal(typeof json, "string");
  assert.deepEqual(JSON.parse(json), { name: "Counter", state: { count: 9 } });

  const restored = deserializeData(json);
  assert.deepEqual(restored.state, { count: 9 });
  assert.equal(restored.name, "Counter");

  const resumed = createDataInstance(Counter, { state: restored.state });
  assert.equal(resumed.state.count, 9);
  resumed.actions.increment();
  assert.equal(resumed.state.count, 10);
  assert.equal(restored.state.count, 9, "resuming from a snapshot must not mutate the snapshot");
});

// 10. Predictable handling of unsupported serialization values.
test("serializeData rejects functions, symbols and undefined instead of silently dropping them", () => {
  assert.throws(
    () => serializeData({ name: "Bad", state: { onClick: () => {} } }),
    OBIXSerializationError,
  );
  assert.throws(
    () => serializeData({ name: "Bad", state: { id: Symbol("x") } }),
    OBIXSerializationError,
  );
  assert.throws(
    () => serializeData({ name: "Bad", state: { missing: undefined } }),
    OBIXSerializationError,
  );
  assert.throws(() => deserializeData("not json"), OBIXSerializationError);
  assert.throws(() => deserializeData(JSON.stringify({ name: "x" })), OBIXSerializationError);
});

// 11. Generic inference — exercised at compile time via `npm run build`;
// this asserts the runtime values that inference is supposed to describe.
test("cloneData deep-clones without sharing references, and rejects functions like structuredClone does", () => {
  const original = { count: 1, nested: { deep: true } };
  const cloned = cloneData(original);
  assert.deepEqual(cloned, original);
  assert.notEqual(cloned, original);
  assert.notEqual(cloned.nested, original.nested);
  assert.throws(() => cloneData({ fn: () => {} }));
});

// 12. No browser/Node runtime requirement: defineData/createDataInstance
// work with nothing but plain objects and functions.
test("defineData validates its input shape predictably", () => {
  assert.throws(() => defineData({ name: "", state: {} }), TypeError);
  assert.throws(() => defineData({ name: "X", state: null }), TypeError);
  assert.throws(
    () => defineData({ name: "X", state: {}, actions: { bad: "not a function" } }),
    TypeError,
  );
});
