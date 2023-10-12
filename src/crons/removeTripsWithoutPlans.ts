import prisma from "../utils/prisma";
export default async function removeTripsWithoutPlans() {
  // Remove trips without plans
  await prisma.trip.deleteMany({
    where: {
      planId: null,
    },
  });
}
