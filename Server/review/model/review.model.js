import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
  author: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  alcohol: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Alcohol', 
    required: true
  },
  
  rating: { 
    type: Number, 
    required: true,
    min: 1,
    max: 5
  },
  content: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 1000 // 내용 길이 제한
  },
  
  imageUrl: { 
    type: String, 
    default: null 
  },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

reviewSchema.index({ alcohol: 1, createdAt: -1 });

reviewSchema.index({ author: 1, createdAt: -1 });

// 중복 리뷰 방지 (한 사용자가 같은 전통주에 리뷰 여러 개 작성 가능하게 할지)
reviewSchema.index({ author: 1, alcohol: 1 }, { unique: true });

const Review = mongoose.model("Review", reviewSchema);

export default Review;