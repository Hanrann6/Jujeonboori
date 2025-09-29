import jwt, { decode } from 'jsonwebtoken';
import RefreshToken from '../model/refreshToken.model.js';
import User from '../../user/model/user.model.js';

const OAUTH_CONFIG = {
    google: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        redirectUri: process.env.GOOGLE_REDIRECT_URI,
        scope: 'openid email profile',
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo'
    },
    kakao: {
        userInfoUrl: 'https://kapi.kakao.com/v2/user/me'
    }
};

const generateOAuthUrl = async (provider) => {
    if (provider !== 'google') {
        throw new Error(`${provider}는 OAuth URL 생성을 지원하지 않습니다.`);
    }

    const config = OAUTH_CONFIG[provider];
    const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        response_type: 'code',
        scope: config.scope,
    });

    const oauthUrl = `${config.authUrl}?${params.toString()}`;
    
    return oauthUrl;
};

const exchangeCodeForToken = async (provider, authorizationCode, redirectUri) => {
    if (provider !== 'google') {
        throw new Error(`${provider}는 토큰 교환을 지원하지 않습니다.`);
    }

    const config = OAUTH_CONFIG[provider];

    try {
        const tokenEndpoint = 'https://oauth2.googleapis.com/token';

        const tokenRequestData = {
            grant_type: 'authorization_code',
            client_id: config.clientId,
            client_secret: config.clientSecret,
            code: authorizationCode,
            redirect_uri: redirectUri,
        };

        const response = await fetch(tokenEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            body: new URLSearchParams(tokenRequestData)
        });

        const tokenResponse = await response.json();

        if (!response.ok) {
            console.error(`${provider} 토큰 교환 실패:`, tokenResponse);

            if (tokenResponse.error === 'invalid_grant') {
                throw new Error('인가 코드가 유효하지 않거나 만료되었습니다.');
            } else if (tokenResponse.error === 'invalid_client') {
                throw new Error('클라이언트 인증에 실패했습니다.');
            } else {
                throw new Error(`${provider} 서버와 통신 중 오류가 발생했습니다.`);
            }
        }

        if (!tokenResponse.access_token) {
            throw new Error(`${provider}에서 access_token을 받지 못했습니다.`);
        }

        return {
            access_token: tokenResponse.access_token,
            refresh_token: tokenResponse.refresh_token,
            expires_in: tokenResponse.expires_in,
            token_type: tokenResponse.token_type || 'Bearer'
        };

    } catch (error) {
        if (error.message.includes('fetch')) {
            throw new Error(`${provider} 서버와 통신 중 오류가 발생했습니다.`);
        }

        throw error;
    }
};

const getUserInfo = async (provider, accessToken) => {
    const config = OAUTH_CONFIG[provider];

    try {
        const response = await fetch(config.userInfoUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`${provider} 사용자 정보 조회 실패: ${response.status}`);
        }

        const userInfo = await response.json();

        let standardUserInfo;

        if (provider === 'google') {
            standardUserInfo = {
                providerId: userInfo.id,
                provider: 'google',
                email: userInfo.email,
                isEmailVerified: userInfo.verified_email || false
            };
        } else if (provider === 'kakao') {
            const kakaoAccount = userInfo.kakao_account || {};

            standardUserInfo = {
                providerId: userInfo.id.toString(),
                provider: 'kakao',
                email: kakaoAccount.email,
                isEmailVerified: kakaoAccount.is_email_verified || false
            };
        }

        return standardUserInfo;

    } catch (error) {
        if (error.message.includes('fetch') || error.message.includes('network')) {
            throw new Error(`${provider} 서버와 통신 중 오류가 발생했습니다.`);
        }
        
        throw error;
    }
};

const saveRefreshTokenToDB = async (userId, provider, token) => {
    try {
        // 만료 시간 계산 (14일 후)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 14);

        await RefreshToken.findOneAndUpdate(
            { user_id: userId, provider: provider},
            {
                token: token,
                expires_at: expiresAt,
                created_at: new Date()
            },
            {
                upsert: true,
                new: true
            }
        );

        console.log(`Refresh token 저장 완료: ${userId} (${provider})`);
    } catch (error) {
        console.error('Refresh token 저장 중 오류:', error);
        throw new Error('토큰 저장에 실패했습니다.');
    }
};

const checkRefreshTokenInDB = async (userId, provider, token) => {
    try {
        const refreshTokenDoc = await RefreshToken.findOne({
            user_id: userId,
            provider: provider,
            token: token
        });

        return refreshTokenDoc !== null;
    } catch (error) {
        console.error('Refresh token 조회 중 오류:', error);
        return false;
    }
};

const removeRefreshTokenFromDB = async (userId, provider) => {
    try {
        await RefreshToken.deleteOne({
            user_id: userId,
            provider: provider
        });

        console.log(`Refresh token 삭제 완료: ${userId} (${provider})`);
    } catch (error) {
        console.error('Refresh token 삭제 중 오류:', error);
        throw new Error('토큰 삭제에 실패했습니다.');
    }
};

const generateAppTokens = async (userInfo) => {
    try {
        const accessTokenPayload = {
            userId: userInfo.userId,
            provider: userInfo.provider,
            type: 'access'
        };

        const refreshTokenPayload = {
            userId: userInfo.userId,
            provider: userInfo.provider,
            type: 'refresh'
        };

        const accessToken = jwt.sign(
            accessTokenPayload,
            process.env.JWT_SECRET,
            {
                expiresIn: process.env.JWT_ACCESS_EXPIRES_IN,
                issuer: process.env.JWT_ISSUER,
                audience: process.env.JWT_AUDIENCE
            }
        );

        const refreshToken = jwt.sign(
            refreshTokenPayload,
            process.env.JWT_REFRESH_SECRET,
            {
                expiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
                issuer: process.env.JWT_ISSUER,
                audience: process.env.JWT_AUDIENCE
            }
        );

        // Refresh token을 DB에 저장
        await saveRefreshTokenToDB(userInfo.userId, userInfo.provider, refreshToken);

        return {
            accessToken,
            refreshToken
        };

    } catch (error) {
        console.error('JWT 토큰 생성 오류:', error);
        throw new Error('토큰 생성 중 오류가 발생했습니다.');
    }
};

const processOAuthLogin = async (provider, accessToken) => {
    try {
        const oauthUserInfo = await getUserInfo(provider, accessToken);

        let user = await User.findOne({
            provider: oauthUserInfo.provider,
            providerId: oauthUserInfo.providerId
        });

        let isNewUser = false;

        // 신규 사용자면 생성
        if (!user) {
            user = await User.create({
                email: oauthUserInfo.email,
                provider: oauthUserInfo.provider,
                providerId: oauthUserInfo.providerId,
                nickname: null, // 이후에 설정
                imageUrl: null
            });
            isNewUser = true;
        }

        const tokens = await generateAppTokens({
            userId: user._id,
            provider: user.provider,
        });

        return {
            grant_type: "Bearer",
            access_token: tokens.accessToken,
            refresh_token: tokens.refreshToken,
            access_token_expires_in: 3600,
            user: {
                user_id: user._id,
                email: user.email,
                nickname: user.nickname,
                image_url: user.imageUrl
            },
            is_new_user: isNewUser
        };
    } catch (error) {
        console.error('OAuth 로그인 처리 오류:', error);
        throw error;
    }
}

const reissueTokens = async (refreshToken) => {
    try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

        if (decoded.type !== 'refresh') {
            throw new Error('올바르지 않은 토큰 타입입니다.');
        }

        // DB에서 refresh token 존재 여부 확인
        const isValidRefreshToken = await checkRefreshTokenInDB(decoded.userId, decoded.provider, refreshToken);
        if (!isValidRefreshToken) {
            throw new Error('유효하지 않은 refresh token입니다.');
        }

        const newTokens = await generateAppTokens({
            userId: decoded.userId,
            provider: decoded.provider,
        });

        return newTokens;

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            throw new Error('유효하지 않은 refresh token입니다.');
        } else if (error.name === 'TokenExpiredError') {
            throw new Error('refresh token이 만료되었습니다.');
        }

        throw error;
    }
};

const revokeTokens = async (accessToken, refreshToken) => {
    try {
        const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);

        if (decoded.type !== 'access') {
            throw new Error('올바르지 않은 access token입니다.');
        }

        const refreshDecoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

        if (refreshDecoded.type !== 'refresh') {
            throw new Error('올바르지 않은 refresh token입니다.');
        }

        if (decoded.userId !== refreshDecoded.userId) {
            throw new Error('토큰이 일치하지 않습니다.');
        }

        // DB에서 refresh token 삭제
        await removeRefreshTokenFromDB(decoded.userId, decoded.provider);

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            throw new Error('유효하지 않은 토큰입니다.');
        } else if (error.name === 'TokenExpiredError') {
            throw new Error('만료된 토큰입니다.');
        }

        throw error;
    }
};

export default {
    generateOAuthUrl,
    exchangeCodeForToken,
    getUserInfo,
    generateAppTokens,
    processOAuthLogin,
    reissueTokens,
    revokeTokens
};