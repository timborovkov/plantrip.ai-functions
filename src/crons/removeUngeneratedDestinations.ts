// Import the Prisma client
import prisma from "../utils/prisma";

// Function to remove ungenerated destinations
export default async function removeUngeneratedDestinations() {
  const oneDayAgo = new Date(new Date().getTime() - 24 * 60 * 60 * 1000);

  try {
    // Fetch destinations to remove
    const destinationsToRemove = await prisma.destination.findMany({
      where: {
        OR: [
          { title: "" },
          { description: "" },
          { geocoder_results: "" },
          { google_place_results: "" },
          { climate_data: "" },
          { cost_of_living: "" },
        ],
        createdAt: {
          lt: oneDayAgo,
        },
      },
      select: {
        id: true,
      },
    });

    if (destinationsToRemove.length === 0) {
      console.log("No destinations to remove.");
      return;
    }

    const destinationIds = destinationsToRemove.map((dest) => dest.id);

    // Execute deletion in a transaction
    await prisma.$transaction([
      prisma.destinationImage.deleteMany({
        where: { destinationId: { in: destinationIds } },
      }),
      prisma.activities.deleteMany({
        where: { destinationId: { in: destinationIds } },
      }),
      prisma.hotels.deleteMany({
        where: { destinationId: { in: destinationIds } },
      }),
      prisma.destination.deleteMany({
        where: { id: { in: destinationIds } },
      }),
    ]);

    console.log(
      `Removed ${destinationsToRemove.length} destinations and their related data.`
    );
  } catch (error) {
    console.error("Failed to remove ungenerated destinations:", error);
    // Additional error handling as needed
  }
}
