/**
 * LLM service for generating pre-visit and post-visit booking summaries.
 * Uses Google Gemini via GEMINI_API_KEY (default: gemini-3.6-flash).
 * Failures fall back to template summaries — never block booking operations.
 */

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";
const GEMINI_API_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";

function formatVehicle(vehicle) {
  if (!vehicle) return "customer vehicle";
  const label = [vehicle.year, vehicle.make, vehicle.model]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (label && vehicle.plate) return `${label} (${vehicle.plate})`;
  if (label) return label;
  if (vehicle.plate) return `vehicle (${vehicle.plate})`;
  return "customer vehicle";
}

function formatScheduledAt(scheduledAt) {
  try {
    return new Date(scheduledAt).toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "scheduled appointment time";
  }
}

function withArticle(phrase) {
  const trimmed = String(phrase).trim();
  if (!trimmed) return "a service";
  return /^[aeiou]/i.test(trimmed) ? `an ${trimmed}` : `a ${trimmed}`;
}

function formatAmount(amount) {
  const value = Number(amount);
  if (Number.isFinite(value)) return `$${value.toFixed(2)}`;
  return "quoted amount";
}

/**
 * Normalize booking shape from Prisma (nested user) or flat LLM context.
 */
function normalizeBooking(booking) {
  const customerName =
    booking.customer?.name ??
    booking.customer?.user?.name ??
    "Customer";
  const customerPhone =
    booking.customer?.phone ?? booking.customer?.user?.phone ?? null;
  const customerAddress = booking.customer?.address ?? null;

  const mechanicName =
    booking.mechanic?.name ??
    booking.mechanic?.user?.name ??
    null;
  const mechanicSpecialty = booking.mechanic?.specialty ?? null;

  const serviceName =
    booking.serviceCategory?.name ?? "General vehicle service";
  const serviceDescription = booking.serviceCategory?.description ?? null;

  return {
    id: booking.id ?? "unknown",
    status: booking.status ?? "UNKNOWN",
    amount: booking.amount,
    scheduledAt: booking.scheduledAt,
    customerName,
    customerPhone,
    customerAddress,
    vehicle: booking.vehicle,
    serviceName,
    serviceDescription,
    mechanicName,
    mechanicSpecialty,
  };
}

function buildBookingContextText(booking) {
  const b = normalizeBooking(booking);
  const lines = [
    `Service type: ${b.serviceName}`,
    `Scheduled: ${formatScheduledAt(b.scheduledAt)}`,
    `Quoted price: ${formatAmount(b.amount)}`,
    `Customer: ${b.customerName}`,
  ];

  if (b.customerPhone) lines.push(`Customer phone: ${b.customerPhone}`);
  if (b.customerAddress) lines.push(`Service address: ${b.customerAddress}`);
  lines.push(`Vehicle: ${formatVehicle(b.vehicle)}`);
  if (b.serviceDescription) lines.push(`Service notes: ${b.serviceDescription}`);
  if (b.mechanicName) {
    lines.push(
      `Assigned mechanic: ${b.mechanicName}${
        b.mechanicSpecialty ? ` (${b.mechanicSpecialty})` : ""
      }`
    );
  } else {
    lines.push("Assigned mechanic: Not yet assigned");
  }
  lines.push(`Current status: ${String(b.status).replace(/_/g, " ")}`);

  return lines.join("\n");
}

function hasRichContext(booking) {
  const b = normalizeBooking(booking);
  return Boolean(
    b.customerName &&
      b.customerName !== "Customer" &&
      (b.vehicle?.make || b.vehicle?.model || b.serviceName)
  );
}

export function buildTemplatePreVisitSummary(booking) {
  const b = normalizeBooking(booking);
  const vehicle = formatVehicle(b.vehicle);
  const when = formatScheduledAt(b.scheduledAt);
  const location = b.customerAddress ?? "the customer's location";

  if (b.mechanicName) {
    return `${b.mechanicName} is scheduled for ${withArticle(b.serviceName)} visit with ${b.customerName} on ${when}. The vehicle is a ${vehicle} at ${location}. Review service requirements and confirm parts/tools before heading out.`;
  }

  return `${withArticle(b.serviceName)} appointment is scheduled for ${b.customerName} on ${when} at ${location} for their ${vehicle}. Assign a mechanic, confirm the service scope, and prepare standard tools for this job type.`;
}

export function buildTemplatePostVisitSummary(booking) {
  const b = normalizeBooking(booking);
  const vehicle = formatVehicle(b.vehicle);
  const mechanic = b.mechanicName ?? "Our mechanic";

  return `${mechanic} completed the ${b.serviceName} for ${b.customerName}'s ${vehicle}. Work was finished per the booked service scope and the vehicle was left in good working order. ${b.customerName} was briefed on the work performed and any recommended follow-up maintenance.`;
}

function isLowQualitySummary(text) {
  if (!text || text.trim().length < 25) return true;

  const lower = text.toLowerCase();
  const junkPatterns = [
    "lorem ipsum",
    "dolor sit",
    "consectetur",
    "thought summary",
    "let me think",
    "as an ai",
    "i cannot",
    "i don't have",
  ];

  return junkPatterns.some((p) => lower.includes(p));
}

function sanitizeSummary(text) {
  return text
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/\*\*/g, "")
    .replace(/^#+\s*/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGemini(prompt, attempt = 1) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY not set — using template summary");
    return null;
  }

  const url = `${GEMINI_API_BASE}/${GEMINI_MODEL}:generateContent`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 220,
          temperature: 0.35,
        },
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const text = extractGeminiText(data);
      if (text && !isLowQualitySummary(text)) {
        return sanitizeSummary(text);
      }
      if (text) {
        console.warn("Gemini summary rejected (low quality), using template");
      }
    } else {
      const errorText = await response.text();
      const retryable =
        response.status === 503 ||
        response.status === 429 ||
        response.status === 500;

      if (retryable && attempt < 3) {
        console.warn(
          `Gemini API ${response.status} — retrying (${attempt}/3)...`
        );
        await sleep(2000 * attempt);
        return callGemini(prompt, attempt + 1);
      }

      console.error("Gemini API error:", errorText);
    }
  } catch (err) {
    if (attempt < 3) {
      await sleep(2000 * attempt);
      return callGemini(prompt, attempt + 1);
    }
    console.error("Gemini API call failed:", err);
  }

  return null;
}

/**
 * Extract only the final answer — skip Gemini "thought" reasoning parts.
 */
function extractGeminiText(data) {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!parts?.length) return null;

  const answerParts = parts
    .filter((part) => part?.text && part.thought !== true)
    .map((part) => part.text.trim())
    .filter(Boolean);

  if (answerParts.length === 0) {
    // Fallback: parts without thought flag metadata
    const fallback = parts
      .map((part) => part?.text?.trim())
      .filter(Boolean)
      .join(" ");
    return fallback || null;
  }

  return answerParts.join(" ").trim() || null;
}

function buildPreVisitPrompt(context, richContext) {
  return `You are a dispatch coordinator for Instant Mechanic, an on-demand vehicle repair service.

Write a PRE-VISIT briefing for the assigned mechanic.

Requirements:
- 2 to 3 complete sentences in plain English
- Professional, clear, and actionable
- Use ONLY facts from BOOKING DETAILS below
- Do NOT invent symptoms, damage, or parts not mentioned
- No bullet points, markdown, headings, or greetings
- If details are missing, use neutral phrasing

BOOKING DETAILS:
${context}

${richContext ? "" : "Note: Limited booking details available — write a generic but helpful briefing based on what is known.\n"}

Pre-visit briefing:`;
}

function buildPostVisitPrompt(context, richContext) {
  return `You are a dispatch coordinator for Instant Mechanic, an on-demand vehicle repair service.

Write a POST-VISIT summary after the service appointment was completed.

Requirements:
- 2 to 3 complete sentences in plain English
- State that the booked service was completed successfully
- Mention the vehicle and service type from BOOKING DETAILS
- Include one brief follow-up or maintenance note relevant to the service type
- Do NOT invent specific repairs, parts replaced, or problems unless stated below
- No bullet points, markdown, headings, or greetings

BOOKING DETAILS:
${context}

${richContext ? "" : "Note: Limited booking details available — write a generic completion summary based on what is known.\n"}

Post-visit summary:`;
}

async function generateSummary(prompt, type, booking) {
  const result = await callGemini(prompt);
  if (result) return result;

  return type === "pre"
    ? buildTemplatePreVisitSummary(booking)
    : buildTemplatePostVisitSummary(booking);
}

export async function generatePreVisitSummary(booking) {
  const context = buildBookingContextText(booking);
  const richContext = hasRichContext(booking);
  const prompt = buildPreVisitPrompt(context, richContext);
  return generateSummary(prompt, "pre", booking);
}

export async function generatePostVisitSummary(booking) {
  const context = buildBookingContextText(booking);
  const richContext = hasRichContext(booking);
  const prompt = buildPostVisitPrompt(context, richContext);
  return generateSummary(prompt, "post", booking);
}

export async function retrySummary(booking, type) {
  if (type === "pre") {
    return generatePreVisitSummary(booking);
  }
  return generatePostVisitSummary(booking);
}
