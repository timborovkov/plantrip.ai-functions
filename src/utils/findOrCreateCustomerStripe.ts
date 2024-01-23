import { clerkClient } from "@clerk/clerk-sdk-node";
import { stripeApiClient } from "./use-stripe-subscriptions";

export const findOrCreateCustomerStripe = async ({
  clerkUserId,
}: {
  clerkUserId: string;
}) => {
  let user = await clerkClient.users.getUser(clerkUserId);
  if (user.publicMetadata.stripeCustomerId) {
    return user.publicMetadata.stripeCustomerId as string;
  }

  if (!stripeApiClient) {
    throw new Error("Stripe API client not initialized");
  }

  const userEmail = user?.emailAddresses?.find(
    (x: any) => x.id === user.primaryEmailAddressId
  );
  const email = userEmail?.emailAddress ?? "";

  const customerCreate = await stripeApiClient.customers.create(
    {
      name: user.firstName + " " + user.lastName,
      email: email,
      metadata: {
        clerkUserId: user.id,
      },
    },
    {
      idempotencyKey: user.id,
    }
  );
  user = await clerkClient.users.updateUser(user.id, {
    publicMetadata: {
      stripeCustomerId: customerCreate.id,
    },
  });

  // Create FREE level subscription for the user
  await stripeApiClient.subscriptions.create({
    customer: customerCreate.id,
    items: [
      {
        price: process.env.STRIPE_FREE_PRICE_ID,
      },
    ],
  });

  return user.publicMetadata.stripeCustomerId as string;
};
