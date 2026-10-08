-- CreateEnum
CREATE TYPE "ResumeLanguage" AS ENUM ('EN', 'FR', 'AR');

-- CreateEnum
CREATE TYPE "ResumeSource" AS ENUM ('AI', 'MANUAL');

-- CreateEnum
CREATE TYPE "ResumeStatus" AS ENUM ('DRAFT', 'READY', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "JobOfferStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED');

-- CreateEnum
CREATE TYPE "JobEmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'TEMPORARY', 'INTERNSHIP', 'FREELANCE');

-- CreateEnum
CREATE TYPE "JobWorkplaceType" AS ENUM ('ONSITE', 'HYBRID', 'REMOTE');

-- CreateEnum
CREATE TYPE "JobExperienceLevel" AS ENUM ('ENTRY', 'JUNIOR', 'MID', 'SENIOR', 'LEAD', 'EXECUTIVE');

-- CreateEnum
CREATE TYPE "JobEducationLevel" AS ENUM ('HIGH_SCHOOL', 'ASSOCIATE', 'BACHELOR', 'MASTER', 'PHD', 'OTHER');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'REVIEWED', 'SHORTLISTED', 'INTERVIEW', 'ACCEPTED', 'REJECTED');

-- CreateTable
CREATE TABLE "job_offers" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "recruiterId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "department" TEXT,
    "employmentType" "JobEmploymentType" NOT NULL,
    "workplaceType" "JobWorkplaceType" NOT NULL,
    "location" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "salaryMin" DECIMAL(12,2),
    "salaryMax" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "experienceLevel" "JobExperienceLevel" NOT NULL,
    "educationLevel" "JobEducationLevel",
    "description" TEXT NOT NULL,
    "responsibilities" TEXT[],
    "requirements" TEXT[],
    "preferredSkills" TEXT[],
    "requiredSkills" TEXT[],
    "benefits" TEXT[],
    "languages" TEXT[],
    "openings" INTEGER NOT NULL DEFAULT 1,
    "deadline" TIMESTAMP(3),
    "startDate" TIMESTAMP(3),
    "status" "JobOfferStatus" NOT NULL DEFAULT 'DRAFT',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "urgent" BOOLEAN NOT NULL DEFAULT false,
    "views" INTEGER NOT NULL DEFAULT 0,
    "applicationsCount" INTEGER NOT NULL DEFAULT 0,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resumes" (
    "id" UUID NOT NULL,
    "candidateId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "language" "ResumeLanguage" NOT NULL,
    "jobDescription" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "atsScore" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resumes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_resumes" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "status" "ResumeStatus" NOT NULL DEFAULT 'DRAFT',
    "source" "ResumeSource" NOT NULL DEFAULT 'AI',
    "content" TEXT NOT NULL,
    "atsScore" INTEGER,
    "atsTips" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidate_resumes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" UUID NOT NULL,
    "candidateId" UUID NOT NULL,
    "jobOfferId" UUID NOT NULL,
    "coverLetter" TEXT,
    "cvUrl" TEXT NOT NULL,
    "cvMetadata" JSONB,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "aiAnalysis" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "job_offers_slug_key" ON "job_offers"("slug");

-- CreateIndex
CREATE INDEX "job_offers_companyId_idx" ON "job_offers"("companyId");

-- CreateIndex
CREATE INDEX "job_offers_recruiterId_idx" ON "job_offers"("recruiterId");

-- CreateIndex
CREATE INDEX "job_offers_status_idx" ON "job_offers"("status");

-- CreateIndex
CREATE INDEX "job_offers_employmentType_idx" ON "job_offers"("employmentType");

-- CreateIndex
CREATE INDEX "job_offers_workplaceType_idx" ON "job_offers"("workplaceType");

-- CreateIndex
CREATE INDEX "job_offers_createdAt_idx" ON "job_offers"("createdAt");

-- CreateIndex
CREATE INDEX "job_offers_views_idx" ON "job_offers"("views");

-- CreateIndex
CREATE INDEX "job_offers_salaryMin_salaryMax_idx" ON "job_offers"("salaryMin", "salaryMax");

-- CreateIndex
CREATE INDEX "job_offers_deletedAt_idx" ON "job_offers"("deletedAt");

-- CreateIndex
CREATE INDEX "resumes_candidateId_idx" ON "resumes"("candidateId");

-- CreateIndex
CREATE INDEX "resumes_candidateId_createdAt_idx" ON "resumes"("candidateId", "createdAt");

-- CreateIndex
CREATE INDEX "candidate_resumes_userId_idx" ON "candidate_resumes"("userId");

-- CreateIndex
CREATE INDEX "candidate_resumes_userId_updatedAt_idx" ON "candidate_resumes"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "applications_candidateId_idx" ON "applications"("candidateId");

-- CreateIndex
CREATE INDEX "applications_jobOfferId_idx" ON "applications"("jobOfferId");

-- CreateIndex
CREATE INDEX "applications_status_idx" ON "applications"("status");

-- CreateIndex
CREATE UNIQUE INDEX "applications_candidateId_jobOfferId_key" ON "applications"("candidateId", "jobOfferId");

-- AddForeignKey
ALTER TABLE "job_offers" ADD CONSTRAINT "job_offers_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_offers" ADD CONSTRAINT "job_offers_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resumes" ADD CONSTRAINT "resumes_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_resumes" ADD CONSTRAINT "candidate_resumes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_jobOfferId_fkey" FOREIGN KEY ("jobOfferId") REFERENCES "job_offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
