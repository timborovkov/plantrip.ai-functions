import "dotenv/config";
import fetch from "node-fetch";
import prisma from "../prisma";
import { Destination } from "@prisma/client";

export default async function addCostOfLivingToDestination(
  destination: Destination | null
) {
  if (!destination) return [];
  // Does destination have cost of living data?
  if (!destination.cost_of_living || destination.cost_of_living.length == 0) {
    const formatted_address: string =
      JSON.parse(destination.geocoder_results).formatted_address ?? "";
    const city: string = formatted_address.split(", ")[0];
    const country: string = formatted_address.split(", ")[1];
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
}
