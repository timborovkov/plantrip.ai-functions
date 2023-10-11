import fetch from "node-fetch";
import prisma from "./prisma";
import { Plan, Destination } from "@prisma/client";

export async function createOrUpdateDestination(
  destination: string,
  googlePlace: google.maps.GeocoderResult,
  existingPlan: Plan
): Promise<Destination | undefined> {
  try {
    // Check if destination exists in the database
    let existingDestination = await prisma.destination.findFirst({
      where: {
        google_place_id: googlePlace.place_id,
      },
    });

    if (!existingDestination) {
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
        existingDestination = await prisma.destination.create({
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
        existingDestination = await prisma.destination.create({
          data: {
            title: destination,
            image: "",
            google_place_id: googlePlace.place_id,
            geocoder_results: JSON.stringify(googlePlace),
            google_place_results: JSON.stringify(placeDetailsData?.result),
          },
        });
      }
    }

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

    return existingDestination;
  } catch (error) {
    console.error("Error fetching place details", error);
    return undefined;
  }
}
