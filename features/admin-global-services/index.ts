// Actions ("use server" — safe to import from client components)
export {
  createService,
  updateService,
  toggleServiceActive,
  deleteService,
  type GlobalServiceFormState,
} from "./actions";

// Components (admin)
export { ServiceForm } from "./components/service-form";
export { ServiceList } from "./components/service-list";

// Types
export type { GlobalService } from "./types";

// NOTE: the server-only module (`./data`) is NOT re-exported here so this
// barrel stays safe to import from client components. Server code (pages)
// deep-imports it directly via `@/features/admin-global-services/data`.
