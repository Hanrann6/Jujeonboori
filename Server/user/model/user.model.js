import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  nickname: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  provider: { type: String, required: true },
  status: { 
    type: String, 
    default: 'active'
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },

  providerId: { type: String, required: true },
  imageUrl: { type: String, default: null },
  refreshToken: { type: String, default: null },
}, {
  timestamps: true
});

userSchema.index({ provider: 1, providerId: 1 }, { unique: true });

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