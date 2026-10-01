-- CreateTable
CREATE TABLE "InterestRegistration" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterestRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InterestRegistration_email_key" ON "InterestRegistration"("email");

-- No RLS on this table -- see the comment on InterestRegistration in
-- schema.prisma and UNSCOPED_MODELS in src/lib/prisma.ts. The restricted
-- evo_app runtime role still needs real grants on it though, same as every
-- other table it touches.
GRANT SELECT, INSERT, UPDATE, DELETE ON "InterestRegistration" TO evo_app;
