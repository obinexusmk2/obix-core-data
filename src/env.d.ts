/**
 * Minimal ambient host globals.
 *
 * Declared here so this package needs ZERO dependencies — not even
 * `@types/node`. Node >= 20.11 provides all of these (browsers provide
 * `structuredClone` and the timers too). BYTE-IDENTICAL across the
 * @obinexusltd/obix-adapter-* set.
 */

declare function structuredClone<T>(value: T): T;
declare function setInterval(handler: () => void, ms: number): unknown;
declare function clearInterval(handle: unknown): void;
