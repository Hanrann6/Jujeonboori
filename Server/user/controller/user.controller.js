import userService from '../service/user.service.js';

const getMyProfile = async (req, res) => {
    try {
        const profile = await userService.getMyProfile(req.user);
        
        res.status(200).json(profile);

    } catch (error) {
        console.error('내 프로필 조회 오류:', error);
        
        if (error.statusCode) {
            const errorResponse = {
                timestamp: new Date().toISOString(),
                status: error.statusCode,
                error: error.statusCode === 404 ? "Not Found" : "Bad Request",
                message: error.message,
                path: req.path
            };
            return res.status(error.statusCode).json(errorResponse);
        }

        res.status(500).json({
            timestamp: new Date().toISOString(),
            status: 500,
            error: "Internal Server Error",
            message: "서버 내부에서 처리 중 예상치 못한 오류가 발생했습니다.",
            path: req.path
        });
    }
};

const updateMyProfile = async (req, res) => {
    try {
        const updatedProfile = await userService.updateMyProfile(
            req.user,
            req.body,
            req.file
        );
        
        res.status(200).json(updatedProfile);

    } catch (error) {
        console.error('프로필 수정 오류:', error);
        
        if (error.statusCode) {
            const errorType = error.statusCode === 404 ? "Not Found" : "Bad Request";
            const errorResponse = {
                timestamp: new Date().toISOString(),
                status: error.statusCode,
                error: errorType,
                message: error.message,
                path: req.path
            };
            return res.status(error.statusCode).json(errorResponse);
        }

        res.status(500).json({
            timestamp: new Date().toISOString(),
            status: 500,
            error: "Internal Server Error",
            message: "서버 내부에서 처리 중 예상치 못한 오류가 발생했습니다.",
            path: req.path
        });
    }
};

const getUserProfile = async (req, res) => {
    try {
        const { user_id } = req.params;
        
        const profile = await userService.getUserProfile(user_id);
        
        res.status(200).json(profile);

    } catch (error) {
        console.error('사용자 프로필 조회 오류:', error);
        
        if (error.statusCode) {
            let errorType;
            if (error.statusCode === 404) {
                errorType = "Not Found";
            } else if (error.statusCode === 400) {
                errorType = "Bad Request";
            } else {
                errorType = "Error";
            }

            const errorResponse = {
                timestamp: new Date().toISOString(),
                status: error.statusCode,
                error: errorType,
                message: error.message,
                path: req.path
            };
            return res.status(error.statusCode).json(errorResponse);
        }

        res.status(500).json({
            timestamp: new Date().toISOString(),
            status: 500,
            error: "Internal Server Error",
            message: "서버 내부에서 처리 중 예상치 못한 오류가 발생했습니다.",
            path: req.path
        });
    }
};

const deleteUser = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                timestamp: new Date().toISOString(),
                status: 400,
                error: "Bad Request",
                message: "refreshToken이 필요합니다.",
                path: req.path
            });
        }

        await userService.deleteUser(req.user, refreshToken);
        
        res.status(204).send();

    } catch (error) {
        console.error('회원 탈퇴 오류:', error);
        
        if (error.statusCode) {
            let errorType;
            if (error.statusCode === 404) {
                errorType = "Not Found";
            } else if (error.statusCode === 401) {
                errorType = "Unauthorized";
            } else {
                errorType = "Bad Request";
            }

            const errorResponse = {
                timestamp: new Date().toISOString(),
                status: error.statusCode,
                error: errorType,
                message: error.message,
                path: req.path
            };
            return res.status(error.statusCode).json(errorResponse);
        }

        res.status(500).json({
            timestamp: new Date().toISOString(),
            status: 500,
            error: "Internal Server Error",
            message: "회원 탈퇴 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
            path: req.path
        });
    }
};

export default {
    getMyProfile,
    updateMyProfile,
    getUserProfile,
    deleteUser
};