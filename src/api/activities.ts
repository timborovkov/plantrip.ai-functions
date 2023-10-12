import "dotenv/config";
import express, { Request, Response } from "express";
import fetch from "node-fetch";
import prisma from "../utils/prisma";
import openai from "../utils/openai";

const router = express.Router();

type DestinationDetailsResponse = {
  response: string;
};

router.get(
  "/",
  async (req: Request, res: Response<DestinationDetailsResponse>) => {
    try {
      // Verify API key
      const apiKey = process.env.API_KEY ?? "";
      const key = req.headers.authorization;
      if ((key === undefined && key === undefined) || key !== apiKey) {
        res.status(401).json({ response: "not signed in" });
        return;
      }

      // Verify tripid
      const { tripid } = req.query;
      const tripId = typeof tripid === "string" ? parseInt(tripid) : null;
      if (!tripId) {
        res.status(400).json({ response: "missing tripid" });
        return;
      }

      // Start generating the list, return OK to stop waiting
      res.status(200).json({
        response: "ok",
      });

      // Retrieve the plan using the trip ID
      const plan = await prisma.plan.findFirst({
        where: {
          trips: {
            some: {
              id: tripId,
            },
          },
        },
        include: {
          Activities: {
            include: {
              activityImages: true,
            },
          },
        },
      });

      // Check if plan exists
      if (!plan) {
        return;
      }

      // Check if plan already has activities
      if (plan.Activities?.length > 0) {
        return;
      }

      // Generate new activities list if does not exist yet
      // Use OpenAI to get list of venues and locations from plan.content
      const apiResponse = await openai.chat.completions.create({
        model: "gpt-3.5-turbo", // Model maximum tokens: 4097
        messages: [
          {
            role: "system",
            content:
              "create a comma seperated list of all venues, locations, hotels from the text provided next",
          },
          {
            role: "user",
            content: plan.content,
          },
        ],
        temperature: 0, // randomness
        max_tokens: 500,
      });

      const responseText =
        apiResponse.choices[0].message?.content?.trim() ||
        "No highlights found.";
      const activityNames = responseText.split(", ");

      const activities: any[] = [];

      for (let i = 0; i < activityNames?.length; i++) {
        const activityName = activityNames[i];
        // Check if activity already exists in database
        const existingActivity = await prisma.activities.findFirst({
          where: {
            title: activityName,
            location: plan.destination,
          },
          include: {
            activityImages: true,
          },
        });
        if (existingActivity) {
          activities.push(existingActivity);
        } else {
          // If does not exist, create activity
          // Get the Google place ID
          const googlePlace = await fetch(
            `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(
              activityName + ", " + plan.destination
            )}&inputtype=textquery&key=${
              process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
            }`
          ).then((res) => res.json());
          if (
            googlePlace.status === "OK" &&
            googlePlace.candidates?.length > 0
          ) {
            const placeId = googlePlace.candidates[0].place_id;

            // Fetch the place details using the Google Places API
            const placeDetailsData = await fetch(
              `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY}`
            ).then((res) => res.json());

            // Get photo references
            const photoReferences: string[] = placeDetailsData?.result?.photos
              ?.map((photo: any) => photo.photo_reference)
              .slice(0, 3);

            // Get photos
            const photos = [];
            if (photoReferences && typeof photoReferences === "object") {
              for (
                let photoIndex = 0;
                photoIndex < photoReferences.length;
                photoIndex++
              ) {
                const photoReference = photoReferences[photoIndex];
                const photoBuffer = await fetch(
                  `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1600&photo_reference=${photoReference}&key=${process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY}`
                ).then((res) => res.arrayBuffer());
                photos.push(Buffer.from(photoBuffer).toString("base64"));
              }
            }

            // Save the activity
            const activity = await prisma.activities.create({
              data: {
                title: activityName,
                location: plan.destination,
                type: "place",
                google_place_id: placeId,
                google_place_results: JSON.stringify(placeDetailsData),
              },
            });

            // Create the images
            if (photos && typeof photos === "object") {
              for (
                let imageIndex = 0;
                imageIndex < photos.length;
                imageIndex++
              ) {
                const photo = photos[imageIndex];
                await prisma.activityImage.create({
                  data: {
                    image: photo,
                    activitiesId: activity.id,
                  },
                });
              }
            }

            const activityWithImages = await prisma.activities.findUnique({
              where: {
                id: activity.id,
              },
              include: {
                activityImages: true,
              },
            });

            activities.push(activityWithImages);
          } else {
            console.log("Place not found.");
          }
        }
      }

      // Connect the activities to the plan
      await prisma.plan.update({
        where: {
          id: plan.id,
        },
        data: {
          Activities: {
            connect: activities.map((activity) => ({ id: activity.id })),
          },
        },
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        response: "Internal server error",
      });
    }
  }
);

export default router;
