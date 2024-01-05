import prisma from "../prisma";
import openai from "../openai";
import { ChatCompletionMessageParam } from "openai/resources";

export default async function getPlanSummaryUsingOutline({
  planOutline,
}: {
  planOutline: string;
}) {
  const promptMessages: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: `You are a travel agent. Write a trip plan summary of a few sentences. Make it sound like a travel agency writen promotional text.`,
    },
    {
      role: "user",
      content: planOutline,
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
        .map((a) => a.content)
        .join("; "),
      request: promptMessages
        .filter((a) => a.role === "user")
        .map((a) => a.content)
        .join("; "),
      reply: tripOutline,
      fullChatObject: JSON.stringify(promptMessages),
    },
  });

  return tripOutline;
}
