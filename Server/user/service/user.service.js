import User from '../model/user.model.js';
import Bookmark from '../../bookmark/model/bookmark.model.js';
import Review from '../../review/model/review.model.js';
import RefreshToken from '../../auth/model/refreshToken.model.js';
import { S3Client, DeleteObjectCommand} from '@aws-sdk/client-s3';

// 내 프로필 조회
const getMyProfile = async (userInfo) => {
    const user = await User.findOne({ 
        provider: userInfo.provider, 
        providerId: userInfo.userId,
        status: { $ne: 'deleted' }
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

// 내 프로필 수정
const updateMyProfile = async (userInfo, updateData, uploadedFile) => {
    const user = await User.findOne({ 
        provider: userInfo.provider, 
        providerId: userInfo.userId,
        status: { $ne: 'deleted' }
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

// 특정 사용자의 프로필 조회
const getUserProfile = async (userId) => {
    // MongoDB ObjectId 유효성 검사
    if (!isValidObjectId(userId)) {
        const error = new Error('유효하지 않은 사용자 ID입니다.');
        error.statusCode = 400;
        throw error;
    }

    const user = await User.findOne({
        _id: userId,
        status: { $ne: 'deleted' }
    });

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

// 회원 탈퇴
const deleteUser = async (userInfo, refreshToken) => {
    const user = await User.findOne({ 
        provider: userInfo.provider, 
        providerId: userInfo.userId,
        status: { $ne: 'deleted' }
    });

    if (!user) {
        const error = new Error('사용자를 찾을 수 없습니다.');
        error.statusCode = 404;
        throw error;
    }

    await cleanupUserData(user._id);

    user.status = 'deleted';
    user.updatedAt = new Date();
    await user.save();
    
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

// S3 클라이언트 설정
const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

// S3에서 사용자 이미지 삭제
const deleteUserImagesFromS3 = async (userId) => {
    try {
        const user = await User.findById(userId);
        if (user && user.imageUrl) {
            const s3Key = extractS3KeyFromUrl(user.imageUrl);

            if (s3Key) {
                const deleteCommand = new DeleteObjectCommand({
                    Bucket: process.env.S3_BUCKET_NAME,
                    Key: s3Key
                });

                await s3Client.send(deleteCommand);
                console.log(`S3에서 프로필 이미지 삭제 완료: ${s3Key}`);
            }
        }

        // 사용자가 작성한 리뷰 이미지 삭제
        const userReviews = await Review.find({ userId }, 'imageUrl');
        for (const review of userReviews) {
            if (review.imageUrl) {
                const s3Key = extractS3KeyFromUrl(review.imageUrl);
                if (s3Key) {
                    const deleteCommand = new DeleteObjectCommand({
                        Bucket: process.env.S3_BUCKET_NAME,
                        Key: s3Key
                    });

                    await s3Client.send(deleteCommand);
                    console.log(`S3에서 리뷰 이미지 삭제 완료: ${s3Key}`);
                }
            }
        }

    } catch (error) {
        console.error('S3 이미지 삭제 중 오류:', error);
    }
};

// S3 URL에서 키 추출하는 헬퍼 함수
const extractS3KeyFromUrl = (s3Url) => {
    try {
        const url = new URL(s3Url);
        if (url.hostname.includes('.s3.')) {
            return url.pathname.substring(1);
        }

        return null;

    } catch (error) {
        console.error('S3 URL 파싱 오류:', error);
        return null;
    }
};

// 사용자 관련 데이터 정리
const cleanupUserData = async (userId) => {
    try {
        // 북마크 데이터 정리
        const deletedBookmarks = await Bookmark.deleteMany({ userId });
        console.log(`북마크 ${deletedBookmarks.deletedCount}개 삭제 완료`);

        // 리뷰 데이터 정리
        const deletedReviews = await Review.deleteMany({ userId });
        console.log(`리뷰 ${deletedReviews.deletedCount}개 삭제 완료`);

        // Refresh Token 정리
        const deletedTokens = await RefreshToken.deleteMany({ user_id: userId });
        console.log(`Refresh Token ${deletedTokens.deletedCount}개 삭제 완료`);
        
        // S3에 업로드된 사용자 이미지 삭제
        await deleteUserImagesFromS3(userId);
        
        console.log(`사용자 ${userId}의 관련 데이터 정리 완료`);
        
    } catch (error) {
        console.error('사용자 데이터 정리 중 오류:', error);
        // 데이터 정리 실패해도 회원탈퇴는 진행
    }
};

export default {
    getMyProfile,
    updateMyProfile,
    getUserProfile,
    deleteUser
};