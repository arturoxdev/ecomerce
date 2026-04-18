import { env } from "@/lib/env";

export function getStoreId(): string {
  return env.STORE_ID;
}
