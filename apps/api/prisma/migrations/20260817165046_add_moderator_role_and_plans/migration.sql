-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'PUBLISHED', 'RETURNED');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'MODERATOR';

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "teacherName" TEXT NOT NULL,
    "description" TEXT,
    "periodStart" DATE,
    "periodEnd" DATE,
    "status" "PlanStatus" NOT NULL DEFAULT 'DRAFT',
    "returnNote" TEXT,
    "createdById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "publishedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanTask" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "date" DATE NOT NULL,
    "dayName" TEXT,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "material" TEXT,
    "notes" TEXT,
    "isReady" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Plan_status_idx" ON "Plan"("status");

-- CreateIndex
CREATE INDEX "Plan_createdById_idx" ON "Plan"("createdById");

-- CreateIndex
CREATE INDEX "Plan_createdAt_idx" ON "Plan"("createdAt");

-- CreateIndex
CREATE INDEX "PlanTask_planId_idx" ON "PlanTask"("planId");

-- CreateIndex
CREATE INDEX "PlanTask_planId_sortOrder_idx" ON "PlanTask"("planId", "sortOrder");

-- AddForeignKey
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanTask" ADD CONSTRAINT "PlanTask_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
