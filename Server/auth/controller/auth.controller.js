import oauthService from '../service/oauth.service.js'

// GET /oauth/{provider} - OAuth 인증 URL 생성
const getOAuthUrl = async (req, res) => {
    try {
        const { provider } = req.params;
        const { code_challenge, code_challenge_method } = req.query;

        if (!code_challenge) {
            return res.status(400).json({
                timestamp: new Date().toISOString(),
                status: 400,
                error: "Bad Request",
                message: "필수 쿼리 파라미터가 누락되었습니다: code_challenge",
                path: req.path
            });
        }

        if (!code_challenge_method) {
            return res.status(400).json({
                timestamp: new Date().toISOString(),
                status: 400,
                error: "Bad Request",
                message: "필수 쿼리 파라미터가 누락되었습니다: code_challenge_method",
                path: req.path
            });
        }

        const redirectUrl = await oauthService.generateOAuthUrl(provider, code_challenge, code_challenge_method);

        res.status(200).json({
            redirect_url: redirectUrl
        });

    } catch (error) {
        console.error('OAuth URL 생성 오류:', error);

        res.status(500).json({
            timestamp: new Date().toISOString(),
            status: 500,
            error: "Internal Server Error",
            message: "서버 내부에서 처리 중 예상치 못한 오류가 발생했습니다.",
            path: req.path
        });
    }
};

// POST /oauth/login/{provider} - OAuth 로그인 처리
const handleOAuthLogin = async (req, res) => {
    try {
        const { provider } = req.params;
        const { authorization_code, code_verifier, redirect_uri } = req.body;

        if (!authorization_code) {
            return res.status(400).json({
                timestamp: new Date().toISOString(),
                status: 400,
                error: "Bad Request",
                message: "요청 본문에 필수 파라미터가 누락되었습니다: authorization_code",
                path: req.path
            });
        }

        if (!code_verifier) {
            return res.status(400).json({
                timestamp: new Date().toISOString(),
                status: 400,
                error: "Bad Request",
                message: "요청 본문에 필수 파라미터가 누락되었습니다: code_verifier",
                path: req.path
            });
        }

        if (!redirect_uri) {
            return res.status(400).json({
                timestamp: new Date().toISOString(),
                status: 400,
                error: "Bad Request",
                message: "요청 본문에 필수 파라미터가 누락되었습니다: redirect_uri",
                path: req.path
            });
        }

        // OAuth 토큰 교환 처리
        const tokenData = await oauthService.exchangeCodeForToken(provider, authorization_code, code_verifier, redirect_uri);
        const userInfo = await oauthService.getUserInfo(provider, tokenData.access_token);

        // TODO: 실제 JWT 생성 로직 구현 필요
        const appTokens = await oauthService.generateAppTokens(userInfo);

        res.status(200).json({
            grant_type: "Bearer",
            access_token: appTokens.accessToken,
            refresh_token: appTokens.refreshToken,
            access_token_expires_in: 3600 // 1시간
        });

    } catch (error) {
        console.error('OAuth 로그인 처리 오류:', error);
        res.status(401).json({
            timestamp: new Date().toISOString(),
            status: 401,
            error: "Unauthorized",
            message: "OAuth 인증에 실패했습니다. 다시 시도해주세요.",
            path: req.path
        });
    }
};

// POST /oauth/reissue - 토큰 재발급
const reissueToken = async (req, res) => {
    try {
        // Authorization 헤더에서 refresh token 추출
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(400).json({
                timestamp: new Date().toISOString(),
                status: 400,
                error: "Bad Request",
                message: "Authorization 헤더에 Bearer 토큰이 없습니다.",
                path: req.path
            });
        }

        const refreshToken = authHeader.split(' ')[1];

        if (!refreshToken) {
            return res.status(400).json({
                timestamp: new Date().toISOString(),
                status: 400,
                error: "Bad Request",
                message: "Authorization 헤더에서 refresh token이 누락되었습니다.",
                path: req.path
            });
        }

        // 토큰 재발급 처리
        const newTokens = await oauthService.reissueTokens(refreshToken);

        res.status(200).json({
            grant_type: "Bearer",
            access_token: newTokens.accessToken,
            refresh_token: newTokens.refreshToken
        });
    } catch (error) {
        console.error('토큰 재발급 오류:', error);

        res.status(401).json({
            timestamp: new Date().toISOString(),
            status: 401,
            error: "Unauthorized",
            message: "리프레시 토큰이 유효하지 않습니다. 다시 로그인해주세요.",
            path: req.path
        });
    }
};

// POST /oauth/logout - 로그아웃
const logout = async (req, res) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                timestamp: new Date().toISOString(),
                status: 401,
                error: "Unauthorized",
                message: "인증되지 않은 사용자입니다. 유효한 액세스 토큰이 필요합니다.",
                path: req.path
            });
        }

        const accessToken = authHeader.split(' ')[1];

        // Request Body에서 refresh token 추출
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                timestamp: new Date().toISOString(),
                status: 400,
                error: "Bad Request",
                message: "요청 본문에 'refresh_token'이 누락되었습니다.",
                path: req.path
            });
        }

        // 로그아웃 처리
        await oauthService.revokeTokens(accessToken, refreshToken);

        res.status(200).json({
            message: "성공적으로 로그아웃되었습니다."
        });

    } catch (error) {
        console.error('로그아웃 오류:', error);
        res.status(500).json({
            timestamp: new Date().toISOString(),
            status: 500,
            error: "Internal Server Error",
            message: "서버 내부에서 처리 중 예상치 못한 오류가 발생했습니다.",
            path: req.path
        });
    }
};

export default {
    getOAuthUrl,
    handleOAuthLogin,
    reissueToken,
    logout
};