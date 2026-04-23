import { inngest } from "./client"
import { GoogleGenAI } from "@google/genai"
import { logger } from "../utils/logger"

const defaultMemory = () => ({
  userProfile: {
    emotionalState: [] as string[],
    riskLevel: 0,
    preferences: {} as Record<string, unknown>,
  },
  sessionContext: {
    conversationThemes: [] as string[],
    currentTechnique: null as string | null,
  },
})

type TherapyMemory = ReturnType<typeof defaultMemory>

type TherapySessionMessageEventData = {
  message: string
  history?: unknown[]
  memory?: TherapyMemory
  goals?: unknown[]
  systemPrompt?: string
}

type TherapySessionCreatedEventData = {
  notes?: string
  transcript?: string
  sessionId?: string
}

type MoodUpdatedEventData = {
  recentMoods?: unknown
  completedActivities?: unknown
  preferences?: unknown
}

const GEMINI_MODEL = "gemini-2.5-flash"

const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY ?? "",
})

async function geminiGenerateText(prompt: string): Promise<string> {
  const result = await genAI.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
  })
  return (result.text ?? "").trim()
}

// Handles and analyses incoming chat messages
export const processChatMessage = inngest.createFunction(
  {
    id: "process-chat-message",
    triggers: [{ event: "therapy/session.message" }],
  },
  async ({ event, step }) => {
    try {
      const data = event.data as TherapySessionMessageEventData
      const {
        message,
        history,
        memory = defaultMemory(),
        goals = [],
        systemPrompt,
      } = data

      logger.info("Processing chat message:", {
        message,
        historyLength: history?.length,
      })

      // Analyze the message using Gemini
      const analysis = await step.run("analyze-message", async () => {
        try {
          const prompt = `Analyze this therapy message and provide insights. Return ONLY a valid JSON object with no markdown formatting or additional text.
            Message: ${message}
            Context: ${JSON.stringify({ memory, goals })}
            
            Required JSON structure:
            {
              "emotionalState": "string",
              "themes": ["string"],
              "riskLevel": number,
              "recommendedApproach": "string",
              "progressIndicators": ["string"]
            }`

          const text = await geminiGenerateText(prompt)

          logger.info("Received analysis from Gemini:", { text })

          // Clean the response text to ensure it's valid JSON
          const cleanText = text.replace(/```json\n|\n```/g, "").trim()
          const parsedAnalysis = JSON.parse(cleanText)

          logger.info("Successfully parsed analysis:", parsedAnalysis)
          return parsedAnalysis
        } catch (error) {
          logger.error("Error in message analysis:", { error, message })
          // Return a default analysis instead of throwing
          return {
            emotionalState: "neutral",
            themes: [],
            riskLevel: 0,
            recommendedApproach: "supportive",
            progressIndicators: [],
          }
        }
      })

      // Update memory based on analysis
      const updatedMemory = await step.run("update-memory", async () => {
        if (analysis.emotionalState) {
          memory.userProfile.emotionalState.push(analysis.emotionalState)
        }
        if (analysis.themes) {
          memory.sessionContext.conversationThemes.push(...analysis.themes)
        }
        if (analysis.riskLevel) {
          memory.userProfile.riskLevel = analysis.riskLevel
        }
        return memory
      })

      // If high risk is detected, trigger an alert
      if (analysis.riskLevel > 4) {
        await step.run("trigger-risk-alert", async () => {
          logger.warn("High risk level detected in chat message", {
            message,
            riskLevel: analysis.riskLevel,
          })
        })
      }

      // Generate therapeutic response
      const response = await step.run("generate-response", async () => {
        try {
          const prompt = `${systemPrompt ?? ""}
            
            Based on the following context, generate a therapeutic response:
            Message: ${message}
            Analysis: ${JSON.stringify(analysis)}
            Memory: ${JSON.stringify(memory)}
            Goals: ${JSON.stringify(goals)}
            
            Provide a response that:
            1. Addresses the immediate emotional needs
            2. Uses appropriate therapeutic techniques
            3. Shows empathy and understanding
            4. Maintains professional boundaries
            5. Considers safety and well-being`

          const responseText = await geminiGenerateText(prompt)

          logger.info("Generated response:", { responseText })
          return responseText
        } catch (error) {
          logger.error("Error generating response:", { error, message })
          // Return a default response instead of throwing
          return "I'm here to support you. Could you tell me more about what's on your mind?"
        }
      })

      // Return the response in the expected format
      return {
        response,
        analysis,
        updatedMemory,
      }
    } catch (error) {
      const errData = event.data as Partial<TherapySessionMessageEventData>
      logger.error("Error in chat message processing:", {
        error,
        message: errData.message,
      })
      // Return a default response instead of throwing
      return {
        response:
          "I'm here to support you. Could you tell me more about what's on your mind?",
        analysis: {
          emotionalState: "neutral",
          themes: [],
          riskLevel: 0,
          recommendedApproach: "supportive",
          progressIndicators: [],
        },
        updatedMemory: errData.memory,
      }
    }
  }
)

// Function to analyze therapy session content
export const analyzeTherapySession = inngest.createFunction(
  {
    id: "analyze-therapy-session",
    triggers: [{ event: "therapy/session.created" }],
  },
  async ({ event, step }) => {
    try {
      const sessionData = event.data as TherapySessionCreatedEventData
      // Get the session content
      const sessionContent = await step.run("get-session-content", async () => {
        return sessionData.notes || sessionData.transcript
      })

      // Analyze the session using Gemini
      const analysis = await step.run("analyze-with-gemini", async () => {
        const prompt = `Analyze this therapy session and provide insights:
          Session Content: ${sessionContent}
          
          Please provide:
          1. Key themes and topics discussed
          2. Emotional state analysis
          3. Potential areas of concern
          4. Recommendations for follow-up
          5. Progress indicators
          
          Format the response as a JSON object.`

        const text = await geminiGenerateText(prompt)

        return JSON.parse(text)
      })

      // Store the analysis
      await step.run("store-analysis", async () => {
        // Here you would typically store the analysis in your database
        logger.info("Session analysis stored successfully")
        return analysis
      })

      // If there are concerning indicators, trigger an alert
      if (analysis.areasOfConcern?.length > 0) {
        await step.run("trigger-concern-alert", async () => {
          logger.warn("Concerning indicators detected in session analysis", {
            sessionId: sessionData.sessionId,
            concerns: analysis.areasOfConcern,
          })
          // Add your alert logic here
        })
      }

      return {
        message: "Session analysis completed",
        analysis,
      }
    } catch (error) {
      logger.error("Error in therapy session analysis:", error)
      throw error
    }
  }
)

// Function to generate personalized activity recommendations
export const generateActivityRecommendations = inngest.createFunction(
  {
    id: "generate-activity-recommendations",
    triggers: [{ event: "mood/updated" }],
  },
  async ({ event, step }) => {
    try {
      const moodData = event.data as MoodUpdatedEventData
      // Get user's mood history and activity history
      const userContext = await step.run("get-user-context", async () => {
        // Here you would typically fetch user's history from your database
        return {
          recentMoods: moodData.recentMoods,
          completedActivities: moodData.completedActivities,
          preferences: moodData.preferences,
        }
      })

      // Generate recommendations using Gemini
      const recommendations = await step.run(
        "generate-recommendations",
        async () => {
          const prompt = `Based on the following user context, generate personalized activity recommendations:
          User Context: ${JSON.stringify(userContext)}
          
          Please provide:
          1. 3-5 personalized activity recommendations
          2. Reasoning for each recommendation
          3. Expected benefits
          4. Difficulty level
          5. Estimated duration
          
          Format the response as a JSON object.`

          const text = await geminiGenerateText(prompt)

          return JSON.parse(text)
        }
      )

      // Store the recommendations
      await step.run("store-recommendations", async () => {
        // Here you would typically store the recommendations in your database
        logger.info("Activity recommendations stored successfully")
        return recommendations
      })

      return {
        message: "Activity recommendations generated",
        recommendations,
      }
    } catch (error) {
      logger.error("Error generating activity recommendations:", error)
      throw error
    }
  }
)

// Add the functions to the exported array
export const functions = [
  processChatMessage,
  analyzeTherapySession,
  generateActivityRecommendations,
]
