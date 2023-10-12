import prisma from "../utils/prisma";
export default async function removeUngeneratedPlans() {
  // Remove ungenerated plans
  await prisma.plan.deleteMany({
    where: {
      generated: false,
    },
  });
}
