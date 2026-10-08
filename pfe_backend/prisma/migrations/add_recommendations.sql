CREATE TABLE IF NOT EXISTS "recommendations" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "source_id" UUID NOT NULL,
    "source_type" VARCHAR(20) NOT NULL,
    "target_id" UUID NOT NULL,
    "target_type" VARCHAR(20) NOT NULL,
    "rank" INTEGER NOT NULL,
    "overall_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "score_breakdown" JSONB NOT NULL DEFAULT '{}',
    "explanation" TEXT NOT NULL DEFAULT '',
    "metadata_payload" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours')
);

CREATE INDEX IF NOT EXISTS "idx_rec_source_active" ON "recommendations"("source_id", "source_type", "is_active");
CREATE INDEX IF NOT EXISTS "idx_rec_target" ON "recommendations"("target_id", "target_type");
CREATE INDEX IF NOT EXISTS "idx_rec_source_rank" ON "recommendations"("source_id", "source_type", "rank");

CREATE TABLE IF NOT EXISTS "recommendation_logs" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "source_id" UUID NOT NULL,
    "source_type" VARCHAR(20) NOT NULL,
    "trigger" VARCHAR(50) NOT NULL,
    "items_searched" INTEGER NOT NULL DEFAULT 0,
    "duration_ms" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_reclog_source" ON "recommendation_logs"("source_id", "source_type");
CREATE INDEX IF NOT EXISTS "idx_reclog_created" ON "recommendation_logs"("created_at");
