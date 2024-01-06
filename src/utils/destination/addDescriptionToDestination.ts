import prisma from "../prisma";
import openai from "../openai";
import { Destination, DestinationImage } from "@prisma/client";

type DestinationWithImages = Destination & {
  DestinationImage: DestinationImage[];
};

export default async function addDescriptionToDestination(
  destination: DestinationWithImages
) {
  // Does destination have description?
  if (!destination.description || destination.description.length == 0) {
    // Does not have description yet
    // Use OpenAI to generate a description
    try {
      const apiSummaryResponse = await openai.chat.completions.create({
        model: "gpt-3.5-turbo", // Model maximum tokens: 4097
        messages: [
          {
            role: "user",
            content: `Generate HTML text for a description of ${destination.title}. Add sections for safety, history, general knowledge. Make it sound like a human writen promotional text. Skip the doctype, body, head and other such tags`,
          },
        ],
        temperature: 0.1, // randomness
        max_tokens: 600,
      });

      const descriptionResponseText =
        apiSummaryResponse.choices[0].message?.content?.trim() || "";

      // Update the destination description
      await prisma.destination.update({
        where: {
          id: destination.id,
        },
        data: {
          description: descriptionResponseText,
        },
      });
    } catch (error) {
      console.error("Failed to generate description", error);
    }
  }
}
