import jwt from 'jsonwebtoken';

const verifyAccessToken = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                timestamp: new Date().toISOString(),
                status: 401,
                error: "Unauthorized",
                message: "인증이 필요합니다.",
                path: req.path
            });
        }

        const token = authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                timestamp: new Date().toISOString(),
                status: 401,
                error: "Unauthorized",
                message: "인증이 필요합니다.",
                path: req.path
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.type !== 'access') {
            return res.status(401).json({
                timestamp: new Date().toISOString(),
                status: 401,
                error: "Unauthorized",
                message: "유효하지 않은 토큰입니다.",
                path: req.path
            });
        }

        // 사용자 정보를 req.user에 저장
        req.user = {
            userId: decoded.userId,
            provider: decoded.provider,
            email: decoded.email,
        };

        next();

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                timestamp: new Date().toISOString(),
                status: 401,
                error: "Unauthorized",
                message: "유효하지 않은 토큰입니다.",
                path: req.path
            });
        } else if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                timestamp: new Date().toISOString(),
                status: 401,
                error: "Unauthorized",
                message: "토큰이 만료되었습니다.",
                path: req.path
            });
        } else {
            console.error('토큰 검증 오류:', error);
            return res.status(500).json({
                timestamp: new Date().toISOString(),
                status: 500,
                error: "Internal Server Error",
                message: "서버 내부에서 처리 중 예상치 못한 오류가 발생했습니다.",
                path: req.path
            });
        }
    }
};

export default {
    verifyAccessToken
};