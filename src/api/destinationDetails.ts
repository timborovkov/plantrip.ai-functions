import "dotenv/config";
import express, { Request, Response } from "express";
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
          planDestination: {
            include: {
              DestinationImage: true,
            },
          },
        },
      });
      if (!plan) {
        res.status(500).json({
          response: "Plan not found",
        });
        return;
      }

      // Get destination
      if (!plan.planDestination) {
        res.status(500).json({
          response: "Destination not found",
        });
        return;
      }

      // Return the response
      res.status(200).json({
        response: "ok",
      });

      const destination = plan.planDestination;
      const coords: { lat: number; lng: number } | null = JSON.parse(
        destination.geocoder_results
      ).geometry.location;
      const formatted_address: string =
        JSON.parse(destination.geocoder_results).formatted_address ?? "";
      const city: string = formatted_address.split(", ")[0];
      const country: string = formatted_address.split(", ")[1];

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

          if (photoReferences.length > 0) {
            // Limit to 4 images
            const maxImages = 4;
            const requests = [];

            for (
              let i = 0;
              i < Math.min(maxImages, photoReferences.length);
              i++
            ) {
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

      // Does destination have climate data?
      if (!destination.climate_data || destination.climate_data.length == 0) {
        // Does not have climate data yet
        if (coords) {
          // Get the climate data from RapidAPI / meteostat
          try {
            const climate = await fetch(
              `https://meteostat.p.rapidapi.com/point/normals?lat=${coords.lat}&lon=${coords.lng}&start=1961&end=1990`,
              {
                method: "GET",
                headers: {
                  "X-RapidAPI-Key": process.env.RAPID_API_KEY ?? "",
                  "X-RapidAPI-Host": "meteostat.p.rapidapi.com",
                },
              }
            ).then((res) => res.json());
            if (climate.data && climate.data.length > 0) {
              const climateData: {
                month: number | null;
                tavg: number | null;
                tmin: number | null;
                tmax: number | null;
                prcp: number | null;
                wspd: number | null;
                pres: number | null;
                tsun: number | null;
              }[] = climate.data;
              const climateDataString = JSON.stringify(climateData);
              // Update the destination climate
              await prisma.destination.update({
                where: {
                  id: destination.id,
                },
                data: {
                  climate_data: climateDataString,
                },
              });
            } else {
              console.log("No climate data");
            }
          } catch (error) {
            console.error("Failed to fetch climate", error);
          }
        } else {
          console.log("Climate data: No coords");
        }
      }

      // Does destination have cost of living data?
      if (
        !destination.cost_of_living ||
        destination.cost_of_living.length == 0
      ) {
        // Does not have cost of living data yet
        if (city && country) {
          // Get the cost of living data from RapidAPI
          try {
            const costOfLiving = await fetch(
              `https://cost-of-living-and-prices.p.rapidapi.com/prices?city_name=${city}&country_name=${country}`,
              {
                method: "GET",
                headers: {
                  "X-RapidAPI-Key": process.env.RAPID_API_KEY ?? "",
                  "X-RapidAPI-Host": "cost-of-living-and-prices.p.rapidapi.com",
                },
              }
            ).then((res) => res.json());
            if (costOfLiving.prices && costOfLiving.prices.length > 0) {
              const costOfLivingDataString = JSON.stringify(costOfLiving);
              // Update the destination cost of living
              await prisma.destination.update({
                where: {
                  id: destination.id,
                },
                data: {
                  cost_of_living: costOfLivingDataString,
                },
              });
            } else {
              console.log("No cost of living data");
            }
          } catch (error) {
            console.error("Failed to fetch cost of living", error);
          }
        } else {
          console.log("Cost of living data: No city or country");
        }
      }

      // Does destination have description?
      if (!destination.description || destination.description.length == 0) {
        // Does not have description yet
        // Use OpenAI to generate a description
        try {
          const apiSummaryResponse = await openai.chat.completions.create({
            model: "gpt-3.5-turbo", // Model maximum tokens: 4097
            messages: [
              {
                role: "user",
                content: `Generate HTML text for a description of ${destination.title}. Add sections for safety, history, general knowledge. Make it sound like a human writen promotional text.`,
              },
            ],
            temperature: 0.1, // randomness
            max_tokens: 500,
          });

          const descriptionResponseText =
            apiSummaryResponse.choices[0].message?.content?.trim() || "";

          // Update the destination description
          await prisma.destination.update({
            where: {
              id: destination.id,
            },
            data: {
              description: descriptionResponseText,
            },
          });
        } catch (error) {
          console.error("Failed to generate description", error);
        }
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({
        response: "Internal server error",
      });
    }
  }
);

export default router;
