import type { z } from "zod";

/** First error message per field, for showing next to form inputs. */
export function fieldErrors<T>(error: z.ZodError<T>) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !out[key]) out[key] = issue.message;
  }
  return out as Partial<Record<keyof T, string>>;
}
