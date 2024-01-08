import prisma from "../utils/prisma";
export default async function removeTripsWithoutPlans() {
  const oneDayAgo = new Date(new Date().getTime() - 24 * 60 * 60 * 1000);
  // Remove trips without plans
  await prisma.trip.deleteMany({
    where: {
      OR: [{ planId: null }, { userId: null }],
      createdAt: {
        lt: oneDayAgo,
      },
    },
  });
}
