import dotenv from "dotenv"
dotenv.config()

const express = require("express")
import { Request, Response } from "express"
import { serve } from "inngest/express"
import { inngest } from "./inngest/client"
import { functions as inngestFunctions } from "./inngest/functions"
import { logger } from "./utils/logger"
import { connectDB } from "./utils/db"
import cors from "cors"
import helmet from "helmet"
import morgan from "morgan"
import { errorHandler } from "./middleware/errorHandler"
import authRouter from "./routes/auth"
import chatRouter from "./routes/chat"
import moodRouter from "./routes/mood"
import activityRouter from "./routes/activity"

const app = express()

const PORT = process.env.PORT || 3001

app.use(express.json())
app.use(helmet()) // Security headers for protect against common web vulnerabilities like cross-site scripting (XSS), clickjacking, etc.
app.use(cors()) // Permits requests from specific frontend domains to connect to backend
app.use(morgan("dev")) // HTTP request logger and dev is short for development mode used in color coded format to make it more readable

app.use("/api/inngest", serve({ client: inngest, functions: inngestFunctions }))

app.get("/api/chat", (req: Request, res: Response) => {
  res.send("Server is running")
})

app.get("/", (req: Request, res: Response) => {
  res.send("Hello World")
})

// app.listen(PORT, () => {
//     console.log(`Server is running on port ${PORT}`);
// });

app.use("/api/auth", authRouter)
app.use("/api/chat", chatRouter)
app.use("/api/mood", moodRouter)
app.use("/api/activity", activityRouter)

app.use(errorHandler)

const startServer = async () => {
  try {
    await connectDB()
    const PORT = process.env.PORT || 3001
    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`)
      logger.info(
        `Inngest endpoint available at http://localhost:${PORT}/api/inngest`
      )
    })
  } catch (error) {
    logger.error("Failed to start server:", error) //Log the error
    process.exit(1) //Exit the process with a failure code
  }
}

startServer()
