// Public compatibility entrypoint. New code should import from storage directly.
export { StateStore } from "./storage/state-store.js";
export { sanitizeTerminal } from "./storage/sanitize-terminal.js";
export type {
  CompanyRecord,
  CreateCompanyInput,
  EntityRecord,
  MessageRecord,
} from "./storage/records.js";
