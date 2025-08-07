import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  nickname: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  provider: String,
  status: String,
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);

// const existingUser = await User.findOne({ email: "test@example.com" });

// if (!existingUser) {
//   await User.create({
//     nickname: "test",
//     email: "test@example.com",
//     provider: "local",
//   });
// }

export default User;
