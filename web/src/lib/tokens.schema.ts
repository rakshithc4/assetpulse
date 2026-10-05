import { z } from 'zod';

const colorTriad = z.object({ bg: z.string(), fg: z.string(), border: z.string() });

export const tokensSchema = z.object({
  surface: z.object({ base: z.string(), panel: z.string(), raised: z.string() }),
  text: z.object({ primary: z.string(), secondary: z.string(), muted: z.string() }),
  severity: z.object({ low: colorTriad, medium: colorTriad, high: colorTriad, critical: colorTriad }),
  opstatus: z.object({ operational: colorTriad, maintenance: colorTriad, down: colorTriad }),
  lifecycle: z.object({
    created: colorTriad,
    scheduled: colorTriad,
    in_progress: colorTriad,
    completed: colorTriad,
    cancelled: colorTriad,
  }),
  type: z.object({
    fontSans: z.string(),
    fontMono: z.string(),
    scale: z.object({
      xs: z.string(),
      sm: z.string(),
      base: z.string(),
      lg: z.string(),
      xl: z.string(),
      '2xl': z.string(),
      '3xl': z.string(),
    }),
  }),
  radius: z.object({ sm: z.string(), md: z.string(), lg: z.string() }),
});

export type Tokens = z.infer<typeof tokensSchema>;
