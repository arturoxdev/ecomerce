import { z } from "zod";

import { THEMES } from "@/lib/themes";
import { isWholeHour } from "./event-window.service";

const themeIds = THEMES.map((theme) => theme.id) as [string, ...string[]];

export const updateThemeSchema = z.object({
  themeId: z.enum(themeIds),
});

export type UpdateThemeInput = z.infer<typeof updateThemeSchema>;

export function parseUpdateThemeForm(formData: FormData) {
  return updateThemeSchema.safeParse({
    themeId: formData.get("themeId"),
  });
}

// ---------------------------------------------------------------------------
// Event Window
// ---------------------------------------------------------------------------

const wholeHourOrNull = z.preprocess(
  (val) => (val === "" ? null : val),
  z
    .string()
    .refine(isWholeHour, { message: "Must be a whole hour in HH:00 format" })
    .nullable(),
);

export const eventWindowSchema = z
  .object({
    eventWindowStart: wholeHourOrNull,
    eventWindowEnd: wholeHourOrNull,
  })
  .refine(
    (data) => {
      const bothNull = data.eventWindowStart === null && data.eventWindowEnd === null;
      const bothSet = data.eventWindowStart !== null && data.eventWindowEnd !== null;
      return bothNull || bothSet;
    },
    {
      message:
        "Both eventWindowStart and eventWindowEnd must be set together, or both must be null",
    },
  )
  .refine(
    (data) => {
      if (data.eventWindowStart === null || data.eventWindowEnd === null) {
        return true;
      }
      const startHour = parseInt(data.eventWindowStart.slice(0, 2), 10);
      const endHour = parseInt(data.eventWindowEnd.slice(0, 2), 10);
      return endHour >= startHour;
    },
    {
      message: "eventWindowEnd must be greater than or equal to eventWindowStart",
    },
  );

export type EventWindowInput = z.infer<typeof eventWindowSchema>;

export function parseEventWindowForm(formData: FormData) {
  return eventWindowSchema.safeParse({
    eventWindowStart: formData.get("eventWindowStart"),
    eventWindowEnd: formData.get("eventWindowEnd"),
  });
}
