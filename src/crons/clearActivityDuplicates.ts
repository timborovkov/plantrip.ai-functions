import prisma from "../utils/prisma";
export default async function clearActivityDuplicates() {
  // Remove activities without plans
  await prisma.activities.deleteMany({
    where: {
      Plans: {
        none: {},
      },
    },
  });
  // Remove activities without google place id
  await prisma.activities.deleteMany({
    where: {
      google_place_id: "",
    },
  });
  // Remove duplicate activities based on google place id
  const activities = await prisma.activities.findMany({
    include: {
      Plans: true,
    },
  });
  const uniqueGooglePlaceIds: string[] = [];
  const activitiesKept: number[] = [];
  for (let i = 0; i < activities.length; i++) {
    const activity = activities[i];
    if (uniqueGooglePlaceIds.includes(activity.google_place_id)) {
      // Get the plans
      const plans = activity.Plans;
      // Remove activity
      await prisma.activities.delete({
        where: {
          id: activity.id,
        },
      });
      // Connect the plans to the kept activity
      for (let j = 0; j < plans.length; j++) {
        const plan = plans[j];
        await prisma.plan.update({
          where: {
            id: plan.id,
          },
          data: {
            Activities: {
              connect: {
                id: activitiesKept[
                  uniqueGooglePlaceIds.indexOf(activity.google_place_id)
                ],
              },
            },
          },
        });
      }
    } else {
      uniqueGooglePlaceIds.push(activity.google_place_id);
      activitiesKept.push(activity.id);
    }
  }
  // Remove orphaned activity images
  await prisma.activityImage.deleteMany({
    where: {
      activitiesId: null,
    },
  });
}
