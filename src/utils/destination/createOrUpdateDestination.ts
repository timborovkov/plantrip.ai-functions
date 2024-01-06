import fetch from "node-fetch";
import prisma from "../prisma";
import {
  Activities,
  Destination,
  DestinationImage,
  Hotels,
} from "@prisma/client";

import addActivitiesToDestination from "./addActivitiesToDestination";
import addClimateDataToDestination from "./addClimateDataToDestination";
import addCostOfLivingToDestination from "./addCostOfLivingToDestination";
import addDescriptionToDestination from "./addDescriptionToDestination";
import addImagesToDestionation from "./addImagesToDestination";

type DestinationWithDetails = Destination & {
  DestinationImage: DestinationImage[];
  Activities: Activities[];
  Hotels: Hotels[];
};

export async function createOrUpdateDestination(
  destination: string,
  googlePlace: google.maps.GeocoderResult
): Promise<DestinationWithDetails | undefined> {
  try {
    // Check if destination exists in the database
    let existingDestination = await prisma.destination.findFirst({
      where: {
        google_place_id: googlePlace.place_id,
      },
    });
    if (existingDestination) {
      // Update everything related to the destination
      await Promise.all([
        async () => {
          await addActivitiesToDestination(googlePlace, existingDestination);
        },
        async () => {
          await addClimateDataToDestination(existingDestination);
        },
        async () => {
          await addCostOfLivingToDestination(existingDestination);
        },
        async () => {
          await addDescriptionToDestination(existingDestination);
        },
        async () => {
          await addImagesToDestionation(existingDestination);
        },
      ]).catch((error) => {
        console.error(error);
      });
      // Refetch destination after updates
      const finalDestination = await prisma.destination.findUnique({
        where: {
          id: existingDestination.id,
        },
        include: {
          Activities: true,
          Hotels: true,
          DestinationImage: true,
        },
      });
      return finalDestination as DestinationWithDetails;
    }

    // ---- Destination does not yet exist ----
    let newDestination: any;
    // Fetch the place details using the Google Places API
    const placeDetailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${googlePlace.place_id}&key=${process.env.GOOGLE_PLACES_API_KEY}`;
    const placeDetailsResponse = await fetch(placeDetailsUrl);
    const placeDetailsData = await placeDetailsResponse.json();

    // Get the first photo reference from the place details response
    const photoReference =
      placeDetailsData?.result?.photos?.[0]?.photo_reference;

    // Fetch the image using the photo reference
    if (photoReference) {
      const imageUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1600&photo_reference=${photoReference}&key=${process.env.GOOGLE_PLACES_API_KEY}`;
      const imageResponse = await fetch(imageUrl);
      const imageBuffer = await imageResponse.arrayBuffer();

      // Store the image in the database
      newDestination = await prisma.destination.create({
        data: {
          title: destination,
          image: Buffer.from(imageBuffer).toString("base64"),
          google_place_id: googlePlace.place_id,
          geocoder_results: JSON.stringify(googlePlace),
          google_place_results: JSON.stringify(placeDetailsData?.result),
        },
      });
    } else {
      // If no photo reference is available, create the destination without an image
      newDestination = await prisma.destination.create({
        data: {
          title: destination,
          image: "",
          google_place_id: googlePlace.place_id,
          geocoder_results: JSON.stringify(googlePlace),
          google_place_results: JSON.stringify(placeDetailsData?.result),
        },
      });
    }

    // If no new destination available at this point just throw a new error
    if (!newDestination) throw new Error("Failed to create a destination");

    // Update everything related to the destination
    await Promise.all([
      async () => {
        await addActivitiesToDestination(googlePlace, newDestination);
      },
      async () => {
        await addClimateDataToDestination(newDestination);
      },
      async () => {
        await addCostOfLivingToDestination(newDestination);
      },
      async () => {
        await addDescriptionToDestination(newDestination);
      },
      async () => {
        await addImagesToDestionation(newDestination);
      },
    ]).catch((error) => {
      console.error(error);
    });

    // Refetch destination after updates
    const finalDestination = await prisma.destination.findUnique({
      where: {
        id: newDestination.id,
      },
      include: {
        Activities: true,
        Hotels: true,
        DestinationImage: true,
      },
    });
    return finalDestination as DestinationWithDetails;
  } catch (error) {
    console.error("Error fetching place details", error);
    return undefined;
  }
}
