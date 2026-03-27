import { generateObject } from "ai"
import { google } from "@ai-sdk/google"
import { z } from "zod"

export async function POST(req: Request) {
  try {
    const { imageBase64, mealDescription } = await req.json()

    const promptText = `Analyze this meal and estimate the nutritional content. ${mealDescription ? `The user describes it as: ${mealDescription}` : ""}
            
Consider typical portion sizes. Be reasonable with estimates - this is for a fitness tracker for someone trying to gain muscle mass.
Provide your analysis as a JSON object.`

    const parts: any[] = [{ text: promptText }]
    if (imageBase64) {
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: imageBase64
        }
      })
    }

    const payload = {
      contents: [
        {
          role: "user",
          parts
        }
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            calories: { type: "NUMBER", description: "Estimated total calories" },
            protein: { type: "NUMBER", description: "Estimated protein in grams" },
            description: { type: "STRING", description: "Brief description of the meal identified" },
            items: {
              type: "ARRAY",
              description: "Individual food items identified",
              items: {
                type: "OBJECT",
                properties: {
                  name: { type: "STRING" },
                  calories: { type: "NUMBER" },
                  protein: { type: "NUMBER" }
                },
                required: ["name", "calories", "protein"]
              }
            },
            tips: { type: "STRING", description: "Optional tip to increase protein or improve the meal for muscle gain", nullable: true }
          },
          required: ["calories", "protein", "description", "items"]
        }
      }
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${process.env.GOOGLE_GENERATIVE_AI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Google API REST Error:", errorText)
      throw new Error(`Google API failed: ${response.status} ${errorText}`)
    }

    const data = await response.json()
    const textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!textOutput) throw new Error("No output from model")
    
    // Sometimes the model might wrap JSON in markdown blocks
    const cleanJson = textOutput.replace(/```json\n?|\n?```/g, "").trim()
    const parsedResult = JSON.parse(cleanJson)

    return Response.json(parsedResult)
  } catch (error) {
    console.error("Error analyzing meal:", error)
    return Response.json(
      { error: "Failed to analyze meal" },
      { status: 500 }
    )
  }
}
