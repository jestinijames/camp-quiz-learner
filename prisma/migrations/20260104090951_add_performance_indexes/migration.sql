-- CreateIndex
CREATE INDEX "EmojiAttempt_gameId_idx" ON "EmojiAttempt"("gameId");

-- CreateIndex
CREATE INDEX "EmojiAttempt_memberId_completed_idx" ON "EmojiAttempt"("memberId", "completed");

-- CreateIndex
CREATE INDEX "EmojiGame_isActive_idx" ON "EmojiGame"("isActive");

-- CreateIndex
CREATE INDEX "EmojiGame_createdDate_idx" ON "EmojiGame"("createdDate");

-- CreateIndex
CREATE INDEX "Member_email_idx" ON "Member"("email");

-- CreateIndex
CREATE INDEX "Member_teamId_idx" ON "Member"("teamId");

-- CreateIndex
CREATE INDEX "Member_isApproved_idx" ON "Member"("isApproved");

-- CreateIndex
CREATE INDEX "QuizInstance_isActive_idx" ON "QuizInstance"("isActive");

-- CreateIndex
CREATE INDEX "QuizInstance_startDate_endDate_idx" ON "QuizInstance"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "QuizInstance_bookId_idx" ON "QuizInstance"("bookId");

-- CreateIndex
CREATE INDEX "QuizSession_quizId_isSubmitted_idx" ON "QuizSession"("quizId", "isSubmitted");

-- CreateIndex
CREATE INDEX "QuizSession_memberId_completedAt_idx" ON "QuizSession"("memberId", "completedAt");

-- CreateIndex
CREATE INDEX "QuizSession_isSubmitted_idx" ON "QuizSession"("isSubmitted");

-- CreateIndex
CREATE INDEX "WordleAttempt_wordleId_idx" ON "WordleAttempt"("wordleId");

-- CreateIndex
CREATE INDEX "WordleAttempt_memberId_completed_idx" ON "WordleAttempt"("memberId", "completed");

-- CreateIndex
CREATE INDEX "WordleInstance_isActive_idx" ON "WordleInstance"("isActive");

-- CreateIndex
CREATE INDEX "WordleInstance_createdDate_idx" ON "WordleInstance"("createdDate");
