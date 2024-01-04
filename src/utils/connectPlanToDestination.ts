import prisma from "./prisma";

export default async function connectPlanToDestination(
  existingDestination: any,
  existingPlan: any
) {
  try {
    // Check if destination already has the plan
    let existingDestinationPlan = await prisma.destination.findFirst({
      where: {
        id: existingDestination.id,
        Plan: {
          some: {
            id: existingPlan.id,
          },
        },
      },
    });

    if (!existingDestinationPlan) {
      // If the destination does not have the plan, add the plan to the destination
      await prisma.destination.update({
        where: {
          id: existingDestination.id,
        },
        data: {
          Plan: {
            connect: {
              id: existingPlan.id,
            },
          },
        },
      });
    }
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}
