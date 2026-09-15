# Zero-dependency vendoring

This package has no `dependencies` in `package.json` — not
`@obinexusltd/obix-spec`, not `@obinexusltd/obix-ir`, nothing. `src/types.ts`,
`src/dop.ts`, and `src/env.d.ts` are vendored copies, **identical** to
[obix-core-func](../../obix-core-func)'s own copies of the same three
files — not a coincidence, but the explicit convention documented in both
files' header comments: these are meant to be byte-identical across every
`@obinexusltd/obix-adapter-*` package.

See [obix-core-func/docs/zero-dependency-vendoring.md](../../obix-core-func/docs/zero-dependency-vendoring.md)
for the full rationale (why vendor instead of depend, what "byte-identical"
buys you via TypeScript structural typing, and the tradeoff being made).
Everything there applies equally here; this page only covers what's
specific to how this package uses the vendored files.

## What this package vendors, and how it differs from `obix-core-func`'s use of the same files

| File | Same content as `obix-core-func`? | Used differently here? |
|---|---|---|
| `src/types.ts` | Yes, byte-identical. | No — same types, same meaning. |
| `src/dop.ts` | Yes, byte-identical. | No — same `reduce`/`replay`/`view`/`renderHtml`/`validate`/`changedKeys`, unmodified. |
| `src/env.d.ts` | Yes, byte-identical. | No. |
| `src/index.ts` | **Different** — this is the whole point of the two packages existing separately. | `obix-core-func` wraps `dop.ts` behind `toFunctional(component).create()` (closure-held state). This package (`obix-core-data`) exposes `dop.ts`'s functions almost directly, as `dataApply`/`dataReplay`/`dataRender`/`dataValidate`, taking `component` and `state` explicitly on every call — see [data-projection-contract.md](data-projection-contract.md). |

Both packages' `dist/dop.js` are therefore functionally interchangeable —
copying one package's compiled `dop.js` over the other's would work,
because the source is identical before compilation. This is intentional:
it's what "byte-identical across the family" is for.

## Keeping the vendored copies in sync

If `obix-core-func`'s `dop.ts` or `types.ts` changes (a bug fix, a new
field), the same change needs porting here by hand — there is no build
step, script, or test in this package that checks its vendored files
still match `obix-core-func`'s (or any other adapter's). If you're fixing
something in the shared reducer, treat it as a cross-package change:
update it here, in `obix-core-func`, and in any other adapter package that
carries the same vendored files, in the same commit or PR if possible, to
avoid the family drifting apart silently.

## Why this package didn't just depend on `obix-core-func` instead

Given the two packages share identical `types.ts`/`dop.ts`, it might seem
simpler for `obix-core-data` to depend on `obix-core-func` and reuse its
compiled `dist/dop.js` rather than vendoring a second copy. That would
reintroduce exactly the dependency-resolution overhead ("no dependencies
whatsoever" was the explicit goal of this rewrite) and would also be
backwards from how the adapter family is meant to relate to each other —
none of the `@obinexusltd/obix-adapter-*` projections are supposed to
depend on one another; they're meant to be independently installable,
each a complete, self-contained implementation of the same DOP contract
from a different calling-convention angle.
