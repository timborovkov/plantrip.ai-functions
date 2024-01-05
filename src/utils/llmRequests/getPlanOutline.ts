import prisma from "../prisma";
import openai from "../openai";
import { ChatCompletionMessageParam } from "openai/resources";
import { Activities } from "@prisma/client";

export default async function getPlanOutline({
  properties,
  destination,
  theActivities,
}: {
  properties: string[];
  destination: string;
  theActivities: Activities[];
}) {
  const promptMessages: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: `You are a travel agent. Plan a trip initiary based on the parameters provided by the user provided, give an outline of the trip day by day for future use. Provide itinerary of activities, attractions, hotel, dining and lunch options. Include information about museums, parks, and local events. Put the notes and hotel recommendation at the end.`,
    },
    {
      role: "user",
      content: properties.join(", "),
    },
    {
      role: "system",
      content: `Some of the things you can do while visiting ${destination} are 
          visiting ${theActivities
            .filter((a) => a.category === "sights")
            .map((a) => a.title)
            .join(", ")},
          eating in ${theActivities
            .filter((a) => a.category === "restaurant")
            .map((a) => a.title)
            .join(", ")},
          shopping in ${theActivities
            .filter((a) => a.category === "shopping")
            .map((a) => a.title)
            .join(", ")}
          attending in ${theActivities
            .filter((a) => a.category === "activity")
            .map((a) => a.title)
            .join(", ")}
            `,
    },
  ];
  const apiResponse = await openai.chat.completions.create({
    model: "gpt-3.5-turbo", // Model maximum tokens: 4097
    messages: promptMessages,
    temperature: 0, // randomness
    max_tokens: 3597,
  });

  const tripOutline = apiResponse.choices[0].message?.content?.trim() || "";

  // Save the chat to the database for future training
  promptMessages.push({
    role: "assistant",
    content: tripOutline,
  });
  await prisma.languageModelRequests.create({
    data: {
      systemRequest: promptMessages
        .filter((a) => a.role === "system")
        .join("; "),
      request: promptMessages.filter((a) => a.role === "user").join("; "),
      reply: tripOutline,
      fullChatObject: JSON.stringify(promptMessages),
    },
  });

  return tripOutline;
}
