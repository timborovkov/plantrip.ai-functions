import prisma from "../utils/prisma";
export default async function removeUngeneratedDestinations() {
  // Remove destinations without images, title, description, geocoder_results, google_place_results, climate_data, or cost_of_living
  await prisma.destination.deleteMany({
    where: {
      OR: [
        { image: "" },
        { title: "" },
        { description: "" },
        { geocoder_results: "" },
        { google_place_results: "" },
        { climate_data: "" },
        { cost_of_living: "" },
        { DestinationImage: { none: {} } },
      ],
    },
  });
  // Remove destination images without destinations
  await prisma.destinationImage.deleteMany({
    where: {
      destinationId: null,
    },
  });
}
