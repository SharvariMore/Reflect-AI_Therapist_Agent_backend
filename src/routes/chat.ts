import express from "express";
import {
  createChatSession,
  getAllChatSessions,
  getChatSession,
  sendMessage,
  getChatHistory,
} from "../controllers/chatController";
import { auth } from "../middleware/auth";

const router = express.Router();

// Apply auth middleware to all routes
router.use(auth);

// Create a new chat session
router.post("/sessions", createChatSession);

// List all chat sessions for the authenticated user (must be before :sessionId)
router.get("/sessions", getAllChatSessions);

// Get a specific chat session
router.get("/sessions/:sessionId", getChatSession);

// Send a message in a chat session
router.post("/sessions/:sessionId/messages", sendMessage);

// Get chat history for a session
router.get("/sessions/:sessionId/history", getChatHistory);

export default router;
