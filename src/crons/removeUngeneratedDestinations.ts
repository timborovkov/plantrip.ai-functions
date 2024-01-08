import prisma from "../utils/prisma";
export default async function removeUngeneratedDestinations() {
  const oneDayAgo = new Date(new Date().getTime() - 24 * 60 * 60 * 1000);
  // Remove destinations without images, title, description, geocoder_results, google_place_results, climate_data, or cost_of_living
  await prisma.destination.deleteMany({
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
  });
  // Remove destination images without destinations
  await prisma.destinationImage.deleteMany({
    where: {
      destinationId: null,
    },
  });
  // Remove destination activities without destinations
  await prisma.activities.deleteMany({
    where: {
      destinationId: undefined,
    },
  });
  // Remove destination images without destinations
  await prisma.hotels.deleteMany({
    where: {
      destinationId: undefined,
    },
  });
}
