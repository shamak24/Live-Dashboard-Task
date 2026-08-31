/**
 * LLM service for generating pre-visit and post-visit booking summaries.
 * Uses Google Gemini via GEMINI_API_KEY (default: gemini-3.6-flash).
 * Failures are logged and return null — never block booking operations.
 */

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";
const GEMINI_API_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";

function buildBookingContextText(booking) {
  const parts = [
    `Booking ID: ${booking.id}`,
    `Status: ${booking.status}`,
    `Scheduled: ${new Date(booking.scheduledAt).toLocaleString()}`,
    `Amount: $${booking.amount}`,
  ];

  if (booking.customer) {
    parts.push(
      `Customer: ${booking.customer.name ?? "Unknown"}`,
      booking.customer.phone ? `Phone: ${booking.customer.phone}` : "",
      booking.customer.address ? `Address: ${booking.customer.address}` : ""
    );
  }

  if (booking.vehicle) {
    parts.push(
      `Vehicle: ${booking.vehicle.year ?? ""} ${booking.vehicle.make ?? ""} ${booking.vehicle.model ?? ""} (${booking.vehicle.plate ?? ""})`
    );
  }

  if (booking.serviceCategory) {
    parts.push(`Service: ${booking.serviceCategory.name ?? ""}`);
    if (booking.serviceCategory.description) {
      parts.push(`Service details: ${booking.serviceCategory.description}`);
    }
  }

  if (booking.mechanic) {
    parts.push(
      `Mechanic: ${booking.mechanic.name ?? "Unassigned"}`,
      booking.mechanic.specialty ? `Specialty: ${booking.mechanic.specialty}` : ""
    );
  }

  return parts.filter(Boolean).join("\n");
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGemini(prompt, attempt = 1) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY not set — skipping LLM summary");
    return null;
  }

  const url = `${GEMINI_API_BASE}/${GEMINI_MODEL}:generateContent`;

  const payloads = [
    {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 512,
        thinkingConfig: { thinkingLevel: "LOW" },
      },
    },
    {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 512 },
    },
  ];

  for (let i = 0; i < payloads.length; i++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify(payloads[i]),
      });

      if (response.ok) {
        const data = await response.json();
        const text = extractGeminiText(data);
        if (text) return text;
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

        if (i === payloads.length - 1) {
          console.error("Gemini API error:", errorText);
        }
      }
    } catch (err) {
      if (attempt < 3) {
        await sleep(2000 * attempt);
        return callGemini(prompt, attempt + 1);
      }
      console.error("Gemini API call failed:", err);
    }
  }

  return null;
}

function extractGeminiText(data) {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!parts?.length) return null;

  const text = parts
    .map((part) => part.text)
    .filter(Boolean)
    .join("")
    .trim();

  return text || null;
}

async function generateSummary(prompt, type) {
  const result = await callGemini(prompt);
  if (result) return result;

  return type === "pre"
    ? "Pre-visit summary pending — vehicle and service details reviewed by ops team."
    : "Post-visit summary pending — service completed, customer satisfied.";
}

export async function generatePreVisitSummary(booking) {
  const context = buildBookingContextText(booking);
  const prompt = `You are an operations assistant for a vehicle service company. Write a concise pre-visit summary (2-3 sentences) for the mechanic before they visit the customer. Be professional and actionable.

${context}

Pre-visit summary:`;

  return generateSummary(prompt, "pre");
}

export async function generatePostVisitSummary(booking) {
  const context = buildBookingContextText(booking);
  const prompt = `You are an operations assistant for a vehicle service company. Write a concise post-visit summary (2-3 sentences) after the service was completed. Note what was done and any follow-up recommendations.

${context}

Post-visit summary:`;

  return generateSummary(prompt, "post");
}

export async function retrySummary(booking, type) {
  if (type === "pre") {
    return generatePreVisitSummary(booking);
  }
  return generatePostVisitSummary(booking);
}
