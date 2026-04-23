//Handle user registration, login, and logout
import { Request, Response } from "express"
import { User } from "../models/User"
import { Session } from "../models/Session"
import bcrypt from "bcrypt" //one-way encryption for converting password into fixed-length string of characters called hash that is irreversible
import jwt from "jsonwebtoken" //JSON Web Tokens for secure authentication and data transmission

export const register = async (req: Request, res: Response) => {
  const { name, email, password } = req.body
  if (!name || !email || !password) {
    return res
      .status(400)
      .json({ message: "Name, Email, and Password are Required!" })
  }
  try {
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(409).json({ message: "Email Already in Use!" })
    }
    const hashedPassword = await bcrypt.hash(password, 10) //10 is the number of salt rounds

    // Create user
    const user = new User({ name, email, password: hashedPassword })

    // Save user to database
    await user.save()

    // Respond
    res.status(201).json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
      },
      message: "User Registered Successfully!",
    })
  } catch (error) {
    res.status(500).json({ message: "Server Error!", error })
  }
}

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    // Validate input
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and Password are Required!" })
    }

    // Find user with the provided email
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(401).json({ message: "Invalid Email or Password!" })
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid Email or Password!" })
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not set")
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    )

    // Create session
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24) // 24 hours from now

    const session = new Session({
      userId: user._id,
      token,
      expiresAt,
      deviceInfo: req.headers["user-agent"],
    })
    await session.save()

    // Respond with user data and token
    res.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
      },
      token,
      message: "Login successful!",
    })
  } catch (error) {
    res.status(500).json({ message: "Server error!", error })
  }
}

export const logout = async (req: Request, res: Response) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "") //Extract JWT from the Authorization header of incoming request
    if (token) {
      await Session.deleteOne({ token }) //Delete the session from the database using the token to invalidate the user's session so that token cannot be used again for authentication
    }
    res.json({ message: "Logged Out Successfully!" })
  } catch (error) {
    res.status(500).json({ message: "Server Error!", error })
  }
}
