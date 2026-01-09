-- CreateTable
CREATE TABLE "GlobalSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "sessionActive" BOOLEAN NOT NULL DEFAULT true,
    "sessionMessage" TEXT NOT NULL DEFAULT 'This session is now closed. Submissions are no longer accepted. Please be patient until the next session starts.',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" INTEGER,

    CONSTRAINT "GlobalSettings_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "GlobalSettings" ADD CONSTRAINT "GlobalSettings_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
