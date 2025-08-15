import mongoose from 'mongoose';

const refreshTokenSchema = new mongoose.Schema({
    user_id: { 
        type: String, 
        required: true,
        index: true 
    },
    token: { 
        type: String, 
        required: true,
        unique: true 
    },
    provider: { 
        type: String, 
        required: true,
        enum: ['google', 'kakao']
    },
    expires_at: { 
        type: Date, 
        required: true,
        index: { expireAfterSeconds: 0 } // MongoDB에서 자동 삭제
    },
    created_at: { 
        type: Date, 
        default: Date.now 
    }
});

// 복합 인덱스: 사용자당 하나의 활성 토큰만 유지
refreshTokenSchema.index({ user_id: 1, provider: 1 }, { unique: true });

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);

export default RefreshToken;