-- Resolve duplicate active bookings per mechanic (keep most recent scheduled)
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "mechanicId"
      ORDER BY "scheduledAt" DESC, "updatedAt" DESC
    ) AS rn
  FROM "Booking"
  WHERE "mechanicId" IS NOT NULL
    AND "status" IN ('ASSIGNED', 'MECHANIC_ON_THE_WAY', 'IN_PROGRESS')
)
UPDATE "Booking"
SET "status" = 'COMPLETED', "updatedAt" = NOW()
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Prevent a mechanic from having more than one active booking at the database level.
CREATE UNIQUE INDEX IF NOT EXISTS "Booking_one_active_per_mechanic"
ON "Booking" ("mechanicId")
WHERE "mechanicId" IS NOT NULL
  AND "status" IN ('ASSIGNED', 'MECHANIC_ON_THE_WAY', 'IN_PROGRESS');