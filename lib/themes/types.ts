export type ThemeVars = Record<string, string>;

export type Theme = {
  id: string;
  name: string;
  vars: ThemeVars;
};
