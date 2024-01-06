import fetch from "node-fetch";
import prisma from "../prisma";
import { Destination } from "@prisma/client";

export default async function addImagesToDestionation(
  theDestination: Destination | null
) {
  if (!theDestination) return [];
  const destination = await prisma.destination.findFirst({
    where: {
      id: theDestination.id,
    },
    include: {
      DestinationImage: true,
    },
  });
  if (!destination) return [];
  // Does destination have images?
  if (
    !destination.DestinationImage ||
    destination.DestinationImage.length === 0
  ) {
    // Does not have images yet
    try {
      // Get the images from Google
      // Fetch the place details using the Google Places API
      const placeDetailsResponse = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${destination.google_place_id}&key=${process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY}`
      );
      const placeDetailsData = await placeDetailsResponse.json();

      // Get photo references
      const photoReferences = placeDetailsData?.result?.photos?.map(
        (photo: any) => photo.photo_reference
      );

      if (photoReferences && photoReferences.length > 0) {
        // Limit to 4 images
        const maxImages = 4;
        const requests = [];

        for (let i = 0; i < Math.min(maxImages, photoReferences.length); i++) {
          const photoReference = photoReferences[i];
          const request = fetch(
            `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1600&photo_reference=${photoReference}&key=${process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY}`
          )
            .then(async (imageResponse) => {
              if (imageResponse.ok) {
                const imageBuffer = await imageResponse.arrayBuffer();

                // Store the image in the database
                await prisma.destinationImage.create({
                  data: {
                    image: Buffer.from(imageBuffer).toString("base64"),
                    destinationId: destination.id,
                  },
                });
              } else {
                console.error(
                  `Failed getting image with reference ${photoReference}`
                );
              }
            })
            .catch((error) => {
              console.error("Failed getting image", error);
            });

          requests.push(request);
        }

        // Wait for all requests to complete
        await Promise.all(requests);
      } else {
        console.log("No photo references");
      }
    } catch (error) {
      console.error("Failed getting images", error);
    }
  }
}
