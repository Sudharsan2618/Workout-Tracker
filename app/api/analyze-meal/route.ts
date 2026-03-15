import { generateText, Output } from "ai"
import { google } from "@ai-sdk/google"
import { z } from "zod"

export async function POST(req: Request) {
  try {
    const { imageBase64, mealDescription } = await req.json()

    const messages = [
      {
        role: "user" as const,
        content: [
          {
            type: "text" as const,
            text: `Analyze this meal and estimate the nutritional content. ${mealDescription ? `The user describes it as: ${mealDescription}` : ""}
            
Consider typical portion sizes. Be reasonable with estimates - this is for a fitness tracker for someone trying to gain muscle mass.
Provide your analysis as a JSON object.`,
          },
          ...(imageBase64
            ? [
                {
                  type: "image" as const,
                  image: imageBase64,
                },
              ]
            : []),
        ],
      },
    ]

    const result = await generateText({
      model: google("gemini-3.1-pro-preview"),
      messages,
      output: Output.object({
        schema: z.object({
          calories: z.number().describe("Estimated total calories"),
          protein: z.number().describe("Estimated protein in grams"),
          description: z.string().describe("Brief description of the meal identified"),
          items: z.array(z.object({
            name: z.string(),
            calories: z.number(),
            protein: z.number(),
          })).describe("Individual food items identified"),
          tips: z.string().nullable().describe("Optional tip to increase protein or improve the meal for muscle gain"),
        }),
      }),
    })

    return Response.json(result.output)
  } catch (error) {
    console.error("Error analyzing meal:", error)
    return Response.json(
      { error: "Failed to analyze meal" },
      { status: 500 }
    )
  }
}
