import { getThemeId } from "@/lib/data/settings";
import { THEMES } from "@/lib/themes";
import { ThemeGrid } from "@/features/settings";

export const metadata = {
  title: "Apariencia",
};

export default async function AppearancePage() {
  const current = await getThemeId();

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Apariencia</h1>
        <p className="text-sm text-muted-foreground">
          Elige un tema para el panel de administración y la tienda.
        </p>
      </div>
      <ThemeGrid themes={THEMES} current={current} />
    </div>
  );
}
