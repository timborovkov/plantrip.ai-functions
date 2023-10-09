-- CreateTable
CREATE TABLE "TripAssistantChat" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sender" TEXT NOT NULL DEFAULT 'user',
    "message" TEXT NOT NULL DEFAULT '',
    "tripId" INTEGER,

    CONSTRAINT "TripAssistantChat_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TripAssistantChat" ADD CONSTRAINT "TripAssistantChat_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE SET NULL ON UPDATE CASCADE;
