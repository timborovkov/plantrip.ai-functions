import fetch from "node-fetch";
export const tripAdvisorOptions = {
  method: "GET",
  headers: {
    accept: "application/json",
    Referer: "https://plantrip.ai",
  },
};

// Function to fetch data from TripAdvisor API
export async function fetchTripAdvisorByType(
  category: string,
  coords: {
    lat: number;
    lng: number;
  } | null
) {
  const url = `https://api.content.tripadvisor.com/api/v1/location/nearby_search?language=en&key=${process.env.TRIPADVISOR_API_KEY}&cateogry=${category}&latLong=${coords?.lat},${coords?.lng}`;
  const response = await fetch(url, tripAdvisorOptions);
  const data = await response.json();
  return data.data;
}
