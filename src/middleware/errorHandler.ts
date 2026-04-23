import { Request, Response, NextFunction } from "express"
import { logger } from "../utils/logger"

//Custom errors class for handling application errors that carry extra information about the error 
export class AppError extends Error {
  statusCode: number
  status: string
  isOperational: boolean

  constructor(message: string, statusCode: number) {
    super(message)
    this.statusCode = statusCode
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error"
    this.isOperational = true

    Error.captureStackTrace(this, this.constructor)
  }
}

//Centralized error handling middleware as it accepts 4 arguments
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  //Check if the error is an instance of custom error class it means its expected operational error
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    })
  }

  // Log unexpected errors
  logger.error("Unexpected error:", err)

  // Send generic error for unexpected errors and prevents exposing sensitive information
  return res.status(500).json({
    status: "error",
    message: "Something Went Wrong!",
  })
}

//If error is not an instance of custom error class or AppError it means its unexpected error like programming bug or system issue
