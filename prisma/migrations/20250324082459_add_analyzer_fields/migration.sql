-- CreateTable
CREATE TABLE "analyzer_interfaces" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "status" SMALLINT DEFAULT 1,
    "user_id" TEXT NOT NULL,
    "file_name" TEXT,
    "file_path" TEXT,
    "file_content" TEXT,
    "type" TEXT,
    "text" TEXT,
    "analysis_result" TEXT,

    CONSTRAINT "analyzer_interfaces_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "analyzer_interfaces" ADD CONSTRAINT "analyzer_interfaces_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
