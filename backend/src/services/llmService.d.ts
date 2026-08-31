export function buildTemplatePreVisitSummary(
  booking: Record<string, unknown>
): string;
export function buildTemplatePostVisitSummary(
  booking: Record<string, unknown>
): string;
export function generatePreVisitSummary(
  booking: Record<string, unknown>
): Promise<string>;
export function generatePostVisitSummary(
  booking: Record<string, unknown>
): Promise<string | null>;
export function retrySummary(
  booking: Record<string, unknown>,
  type: "pre" | "post"
): Promise<string | null>;
