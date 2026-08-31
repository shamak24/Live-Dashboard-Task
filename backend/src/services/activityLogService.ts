import { prisma } from "../lib/prisma.js";

export const MAX_ACTIVITY_LOGS = 15;

export async function appendActivityLog(message: string) {
  const trimmed = message.trim();
  if (!trimmed) return;

  await prisma.$transaction(async (tx) => {
    const total = await tx.activityLog.count();
    if (total >= MAX_ACTIVITY_LOGS) {
      const toRemove = total - MAX_ACTIVITY_LOGS + 1;
      const oldest = await tx.activityLog.findMany({
        orderBy: { createdAt: "asc" },
        take: toRemove,
        select: { id: true },
      });
      if (oldest.length > 0) {
        await tx.activityLog.deleteMany({
          where: { id: { in: oldest.map((row) => row.id) } },
        });
      }
    }

    await tx.activityLog.create({ data: { message: trimmed } });
  });
}

export function recordActivityLog(message: string) {
  appendActivityLog(message).catch((err) => {
    console.error("Failed to write activity log:", err);
  });
}

export async function getRecentActivityLogs(limit = 10) {
  const capped = Math.min(MAX_ACTIVITY_LOGS, Math.max(1, limit));
  return prisma.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: capped,
    select: {
      id: true,
      message: true,
      createdAt: true,
    },
  });
}
