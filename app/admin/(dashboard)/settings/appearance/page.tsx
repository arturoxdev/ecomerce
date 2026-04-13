import { getThemeId } from "@/lib/data/settings";
import { THEMES } from "@/lib/themes";

import { ThemeGrid } from "./theme-grid";

export const metadata = {
  title: "Appearance",
};

export default async function AppearancePage() {
  const current = await getThemeId();

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Appearance</h1>
        <p className="text-sm text-muted-foreground">
          Choose a theme for the admin panel and the storefront.
        </p>
      </div>
      <ThemeGrid themes={THEMES} current={current} />
    </div>
  );
}
