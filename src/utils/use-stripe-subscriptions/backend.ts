import Stripe from "stripe";

export const stripeApiClient = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2023-10-16",
});

export interface CustomerHasFeatureArgs {
  customerId: string;
  feature: string;
}
export const customerHasFeature = async ({
  customerId,
  feature,
}: {
  customerId: string;
  feature: string;
}) => {
  const customer = (await stripeApiClient.customers.retrieve(customerId, {
    expand: ["subscriptions"],
  })) as Stripe.Customer;
  let subscription = customer.subscriptions?.data[0] || null;
  if (subscription) {
    subscription = await stripeApiClient.subscriptions.retrieve(
      subscription.id,
      { expand: ["items.data.price.product"] }
    );
    const features = (
      subscription.items.data[0].price.product as Stripe.Product
    ).metadata.features;
    return features?.includes(feature);
  }
  return false;
};
