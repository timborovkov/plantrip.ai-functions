-- CreateTable
CREATE TABLE "LanguageModelRequests" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "systemRequest" TEXT NOT NULL DEFAULT '',
    "request" TEXT NOT NULL DEFAULT '',
    "reply" TEXT NOT NULL DEFAULT '',
    "fullChatObject" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "LanguageModelRequests_pkey" PRIMARY KEY ("id")
);
