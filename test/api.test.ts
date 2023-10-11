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

describe("GET /api/v1/emojis", () => {
  it("responds with a json message", (done) => {
    request(app)
      .get("/api/v1/emojis")
      .set("Accept", "application/json")
      .expect("Content-Type", /json/)
      .expect(200, ["😀", "😳", "🙄"], done);
  });
});

describe("POST /api/v1/plan", () => {
  it("responds with a json message", (done) => {
    request(app)
      .post("/api/v1/plan")
      .set("Accept", "application/json")
      .set("Authorization", process.env.API_KEY ?? "")
      .expect("Content-Type", /json/)
      .expect(200, ["😀", "😳", "🙄"], done);
  });
});
