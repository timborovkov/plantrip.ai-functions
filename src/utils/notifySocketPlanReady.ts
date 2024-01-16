import "dotenv/config";
import io from "socket.io-client";
import prisma from "./prisma";
export default async function notifySocketPlanReady(planId: number) {
  try {
    // Get all trips associated with the planId
    const plansWithTrips = await prisma.plan.findMany({
      where: {
        id: planId,
      },
      include: {
        trips: true,
      },
    });
    let tripIDs: number[] = [];
    plansWithTrips.forEach((plan) => {
      tripIDs = [...tripIDs, ...plan.trips.map((a) => a.id)];
    });

    const socket = io(process.env.WEBSITE_URL ?? "");

    socket.on("connect", () => {
      tripIDs.forEach((id) => {
        socket.emit("plan-ready-server-notification", id);
      });
      socket.disconnect();
    });
  } catch (error) {
    console.error("Failed notifySocketPlanReady");
  }
}
