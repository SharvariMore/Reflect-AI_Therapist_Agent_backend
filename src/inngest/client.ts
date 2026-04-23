import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "AI_Therapist_Agent",
  isDev: process.env.NODE_ENV !== "production",
});