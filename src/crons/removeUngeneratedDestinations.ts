import prisma from "../utils/prisma";
export default async function removeUngeneratedDestinations() {
  const oneDayAgo = new Date(new Date().getTime() - 24 * 60 * 60 * 1000);
  // Remove destinations without images, title, description, geocoder_results, google_place_results, climate_data, or cost_of_living
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
  // Remove destination images without destinations
  await prisma.destinationImage.deleteMany({
    where: {
      destinationId: {
        in: destinationsToRemove.map((a) => a.id),
      },
    },
  });
  // Remove destination activities without destinations
  await prisma.activities.deleteMany({
    where: {
      destinationId: {
        in: destinationsToRemove.map((a) => a.id),
      },
    },
  });
  // Remove destination images without destinations
  await prisma.hotels.deleteMany({
    where: {
      destinationId: {
        in: destinationsToRemove.map((a) => a.id),
      },
    },
  });
  // Remove the destinations
  await prisma.destination.deleteMany({
    where: {
      id: {
        in: destinationsToRemove.map((a) => a.id),
      },
    },
  });
}
