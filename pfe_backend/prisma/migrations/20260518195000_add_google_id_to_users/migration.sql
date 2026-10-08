-- Add Google OAuth linkage to users
ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "googleId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "users_googleId_key" ON "users"("googleId");
