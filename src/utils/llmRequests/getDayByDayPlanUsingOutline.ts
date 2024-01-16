import prisma from "../prisma";
import openai from "../openai";
import { ChatCompletionMessageParam } from "openai/resources";

const assistantSystemInput = `
You are a travel planning bot. 

You will be provided a general plan of a trip by the user. Please write a detailed schedule for a day of the trip specified by the user. Don't mention anything from the other days. 

Expand on the activities provided in the outline by the user, add more options. Improve the user provided plan. Each section content should have at least 4-5 items. Tell more about the plan items in the content section of the JSON.

Don't add the day number as a seperate title. This structure involves text divided into sections, each identified by a title (e.g., "Morning:", "Afternoon:", "Evening:", "Dining options:", "Other"...). Titles introduce the purpose of each section, followed by content.  
The response should be always in JSON format. Each day should have at least sections Morning, Afternoon, Evening and Notes
Respond exactly in this JSON format:
[
  {
    title: "Section title",
    content: [
      "One thing to do in the section",
      "Another thing to do in the section",
      "Some information about the places visited during this section",
      "Another thing to do in the section",
      
    ],
    places: [
      "Section place highlight 1",
      "Section place highlight 2",
    ]
  },
  {
    title: "Section title",
    content: [
      "One thing to do in the section",
      "Another thing to do in the section",
      "Some information about the places visited during this section",
      "Another thing to do in the section",
      
    ],
    places: [
      "Section place highlight 1",
      "Section place highlight 2",
    ]
  },
  {
    title: "Section title",
    content: [
      "One thing to do in the section",
      "Another thing to do in the section",
      "Some information about the places visited during this section",
      "Another thing to do in the section",
      
    ],
    places: [
      "Section place highlight 1",
      "Section place highlight 2",
    ]
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
      typeof item.title !== "string" ||
      !Array.isArray(item.content)
    ) {
      return false;
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
          role: "system",
          content: `          
          General information about the trip: 
          ${properties.join("; ")}
          Outline: 
          ${planOutline}
          `,
        },
        {
          role: "user",
          content: `Build plan for day ${day} of my trip`,
        },
      ];
      promptMessagesByDay.push(promptMessages);
      llmRequests.push(
        openai.chat.completions.create({
          model: "gpt-3.5-turbo-1106", // Model maximum tokens: 4095
          messages: promptMessages,
          temperature: 1, // randomness
          max_tokens: 4095,
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
        console.error(error);
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
