-- Add ATS score storage for generated resumes
ALTER TABLE IF EXISTS "resumes"
ADD COLUMN IF NOT EXISTS "atsScore" JSONB;
