import prisma from "../utils/prisma";
export default async function removeUngeneratedPlans() {
  const oneDayAgo = new Date(new Date().getTime() - 24 * 60 * 60 * 1000);
  // Remove ungenerated plans
  await prisma.plan.deleteMany({
    where: {
      generated: false,
      createdAt: {
        lt: oneDayAgo,
      },
    },
  });
}
