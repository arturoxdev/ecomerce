import { test as base, expect } from "@playwright/test";

import {
  cleanupByIds,
  emptyTrackedIds,
  makeFactories,
  readTestSettings,
  type SeedFactories,
  type Settings,
  type TrackedIds,
  upsertTestSettings,
} from "./seed-helpers";

type TestFixtures = {
  seed: SeedFactories;
  tracked: TrackedIds;
};

export const test = base.extend<TestFixtures>({
  tracked: async ({}, use) => {
    const tracked = emptyTrackedIds();
    await use(tracked);
    await cleanupByIds(tracked);
  },
  seed: async ({ tracked }, use, testInfo) => {
    const factories = makeFactories(testInfo.workerIndex, tracked);
    await use(factories);
  },
});

export { expect };
export { readTestSettings, upsertTestSettings };
export type { Settings };
