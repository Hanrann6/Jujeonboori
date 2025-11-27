// models/ChatLog.js
import mongoose from "mongoose";

const chatLogSchema = new mongoose.Schema({
  userId: { type: String, required: true }, // 사용자 식별자 (로그인 없으면 sessionId 등)
  question: { type: String, required: true },
  answer: { type: [mongoose.Schema.Types.Mixed], required: true },
  createdAt: { type: Date, default: Date.now },
});

const ChatLog = mongoose.model("ChatLog", chatLogSchema);
export default ChatLog;
