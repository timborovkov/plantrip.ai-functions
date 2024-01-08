import prisma from "../utils/prisma";
export default async function removeUngeneratedPlans() {
  const oneDayAgo = new Date(new Date().getTime() - 24 * 60 * 60 * 1000);

  let plansToRemove: { id: number }[] = [];
  let planDaysToRemove: { id: number }[] = [];
  let planDaySectionsToRemove: { id: number }[] = [];
  let planDaySectionDetailsToRemove: { id: number }[] = [];

  // Remove ungenerated plans
  plansToRemove = await prisma.plan.findMany({
    where: {
      generated: false,
      createdAt: {
        lt: oneDayAgo,
      },
    },
    select: {
      id: true,
    },
  });

  if (plansToRemove.length > 0) {
    planDaysToRemove = await prisma.planDay.findMany({
      where: {
        planId: {
          in: plansToRemove.map((a) => a.id),
        },
        createdAt: {
          lt: oneDayAgo,
        },
      },
      select: {
        id: true,
      },
    });
  }

  if (planDaysToRemove.length > 0) {
    planDaySectionsToRemove = await prisma.planDaySections.findMany({
      where: {
        planDayId: {
          in: planDaysToRemove.map((a) => a.id),
        },
        createdAt: {
          lt: oneDayAgo,
        },
      },
      select: {
        id: true,
      },
    });
  }

  if (planDaySectionsToRemove.length > 0) {
    planDaySectionDetailsToRemove = await prisma.planDaySectionDetails.findMany(
      {
        where: {
          planDaySectionsId: {
            in: planDaySectionsToRemove.map((a) => a.id),
          },
          createdAt: {
            lt: oneDayAgo,
          },
        },
        select: {
          id: true,
        },
      }
    );
  }

  // Delete the stuff

  await prisma.planDaySectionDetails.deleteMany({
    where: {
      OR: [
        { planDaySectionsId: null },
        {
          id: {
            in: planDaySectionDetailsToRemove.map((a) => a.id),
          },
        },
      ],
    },
  });

  await prisma.planDaySections.deleteMany({
    where: {
      OR: [
        { planDayId: null },
        {
          id: {
            in: planDaySectionsToRemove.map((a) => a.id),
          },
        },
      ],
    },
  });

  await prisma.planDay.deleteMany({
    where: {
      OR: [
        { planId: null },
        {
          id: {
            in: planDaysToRemove.map((a) => a.id),
          },
        },
      ],
    },
  });

  await prisma.plan.deleteMany({
    where: {
      OR: [
        {
          id: {
            in: plansToRemove.map((a) => a.id),
          },
        },
      ],
    },
  });
}
