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
      console.log("Destination activities found");
      return destination.Activities;
    }
    if (!destination) {
      return [];
    }
    // No Activities yet, fetch them
    // Get "points of interest" and activity recommendations concurrently
    console.log("Fetching amadeus, activities");
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
    console.log("Amadeus activities fetched");

    // Create POIs and activities
    const createActivitiesList = [
      ...pois.map((poi) => {
        return {
          title: poi.name ?? "",
          category: poi.category.toLowerCase() ?? "",
          thumbnail: "",
          bookingLink: "",
          amadeusObject: JSON.stringify(poi) ?? "",
          destinationId: destination?.id,
        };
      }),
      ...activities.map((activity) => {
        return {
          title: activity.name ?? "",
          category: activity.type.toLowerCase() ?? "",
          thumbnail:
            (activity.pictures.length > 0 ? activity.pictures[0] : "") ?? "",
          bookingLink: activity.bookingLink ?? "",
          amadeusObject: JSON.stringify(activity) ?? "",
          destinationId: destination?.id,
        };
      }),
    ];
    await prisma.activities.createMany({
      data: createActivitiesList,
    });
    console.log("Migrated activity data from amadeus to the database");

    // Fetch the updated data and return it
    const updatedDestination = await prisma.destination.findFirst({
      where: {
        id: theDestination.id,
      },
      include: {
        Activities: true,
      },
    });
    console.log("Destination activities done");
    return updatedDestination?.Activities ?? [];
  } catch (error) {
    console.error("addActivitiesToDestination", error);
    return [];
  }
}
