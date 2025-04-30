/*
  Warnings:

  - You are about to drop the `analyzer_interfaces` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "analyzer_interfaces" DROP CONSTRAINT "analyzer_interfaces_user_id_fkey";

-- DropTable
DROP TABLE "analyzer_interfaces";

-- CreateTable
CREATE TABLE "analyzer_documents" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "status" SMALLINT DEFAULT 1,
    "user_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_content" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "analysis_result" TEXT,

    CONSTRAINT "analyzer_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rule_analyses" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "document_id" TEXT NOT NULL,
    "rule_id" TEXT NOT NULL,
    "result" TEXT NOT NULL,

    CONSTRAINT "rule_analyses_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "analyzer_documents" ADD CONSTRAINT "analyzer_documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rule_analyses" ADD CONSTRAINT "rule_analyses_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "analyzer_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rule_analyses" ADD CONSTRAINT "rule_analyses_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
