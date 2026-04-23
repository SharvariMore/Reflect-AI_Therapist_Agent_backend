//manage user sessions and authentication tokens
import mongoose, { Document, Schema } from "mongoose";

//Establish relationship between Session and User
export interface ISession extends Document {
  userId: mongoose.Types.ObjectId;
  token: string;
  expiresAt: Date;
  deviceInfo?: string;
  lastActive: Date;
}

const SessionSchema = new Schema<ISession>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    token: { type: String, required: true, unique: true },  //unique to avoid collisions
    expiresAt: { type: Date, required: true },  //security
    deviceInfo: { type: String },
    lastActive: { type: Date, default: Date.now },  //default to current date and time
  },
  { timestamps: true }
);

// Index for automatic cleanup of expired sessions, 0 automatically deletes documents from specified collection from the session collection
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Session = mongoose.model<ISession>("Session", SessionSchema);