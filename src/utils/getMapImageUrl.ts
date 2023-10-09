export default function getMapImageUrl({
  cityName,
  width = 600,
  height = 400,
}: {
  cityName: string;
  width: number;
  height: number;
}): string {
  const baseUrl = "https://maps.googleapis.com/maps/api/staticmap";
  const parameters = `?center=${encodeURIComponent(
    cityName
  )}&zoom=10&size=${width}x${height}&key=${
    process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
  }`;
  return baseUrl + parameters;
}
