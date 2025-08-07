import mongoose from "mongoose";

const bookmarkSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId, // 또는 String
    required: true,
    ref: "User", // user model 참조
  },
  alcoholId: {
    type: mongoose.Schema.Types.ObjectId, // 또는 String
    required: true,
    ref: "Alcohol", // 전통주 model 참조
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Bookmark = mongoose.model("Bookmark", bookmarkSchema);
export default Bookmark;
