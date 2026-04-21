import "server-only";

import { eq } from "drizzle-orm";

import { getStoreId } from "@/lib/config/tenant";
import { db, type Database } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { DEFAULT_THEME_ID } from "@/lib/themes";

export type SettingsRepoDeps = {
  db: Database;
  storeId: string;
};

export function createSettingsRepo(deps: SettingsRepoDeps) {
  const { db: dbx, storeId } = deps;

  function getAll() {
    return dbx.query.settings.findFirst({
      where: eq(settings.storeId, storeId),
    });
  }

  function getByKey<K extends keyof typeof settings.$inferSelect>(key: K) {
    return dbx.query.settings
      .findFirst({ where: eq(settings.storeId, storeId) })
      .then((s) => s?.[key] ?? null);
  }

  function upsert(data: Partial<typeof settings.$inferInsert>) {
    return dbx
      .insert(settings)
      .values({ storeId, ...data } as typeof settings.$inferInsert)
      .onConflictDoUpdate({
        target: settings.storeId,
        set: data,
      });
  }

  async function getThemeId(): Promise<string> {
    const row = await dbx.query.settings.findFirst({
      where: eq(settings.storeId, storeId),
      columns: { themeId: true },
    });
    return row?.themeId ?? DEFAULT_THEME_ID;
  }

  function setThemeId(themeId: string) {
    return upsert({ themeId });
  }

  return {
    getAll,
    getByKey,
    upsert,
    getThemeId,
    setThemeId,
  };
}

export type SettingsRepo = ReturnType<typeof createSettingsRepo>;

const defaultRepo = createSettingsRepo({ db, storeId: getStoreId() });

export const getAll = defaultRepo.getAll;
export const getByKey = defaultRepo.getByKey;
export const upsert = defaultRepo.upsert;
export const getThemeId = defaultRepo.getThemeId;
export const setThemeId = defaultRepo.setThemeId;
