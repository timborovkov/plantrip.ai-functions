import "dotenv/config";
import request from "supertest";
import app from "../src/app";

describe("GET /api/v1", () => {
  it("responds with a json message", (done) => {
    request(app)
      .get("/api/v1")
      .set("Accept", "application/json")
      .expect("Content-Type", /json/)
      .expect(
        200,
        {
          message: "API - 👋🌎🌍🌏",
        },
        done
      );
  });
});

describe("POST /api/v1/plan", () => {
  it("responds with a json message", (done) => {
    request(app)
      .post("/api/v1/plan")
      .send({
        destination: "Helsinki, Finland",
        duration: "4 days",
        tripType: "luxury",
        destinationPlace: "",
        tripBudget: "1000 EUR",
        accommodationBooking: "",
        travelersCount: 1,
        specialRequests: "",
      })
      .set("Accept", "application/json")
      .set("Authorization", process.env.API_KEY ?? "")
      .expect("Content-Type", /json/)
      .expect(200)
      .end(done);
  });
});

describe("GET /api/v1/destination-details", () => {
  it("responds with a json message", (done) => {
    request(app)
      .get("/api/v1/destination-details?tripid=3")
      .set("Accept", "application/json")
      .set("Authorization", process.env.API_KEY ?? "")
      .expect("Content-Type", /json/)
      .expect(200, { response: "ok" }, done);
  });
});
