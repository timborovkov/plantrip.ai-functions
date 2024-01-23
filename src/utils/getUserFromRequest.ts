import { WithAuthProp, clerkClient } from "@clerk/clerk-sdk-node";
import { Request } from "express";
import { syncClerkUserWithDB } from "./checkIfUserExists";

export const getUserFromRequest = async (req: WithAuthProp<Request>) => {
  try {
    // Get Clerk User
    const { userId } = req.auth;
    const user = userId ? await clerkClient.users.getUser(userId) : null;
    if (!user) {
      return { response: "Unauthorized" };
    }
    const { id, firstName, lastName, emailAddresses, phoneNumbers } = user;

    // Get Prisma User
    const prismaUser = await syncClerkUserWithDB({
      clerkUUID: id,
      email: emailAddresses[0].emailAddress,
      name: `${firstName} ${lastName}`,
      phone: phoneNumbers.length > 0 ? phoneNumbers[0].phoneNumber : "",
    });
    if (!prismaUser) {
      return { response: "Error syncing user with database" };
    }
    return {
      prismaUser,
      clerkUser: user,
    };
  } catch (error) {
    console.error(error);
    return { response: "Error getting user from request" };
  }
};
