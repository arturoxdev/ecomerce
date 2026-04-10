import type { Theme, ThemeVars } from "./types";

export function serializeVars(vars: ThemeVars): string {
  return Object.entries(vars)
    .map(([k, v]) => `${k}:${v};`)
    .join("");
}

export function serializeTheme(theme: Theme): string {
  return `:root{${serializeVars(theme.vars)}}`;
}
