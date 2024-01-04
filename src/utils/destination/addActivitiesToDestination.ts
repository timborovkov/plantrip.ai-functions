import prisma from "../prisma";
import { Destination } from "@prisma/client";

import AmadeusAPI from "../AmadeusAPI";
const amadeus = new AmadeusAPI();

export default async function addActivitiesToDestination(
  destinationPlace: google.maps.GeocoderResult,
  theDestination: Destination
) {
  // Get the destination with activities
  const destination = await prisma.destination.findFirst({
    where: {
      id: theDestination.id,
    },
    include: {
      Activities: true,
    },
  });

  // Get "points of interest"
  const pois = await amadeus.searchPOIs({
    radius: 10,
    latitude: destinationPlace.geometry.location.lat as any as number,
    longitude: destinationPlace.geometry.location.lng as any as number,
  });

  // Get activity recomendations
  const activities = await amadeus.searchActivities({
    radius: 10,
    latitude: destinationPlace.geometry.location.lat as any as number,
    longitude: destinationPlace.geometry.location.lng as any as number,
  });
}
