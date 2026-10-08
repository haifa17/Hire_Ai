-- CreateEnum
CREATE TYPE "InterviewType" AS ENUM ('VIDEO', 'ONSITE', 'PHONE');

-- CreateEnum
CREATE TYPE "InterviewStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED');

-- CreateTable
CREATE TABLE "interviews" (
  "id" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "interviewType" "InterviewType" NOT NULL,
  "status" "InterviewStatus" NOT NULL DEFAULT 'SCHEDULED',
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "duration" INTEGER NOT NULL,
  "message" TEXT,
  "sendInvitation" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "recruiterId" UUID NOT NULL,
  "candidateId" UUID NOT NULL,
  "jobOfferId" UUID NOT NULL,

  CONSTRAINT "interviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "interviews_recruiterId_scheduledAt_idx" ON "interviews"("recruiterId", "scheduledAt");

-- CreateIndex
CREATE INDEX "interviews_candidateId_scheduledAt_idx" ON "interviews"("candidateId", "scheduledAt");

-- CreateIndex
CREATE INDEX "interviews_jobOfferId_idx" ON "interviews"("jobOfferId");

-- CreateIndex
CREATE INDEX "interviews_status_idx" ON "interviews"("status");

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_jobOfferId_fkey" FOREIGN KEY ("jobOfferId") REFERENCES "job_offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
