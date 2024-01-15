import prisma from "../prisma";
import openai from "../openai";
import { ChatCompletionMessageParam } from "openai/resources";

const assistantSystemInput = `
You are a travel agent. You will be provided a general plan of a trip by the user. Please write a detailed schedule for a day of the trip specified by the user. Don't mention anything from the other days. Don't add any sort of notes or anything, just the requested structure.
Don't add the day number as a seperate title. This structure involves text divided into sections, each identified by a title (e.g., "Morning:", "Afternoon:", "Evening:"). Titles introduce the purpose of each section, followed by content.  
The response should be always in JSON format.
Return the information in this format:
[
{
title: "Morning",
content: [
"ABC",
"XYZ",
],
places: ["ABC"]
},
{
title: "Afternoon",
content: [
"ABC",
"XYZ",
"QWE",
],
places: ["ABC"]
},
]
`;

interface MyJsonFormat {
  title: string;
  content: string[];
  places: string[];
}

function isValidJsonObject(json: any): boolean {
  if (!Array.isArray(json)) {
    return false;
  }

  for (const item of json) {
    if (
      !item ||
      typeof item !== "object" ||
      !item.hasOwnProperty("title") ||
      !item.hasOwnProperty("content") ||
      !item.hasOwnProperty("places") ||
      typeof item.title !== "string" ||
      !Array.isArray(item.content) ||
      !Array.isArray(item.places)
    ) {
      return false;
    }

    for (const contentItem of item.content) {
      if (typeof contentItem !== "string") {
        return false;
      }
    }

    for (const place of item.places) {
      if (typeof place !== "string") {
        return false;
      }
    }
  }

  return true;
}

export default async function getDayByDayPlanUsingOutline({
  planOutline,
  durationInDays,
  properties,
}: {
  planOutline: string;
  durationInDays: number;
  properties: string[];
}): Promise<MyJsonFormat[][]> {
  try {
    const llmRequests = [];
    const promptMessagesByDay: ChatCompletionMessageParam[][] = [];
    for (let i = 0; i < durationInDays; i++) {
      const day = i + 1;
      const promptMessages: ChatCompletionMessageParam[] = [
        {
          role: "system",
          content: assistantSystemInput,
        },
        {
          role: "user",
          content: `
          Build plan for day ${day}
          
          General information about the trip: 
          ${properties.join("; ")}

          Outline:
          ${planOutline}
          `,
        },
      ];
      promptMessagesByDay.push(promptMessages);
      llmRequests.push(
        openai.chat.completions.create({
          model: "gpt-3.5-turbo-1106", // Model maximum tokens: 4097
          messages: promptMessages,
          temperature: 0, // randomness
          max_tokens: 600,
          response_format: { type: "json_object" },
        })
      );
    }

    // Process all llmRequests and get responses
    const responses = await Promise.all(llmRequests);
    const responsesByDay: MyJsonFormat[][] = responses.map((a) => {
      try {
        const llmResponse = a.choices[0].message?.content?.trim() || "[]";
        const parsedJson = JSON.parse(llmResponse);
        const isValid = isValidJsonObject(parsedJson);

        if (isValid) {
          return parsedJson;
        } else {
          return [];
        }
      } catch (error) {
        return [];
      }
    });

    // Save the chat to the database for future training
    const createLLMMessages = [];
    for (let i = 0; i < promptMessagesByDay.length; i++) {
      const promptMessages = promptMessagesByDay[i];
      const reply = JSON.stringify(responsesByDay[i]);
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
    return responsesByDay;
  } catch (error) {
    console.error("getDayByDayPlanUsingOutline", error);
    return [];
  }
}
