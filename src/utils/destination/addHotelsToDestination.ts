import prisma from "../prisma";
import { Destination } from "@prisma/client";

import AmadeusAPI from "../AmadeusAPI";
const amadeus = new AmadeusAPI();

export default async function addHotelsToDestination(
  destinationPlace: google.maps.GeocoderResult,
  theDestination: Destination
) {
  try {
    // Get the destination with hotels
    const destination = await prisma.destination.findFirst({
      where: {
        id: theDestination.id,
      },
      include: {
        Hotels: true,
      },
    });
    // Check if destination already has hotels
    if (destination && destination?.Hotels?.length > 0) {
      console.log("Destination hotels found");
      return destination.Hotels;
    }
    if (!destination) {
      return [];
    }
    // No Hotels yet, fetch them
    // Get "points of interest" and activity recommendations concurrently
    console.log("Fetching amadeus, activities");
    const hotels = await amadeus.searchHotels({
      radius: 10,
      latitude: destinationPlace.geometry.location.lat as any as number,
      longitude: destinationPlace.geometry.location.lng as any as number,
    });
    console.log("Amadeus hotels fetched");

    // Create hotels
    const createHotelsList = [
      ...hotels.map((hotel) => {
        return {
          name: hotel.name ?? "",
          chainCode: hotel.chainCode ?? "",
          iataCode: hotel.iataCode ?? "",
          dupeId: hotel.dupeId ?? 0,
          hotelId: hotel.hotelId ?? "",
          geoCode: JSON.stringify(hotel.geoCode ?? ""),
          address: JSON.stringify(hotel.address ?? ""),
          metaData: "",
          destinationId: destination?.id,
        };
      }),
    ];
    await prisma.hotels.createMany({
      data: createHotelsList,
    });
    console.log("Migrated hotel data from amadeus to the database");

    // Fetch the updated data and return it
    const updatedDestination = await prisma.destination.findFirst({
      where: {
        id: theDestination.id,
      },
      include: {
        Hotels: true,
      },
    });
    console.log("Destination hotels done");

    return updatedDestination?.Hotels ?? [];
  } catch (error) {
    console.error("addHotelsToDestination", error);
    return [];
  }
}
