-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "timerAccumulatedSeconds" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "timerRunning" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "timerStartedAt" TIMESTAMP(3);
