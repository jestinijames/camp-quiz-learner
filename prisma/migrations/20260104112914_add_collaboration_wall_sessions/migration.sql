/*
  Warnings:

  - You are about to drop the column `quizId` on the `CollaborationCard` table. All the data in the column will be lost.
  - Added the required column `wallSessionId` to the `CollaborationCard` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "CollaborationCard" DROP CONSTRAINT "CollaborationCard_quizId_fkey";

-- AlterTable
ALTER TABLE "CollaborationCard" DROP COLUMN "quizId",
ADD COLUMN     "wallSessionId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "CollaborationWallSession" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "bookId" INTEGER NOT NULL,
    "fromChapter" INTEGER NOT NULL,
    "fromVerse" INTEGER NOT NULL,
    "toChapter" INTEGER NOT NULL,
    "toVerse" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "adminId" INTEGER NOT NULL,

    CONSTRAINT "CollaborationWallSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CollaborationWallSession_isActive_idx" ON "CollaborationWallSession"("isActive");

-- CreateIndex
CREATE INDEX "CollaborationWallSession_createdAt_idx" ON "CollaborationWallSession"("createdAt");

-- CreateIndex
CREATE INDEX "CollaborationCard_wallSessionId_idx" ON "CollaborationCard"("wallSessionId");

-- CreateIndex
CREATE INDEX "CollaborationCard_authorId_idx" ON "CollaborationCard"("authorId");

-- CreateIndex
CREATE INDEX "CollaborationCard_quizSessionId_idx" ON "CollaborationCard"("quizSessionId");

-- CreateIndex
CREATE INDEX "CollaborationCard_quizSessionId_pointsAwarded_idx" ON "CollaborationCard"("quizSessionId", "pointsAwarded");

-- AddForeignKey
ALTER TABLE "CollaborationCard" ADD CONSTRAINT "CollaborationCard_wallSessionId_fkey" FOREIGN KEY ("wallSessionId") REFERENCES "CollaborationWallSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollaborationWallSession" ADD CONSTRAINT "CollaborationWallSession_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "BibleBook"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollaborationWallSession" ADD CONSTRAINT "CollaborationWallSession_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
