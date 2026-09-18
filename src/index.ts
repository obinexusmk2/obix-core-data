/**
 * @obinexusltd/obix-core-data
 *
 * The canonical, paradigm-neutral OBIX data substrate: definitions,
 * isolated instances, typed actions, snapshots and a serializable-data
 * boundary. Sits above raw JavaScript objects and below any rendering,
 * component or runtime adapter (functional, OOP, reactive, JSX, ...).
 *
 * Zero dependencies. No DOM, no browser/Node-only APIs, no rendering.
 */
export {
  cloneData,
  createDataInstance,
  defineData,
  deserializeData,
  isDataDefinition,
  isDataInstance,
  serializeData,
  snapshotData,
} from "./data.js";

export type {
  OBIXAction,
  OBIXActionArgs,
  OBIXActionMap,
  OBIXBoundActions,
  OBIXDataContext,
  OBIXDataDefinition,
  OBIXDataInstance,
  OBIXSnapshot,
} from "./types.js";

export { OBIXSerializationError } from "./types.js";
