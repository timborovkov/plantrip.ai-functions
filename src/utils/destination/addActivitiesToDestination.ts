import prisma from "../prisma";
import { Destination } from "@prisma/client";

import AmadeusAPI from "../AmadeusAPI";
const amadeus = new AmadeusAPI();

export default async function addActivitiesToDestination(
  destinationPlace: google.maps.GeocoderResult,
  theDestination: Destination | null
) {
  try {
    if (!theDestination) return [];
    // Get the destination with activities
    const destination = await prisma.destination.findFirst({
      where: {
        id: theDestination.id,
      },
      include: {
        Activities: true,
      },
    });
    // Check if destination already has activities
    if (destination && destination?.Activities?.length > 0) {
      return destination.Activities;
    }
    if (!destination) {
      return [];
    }
    // No Activities yet, fetch them
    // Get "points of interest" and activity recommendations concurrently
    const [pois, activities] = await Promise.all([
      amadeus.searchPOIs({
        radius: 10,
        latitude: destinationPlace.geometry.location.lat as any as number,
        longitude: destinationPlace.geometry.location.lng as any as number,
      }),
      amadeus.searchActivities({
        radius: 10,
        latitude: destinationPlace.geometry.location.lat as any as number,
        longitude: destinationPlace.geometry.location.lng as any as number,
      }),
    ]);

    // Create POIs and activities
    const createActivitiesList = [
      ...pois.map((poi) => {
        return {
          title: poi.name,
          category: poi.category.toLowerCase(),
          thumbnail: "",
          bookingLink: "",
          amadeusObject: JSON.stringify(poi),
          destinationId: destination?.id,
        };
      }),
      ...activities.map((activity) => {
        return {
          title: activity.name,
          category: activity.type.toLowerCase(),
          thumbnail: activity.pictures[0],
          bookingLink: activity.bookingLink,
          amadeusObject: JSON.stringify(activity),
          destinationId: destination?.id,
        };
      }),
    ];
    await prisma.activities.createMany({
      data: createActivitiesList,
    });

    // Fetch the updated data and return it
    const updatedDestination = await prisma.destination.findFirst({
      where: {
        id: theDestination.id,
      },
      include: {
        Activities: true,
      },
    });
    return updatedDestination?.Activities ?? [];
  } catch (error) {
    console.error("addActivitiesToDestination", error);
    return [];
  }
}
