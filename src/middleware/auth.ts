//Middlewares are checkpoints for application flow for handling incoming request and outgoing response
//Helps continue next steps or stop processing if authentication fails used in user authentication and authorization, recording activities and logging errors
//Middleware are handlers that system activates sequentially for each incoming request

import { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken"
import { User } from "../models/User"

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: any
    }
  }
}

//Next function is used to pass control to the next middleware function
export const auth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "") //Extract security token from request

    if (!token) {
      return res.status(401).json({ message: "Authentication Required!" }) //Unauthorized access response
    }

    //Token is decrypted and verified using the secret key
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key"
    ) as any
    const user = await User.findById(decoded.userId) //Find the user in the database using the user ID

    if (!user) {
      return res.status(401).json({ message: "User Not Found!" })
    }

    //Check for active session in the database
    req.user = user
    next()
  } catch (error) {
    res.status(401).json({ message: "Invalid Authentication Token!" })
  }
}
