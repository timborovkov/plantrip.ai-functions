-- CreateTable
CREATE TABLE "Hotels" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "chainCode" TEXT NOT NULL DEFAULT '',
    "iataCode" TEXT NOT NULL DEFAULT '',
    "dupeId" INTEGER NOT NULL DEFAULT 0,
    "hotelId" TEXT NOT NULL DEFAULT '',
    "geoCode" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "metaData" TEXT NOT NULL DEFAULT '',
    "destinationId" INTEGER NOT NULL,

    CONSTRAINT "Hotels_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Hotels" ADD CONSTRAINT "Hotels_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
