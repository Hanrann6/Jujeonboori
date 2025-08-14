import User from '../model/user.model.js';
import Bookmark from '../../bookmark/model/bookmark.model.js';

const getMyProfile = async (userInfo) => {
    // userInfo: { userId, provider, email, name } from JWT
    const user = await User.findOne({ 
        provider: userInfo.provider, 
        providerId: userInfo.userId 
    });

    if (!user) {
        const error = new Error('사용자를 찾을 수 없습니다.');
        error.statusCode = 404;
        throw error;
    }

    return {
        user_id: user._id,
        email: user.email,
        nickname: user.nickname,
        image_url: user.imageUrl
    };
};

const updateMyProfile = async (userInfo, updateData, uploadedFile) => {
    const user = await User.findOne({ 
        provider: userInfo.provider, 
        providerId: userInfo.userId 
    });

    if (!user) {
        const error = new Error('사용자를 찾을 수 없습니다.');
        error.statusCode = 404;
        throw error;
    }

    const fieldsToUpdate = {};

    if (updateData.nickname) {
        await validateNickname(updateData.nickname, user._id);
        fieldsToUpdate.nickname = updateData.nickname;
    }

    if (uploadedFile) {
        fieldsToUpdate.imageUrl = await processImageUpload(uploadedFile);
    }

    if (Object.keys(fieldsToUpdate).length === 0) {
        const error = new Error('수정할 정보가 없습니다.');
        error.statusCode = 400;
        throw error;
    }

    Object.assign(user, fieldsToUpdate);
    user.updatedAt = new Date();
    await user.save();

    return {
        user_id: user._id,
        email: user.email,
        nickname: user.nickname,
        image_url: user.imageUrl
    };
};

const getUserProfile = async (userId) => {
    // MongoDB ObjectId 유효성 검사
    if (!isValidObjectId(userId)) {
        const error = new Error('유효하지 않은 사용자 ID입니다.');
        error.statusCode = 400;
        throw error;
    }

    const user = await User.findById(userId);

    if (!user) {
        const error = new Error('해당 ID의 사용자를 찾을 수 없습니다.');
        error.statusCode = 404;
        throw error;
    }

    return {
        user_id: user._id,
        nickname: user.nickname,
        image_url: user.imageUrl
    };
};

const deleteUser = async (userInfo, refreshToken) => {
    const user = await User.findOne({ 
        provider: userInfo.provider, 
        providerId: userInfo.userId 
    });

    if (!user) {
        const error = new Error('사용자를 찾을 수 없습니다.');
        error.statusCode = 404;
        throw error;
    }

    await cleanupUserData(user._id);

    await User.findByIdAndDelete(user._id);

    return true;
};

// 닉네임 중복 검사
const validateNickname = async (nickname, currentUserId) => {
    const existingUser = await User.findOne({ 
        nickname: nickname,
        _id: { $ne: currentUserId }
    });

    if (existingUser) {
        const error = new Error('이미 사용 중인 닉네임입니다.');
        error.statusCode = 400;
        throw error;
    }
};

// 이미지 업로드 처리 (S3)
const processImageUpload = async (file) => {
    try {
        if (!file.location) {
            throw new Error('S3 업로드 실패: 파일 URL을 받지 못했습니다.');
        }

        validateImageFile(file);

        return file.location;
        
    } catch (error) {
        console.error('S3 업로드 오류:', error);
        const uploadError = new Error('이미지 업로드에 실패했습니다.');
        uploadError.statusCode = 500;
        throw uploadError;
    }
};

// 이미지 파일 검증 (S3용)
const validateImageFile = (file) => {
    const allowedTypes = ['image/jpeg', 'image/png'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.mimetype)) {
        const error = new Error('지원하지 않는 이미지 형식입니다. (JPEG, PNG만 가능)');
        error.statusCode = 400;
        throw error;
    }

    if (file.size > maxSize) {
        const error = new Error('이미지 크기는 5MB 이하여야 합니다.');
        error.statusCode = 400;
        throw error;
    }
};

// MongoDB ObjectId 유효성 검사
const isValidObjectId = (id) => {
    return /^[0-9a-fA-F]{24}$/.test(id);
};

// 사용자 관련 데이터 정리
const cleanupUserData = async (userId) => {
    try {
        // 북마크 데이터 정리
        const deletedBookmarks = await Bookmark.deleteMany({ userId });
        console.log(`북마크 ${deletedBookmarks.deletedCount}개 삭제 완료`);

        // TODO: 리뷰 데이터 정리
        // await Review.deleteMany({ userId });
        
        // TODO: S3에 업로드된 사용자 이미지 삭제
        // await deleteUserImagesFromS3(userId);
        
        // TODO: 기타 사용자 관련 데이터
        // await UserActivity.deleteMany({ userId });
        // await UserPreference.deleteMany({ userId });
        
        console.log(`사용자 ${userId}의 관련 데이터 정리 완료`);
        
    } catch (error) {
        console.error('사용자 데이터 정리 중 오류:', error);
        // 데이터 정리 실패해도 회원탈퇴는 진행
        // 관리자가 수동으로 정리할 수 있도록 로그만 남김
    }
};

export default {
    getMyProfile,
    updateMyProfile,
    getUserProfile,
    deleteUser
};