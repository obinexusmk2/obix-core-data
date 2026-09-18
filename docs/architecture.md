# Architecture

## Everything is data

OBIX's premise is that a component's *canonical* representation is plain
data — not a class, not a function, not a JSX tree. Those are all
consumers of the data, not the data itself:

```
                   OBIX DATA MODEL
                         |
          +--------------+--------------+
          |              |              |
       Function        Object        Reactive
       adapter         adapter       adapter
          |              |              |
          +--------------+--------------+
                         |
                      Runtime
```

`obix-core-data` is that data model. It sits above raw JavaScript objects
(it adds structure: definitions, isolated instances, typed actions,
snapshots) and below any rendering, component, or runtime adapter — it has
no rendering concept, no class requirement, and no framework dependency.
A future functional adapter and a future OOP adapter can both consume the
exact same `OBIXDataDefinition` without either one owning it, or rewriting
it, or requiring the other to change.

## The pipeline: definition -> instance -> transition -> snapshot

```
defineData(...)          createDataInstance(...)      instance.actions.x()      snapshotData(...)
        |                          |                            |                        |
        v                          v                            v                        v
   Definition   ─────────>    Instance A            S0 ──action──> S1         Snapshot (detached, frozen)
   (reusable,                 Instance B
    frozen)                (independent state)
```

- **Definition** (`defineData`) — reusable template data: a name, an
  initial state shape, and the named actions that transition it. Frozen
  immediately; never mutated after creation.
- **Instance** (`createDataInstance`) — isolated, mutable state
  materialized from a definition. `a.state !== b.state !== definition.state`
  always, even when `a` and `b` come from the same definition.
- **State transition** — calling `instance.actions.someAction(...)` runs
  the definition's action against that instance's own context
  (`{ state }`), mutating (or fully reassigning) `context.state`. This
  package does not record, minimize, or replay a trace of transitions —
  but it doesn't prevent a future package from doing so either: nothing
  about the definition/instance split assumes there is only ever one
  state value in play, which is what a transition-recording layer would
  need to build on top.
- **Snapshot** (`snapshotData`) — a detached, frozen `S(t)`: the
  instance's state at the moment of the call, decoupled from further
  mutation of that instance. This is the safe handoff point for anything
  downstream that wants to look at state without being able to change it
  or without racing the instance's own mutations — telemetry, state
  minimization, checkpointing, persistence, diagnostics, deterministic
  tests, replay.

## Serializable data vs. executable behavior

An `OBIXDataDefinition` contains both data and behavior, and they are
different categories:

```
                    OBIX Definition
                    /             \
                   /               \
          Serializable Data     Behaviour
               state{}           actions{}
                   |                |
                   |                |
             persistence         runtime
             telemetry
             snapshots
```

`snapshotData` only ever looks at `instance.state` — never at
`definition.actions` or `instance.actions` — so there is no path by which
a snapshot could accidentally end up holding a function. `serializeData`
adds a second, runtime-checked guarantee on top: it walks the snapshot's
state and throws `OBIXSerializationError` if it finds a function, symbol,
bigint, `undefined`, or a circular reference, rather than silently
dropping them the way `JSON.stringify` alone would. The failure is always
explicit and points at the offending path (e.g. `$.state.onClick`).

## Why no `reduce`/`render`/`validate` here

Earlier versions of this package (`<= 0.3.0`) were one of several
`@obinexusltd/obix-adapter-*`-style sibling projections (data / func / oop
/ reactive / ssr) that each vendored an identical `DOPComponent` type and
`reduce` function, differing only in whether they held an instance for
you. That model made every projection a peer with no shared foundation.

As of `0.4.0`, `obix-core-data` is the foundation those adapters build on
top of, not a peer of them — hence no `render`, `validate`, `derived`, or
`effects` here: those are rendering/runtime concerns for an adapter
package to add, not something the canonical data layer should carry
around for every consumer whether it needs it or not.
