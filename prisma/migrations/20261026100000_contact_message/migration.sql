-- CreateTable
CREATE TABLE "ContactMessage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company" TEXT,
    "topic" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "handledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContactMessage_createdAt_idx" ON "ContactMessage"("createdAt");

-- No row security: a message from the public Contact page belongs to no
-- company (see UNSCOPED_MODELS in src/lib/prisma.ts). The restricted runtime
-- role still needs real grants on it, as with every table it touches.
GRANT SELECT, INSERT, UPDATE, DELETE ON "ContactMessage" TO evo_app;
