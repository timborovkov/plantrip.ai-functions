import fetch, { Response } from "node-fetch";
import { URLSearchParams } from "url";
import "dotenv/config";

export default class AmadeusAPI {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;

  constructor() {
    this.baseUrl = process.env.AMADEUS_API_ENDPOINT ?? "";
    this.apiKey = process.env.AMADEUS_API_KEY ?? "";
    this.apiSecret = process.env.AMADEUS_API_SECRET ?? "";
  }

  private async getAccessToken(): Promise<string> {
    try {
      const body = new URLSearchParams();
      body.append("grant_type", "client_credentials");
      body.append("client_id", this.apiKey);
      body.append("client_secret", this.apiSecret);

      const response: Response = await fetch(
        `${this.baseUrl}/v1/security/oauth2/token`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: body.toString(),
        }
      );

      if (response.status === 200) {
        const data = await response.json();
        if (data.access_token) {
          return data.access_token;
        } else {
          throw new Error("Failed to obtain access token");
        }
      } else {
        throw new Error(
          `Failed to obtain access token: ${response.statusText}`
        );
      }
    } catch (error: any) {
      throw new Error(`Failed to obtain access token: ${error.message}`);
    }
  }

  async searchActivities(params: {
    radius: number;
    latitude: number;
    longitude: number;
  }): Promise<any[]> {
    if (process.env.NODE_ENV !== "production") {
      const pois = require("../../sample_data/amadeus_activities_paris.json");
      return pois;
    }
    const accessToken = await this.getAccessToken();
    let results: any[] = [];
    try {
      const queryParams = new URLSearchParams({
        radius: params.radius.toString(),
        latitude: params.latitude.toString(),
        longitude: params.longitude.toString(),
      });

      const response: Response = await fetch(
        `${this.baseUrl}/v1/shopping/activities?${queryParams.toString()}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.status === 200) {
        const { data } = await response.json();
        results = [...data];
      } else {
        throw new Error(`Failed to fetch Activities: ${response.statusText}`);
      }
      return results.filter((i) => {
        return i?.pictures?.length > 0;
      });
    } catch (error: any) {
      console.log(`Failed to fetch Activities: ${error.message}`);
      return results;
    }
  }

  async searchPOIs(params: {
    radius: number;
    latitude: number;
    longitude: number;
  }): Promise<any[]> {
    if (process.env.NODE_ENV !== "production") {
      const pois = require("../../sample_data/amadeus_pois_paris.json");
      return pois;
    }
    const maxPageSize = 10; // Set your desired maximum page size
    const accessToken = await this.getAccessToken();
    let offset = 0;
    let results: any[] = [];
    try {
      while (true) {
        const queryParams = new URLSearchParams({
          radius: params.radius.toString(),
          latitude: params.latitude.toString(),
          longitude: params.longitude.toString(),
          "page[offset]": offset.toString(),
          "page[limit]": maxPageSize.toString(),
        });

        const response: Response = await fetch(
          `${
            this.baseUrl
          }/v1/reference-data/locations/pois?${queryParams.toString()}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (response.status === 200) {
          const { data, meta } = await response.json();
          results = [...results, ...data];
          offset += maxPageSize;
          if (results.length >= meta.count || results.length >= 50) {
            // No more results, break the loop
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second before making next request to avoid "Too many requests"
        } else {
          throw new Error(`Failed to fetch POIs: ${response.statusText}`);
        }
      }

      return results;
    } catch (error: any) {
      console.log(`Failed to fetch POIs: ${error.message}`);
      return results;
    }
  }
}
