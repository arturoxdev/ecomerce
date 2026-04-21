import { cosmicNight } from "./presets/cosmic-night";
import { defaultTheme } from "./presets/default";
import { niceSunset } from "./presets/nice-sunset";
import { sunset } from "./presets/sunset";
import { twitter } from "./presets/twitter";
import { vercel } from "./presets/vercel";
import type { Theme } from "./types";

export const DEFAULT_THEME_ID = "default";

export const THEMES: Theme[] = [
  defaultTheme,
  vercel,
  twitter,
  sunset,
  cosmicNight,
  niceSunset,
];

export function getThemeById(id: string | null | undefined): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

export type { Theme, ThemeVars } from "./types";
export { serializeTheme, serializeVars } from "./serialize";
