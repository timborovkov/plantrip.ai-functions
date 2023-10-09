import prisma from "./prisma";
import { User, Trip } from "@prisma/client";
import { findOrCreateCustomerStripe } from "./findOrCreateCustomerStripe";
import { customerHasFeature } from "./use-stripe-subscriptions";

type ClerkUserProps = {
  clerkUUID: string;
  email: string;
  phone: string;
  name: string;
};
export type PrismaUser = {
  trips: Trip[];
} & User;

export async function syncClerkUserWithDB(
  user: ClerkUserProps
): Promise<PrismaUser> {
  try {
    // Check if the user exists in the database
    const existingUser = await prisma.user.findUnique({
      where: {
        clerkUUID: user.clerkUUID, // Assuming email is unique for a user
      },
    });

    if (!existingUser) {
      const stripeCustomerId = await findOrCreateCustomerStripe({
        clerkUserId: user.clerkUUID,
      });
      // If user doesn't exist, create a new user
      const newUser = await prisma.user.create({
        data: {
          clerkUUID: user.clerkUUID,
          email: user.email,
          name: user.name,
          phone: user.phone,
          subscription_level: "free",
          stripe_customer_id: stripeCustomerId,
        },
        include: {
          trips: true,
        },
      });
      return newUser;
    } else {
      // Check if has Stripe user
      const stripeCustomerId = await findOrCreateCustomerStripe({
        clerkUserId: user.clerkUUID,
      });

      // Validate plan
      let isFreeUser = false;
      let isPlusUser = false;
      let isExclusiveUser = false;

      try {
        const [freeResult, plusResult, exclusiveResult] = await Promise.all([
          customerHasFeature({ customerId: stripeCustomerId, feature: "free" }),
          customerHasFeature({ customerId: stripeCustomerId, feature: "plus" }),
          customerHasFeature({
            customerId: stripeCustomerId,
            feature: "exclusive",
          }),
        ]);

        isFreeUser = freeResult;
        isPlusUser = plusResult;
        isExclusiveUser = exclusiveResult;
      } catch (error) {
        console.error(error);
      }

      // If user exists, update the user data
      const updatedUser = await prisma.user.update({
        where: {
          clerkUUID: user.clerkUUID,
        },
        data: {
          email: user.email,
          name: user.name,
          phone: user.phone,
          stripe_customer_id: stripeCustomerId,
          subscription_level: isExclusiveUser
            ? "exclusive"
            : isPlusUser
            ? "plus"
            : isFreeUser
            ? "free"
            : "free",
        },
        include: {
          trips: true,
        },
      });
      return updatedUser;
    }
  } catch (error) {
    console.error(error);
    throw error;
  }
}
