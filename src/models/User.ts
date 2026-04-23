import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
    name: string;
    email: string;
    password: string;
}

//Strong type checking
const UserSchema = new Schema<IUser>({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },  //2 users cannot have the same email
    password: { type: String, required: true },
},
{ timestamps: true } //CreatedAt and UpdatedAt fields
)

//Compile the schema into a model to interact with user collection in MongoDB
export const User = mongoose.model<IUser>("User", UserSchema)