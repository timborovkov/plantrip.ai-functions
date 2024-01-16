import "dotenv/config";
import fetch from "node-fetch";
import prisma from "../prisma";
import { Destination } from "@prisma/client";

export default async function addClimateDataToDestination(
  destination: Destination | null
) {
  if (!destination) return [];
  // Does destination have climate data?
  if (!destination.climate_data || destination.climate_data.length == 0) {
    // Does not have climate data yet?
    const coords: { lat: number; lng: number } | null = JSON.parse(
      destination.geocoder_results
    ).geometry.location;
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
}
