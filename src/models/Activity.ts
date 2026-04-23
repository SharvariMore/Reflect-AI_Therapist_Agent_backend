
import mongoose, { Document, Schema } from "mongoose";

//Interface for Activity log entry
export interface IActivity extends Document {
  userId: mongoose.Types.ObjectId;  //Uses ID to connect specific user type to their activities
  type: string;
  name: string;
  description?: string;
  duration?: number;  //Time spent on the activity
  timestamp: Date;
}

const activitySchema = new Schema<IActivity>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      //Enum is used to restrict the values that can be assigned to the field to a predefined list of values
      enum: [
        "meditation",
        "exercise",
        "walking",
        "reading",
        "journaling",
        "therapy",
      ],
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    duration: {
      type: Number,
      min: 0,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// CompoundIndex for optimising querying for user activities over time
activitySchema.index({ userId: 1, timestamp: -1 });

export const Activity = mongoose.model<IActivity>("Activity", activitySchema);
