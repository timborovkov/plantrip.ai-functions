import prisma from "../prisma";
import openai from "../openai";
import { ChatCompletionMessageParam } from "openai/resources";
import splitDayInToSections from "../tools/splitDayInToSections";

export default async function getDayByDayPlanUsingOutline({
  planOutline,
  durationInDays,
  properties,
}: {
  planOutline: string;
  durationInDays: number;
  properties: string[];
}) {
  try {
    const llmRequests = [];
    const promptMessagesByDay: ChatCompletionMessageParam[][] = [];
    for (let i = 0; i < durationInDays; i++) {
      const day = i + 1;
      const promptMessages: ChatCompletionMessageParam[] = [
        {
          role: "system",
          content: `You are a travel agent. You will be provided a general plan of a trip by the user. Please write a detailed schedule for day ${day} of the trip. Don't mention anything from the other days.`,
        },
        {
          role: "system",
          content: `General information about the trip: ${properties.join(
            ", "
          )}`,
        },
        {
          role: "user",
          content: planOutline,
        },
      ];
      promptMessagesByDay.push(promptMessages);
      llmRequests.push(
        openai.chat.completions.create({
          model: "gpt-3.5-turbo", // Model maximum tokens: 4097
          messages: promptMessages,
          temperature: 0, // randomness
          max_tokens: 600,
        })
      );
    }

    // Process all llmRequests and get responses
    const responses = await Promise.all(llmRequests);
    const responsesByDay = responses.map((a) => {
      return a.choices[0].message?.content?.trim() || "";
    });

    // Save the chat to the database for future training
    const createLLMMessages = [];
    for (let i = 0; i < promptMessagesByDay.length; i++) {
      const promptMessages = promptMessagesByDay[i];
      const reply = responsesByDay[i];
      promptMessages.push({
        role: "assistant",
        content: reply,
      });
      createLLMMessages.push(
        prisma.languageModelRequests.create({
          data: {
            systemRequest: promptMessages
              .filter((a) => a.role === "system")
              .map((a) => a.content)
              .join("; "),
            request: promptMessages
              .filter((a) => a.role === "user")
              .map((a) => a.content)
              .join("; "),
            reply: reply,
            fullChatObject: JSON.stringify(promptMessages),
          },
        })
      );
    }
    await Promise.all(createLLMMessages);
    const dayByDayPlanResult = responsesByDay.map((a) => {
      return splitDayInToSections(a);
    });
    return dayByDayPlanResult;
  } catch (error) {
    console.error("getDayByDayPlanUsingOutline", error);
    return [];
  }
}
