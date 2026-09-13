/**
 * Server surface. Importing this from a client component pulls
 * @copilotkit/runtime (and Node's `fs`) into the browser bundle.
 * Client code wants `agent-core/shared`.
 */
export { makeAgent } from "./agent";
export { resolveModel } from "./model";
export * from "./shared";
