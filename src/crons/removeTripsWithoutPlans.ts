import prisma from "../utils/prisma";

export default async function removeTripsWithoutPlans() {
  const oneDayAgo = new Date(new Date().getTime() - 24 * 60 * 60 * 1000);

  try {
    // Remove trips without plans
    const deletedTrips = await prisma.trip.deleteMany({
      where: {
        OR: [{ planId: null }, { userId: null }],
        createdAt: {
          lt: oneDayAgo,
        },
      },
    });

    console.log(`Deleted ${deletedTrips.count} trips.`);
  } catch (error) {
    console.error("Failed to delete trips");
  }
}
