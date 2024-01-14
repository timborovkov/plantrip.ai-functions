import prisma from "../utils/prisma";

export default async function removeUngeneratedPlans() {
  const oneDayAgo = new Date(new Date().getTime() - 24 * 60 * 60 * 1000);

  try {
    const plansToRemove = await prisma.plan.findMany({
      where: { generated: false, createdAt: { lt: oneDayAgo } },
      select: { id: true },
    });

    if (plansToRemove.length === 0) {
      console.log("No ungenerated plans to remove.");
      return;
    }

    const planDaysToRemove = await prisma.planDay.findMany({
      where: {
        planId: { in: plansToRemove.map((a) => a.id) },
        createdAt: { lt: oneDayAgo },
      },
      select: { id: true },
    });

    const planDaySectionsToRemove =
      planDaysToRemove.length > 0
        ? await prisma.planDaySections.findMany({
            where: {
              planDayId: { in: planDaysToRemove.map((a) => a.id) },
              createdAt: { lt: oneDayAgo },
            },
            select: { id: true },
          })
        : [];

    const planDaySectionDetailsToRemove =
      planDaySectionsToRemove.length > 0
        ? await prisma.planDaySectionDetails.findMany({
            where: {
              planDaySectionsId: {
                in: planDaySectionsToRemove.map((a) => a.id),
              },
              createdAt: { lt: oneDayAgo },
            },
            select: { id: true },
          })
        : [];

    await prisma.$transaction([
      prisma.planDaySectionDetails.deleteMany({
        where: { id: { in: planDaySectionDetailsToRemove.map((a) => a.id) } },
      }),
      prisma.planDaySections.deleteMany({
        where: { id: { in: planDaySectionsToRemove.map((a) => a.id) } },
      }),
      prisma.planDay.deleteMany({
        where: { id: { in: planDaysToRemove.map((a) => a.id) } },
      }),
      prisma.plan.deleteMany({
        where: { id: { in: plansToRemove.map((a) => a.id) } },
      }),
    ]);

    console.log(
      `Removed ${plansToRemove.length} ungenerated plans and related entities.`
    );
  } catch (error) {
    console.error("Failed to remove ungenerated plans:", error);
    // Additional error handling as needed
  }
}
