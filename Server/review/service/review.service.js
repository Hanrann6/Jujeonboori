import Review from '../model/review.model.js';
import User from '../../user/model/user.model.js';
import Alcohol from '../../alcohol/model/alcohol.model.js';

const createReview = async (userInfo, alcoholId, reviewData, uploadedFile) => {
    try {
        const alcohol = await Alcohol.findOne({ index: parseInt(alcoholId) });
        if (!alcohol) {
            const error = new Error('해당 ID의 전통주를 찾을 수 없습니다.');
            error.statusCode = 404;
            throw error;
        }

        const user = await User.findById(userInfo.userId);
        if (!user) {
            const error = new Error('사용자를 찾을 수 없습니다.');
            error.statusCode = 404;
            throw error;
        }

        // 중복 리뷰 검증
        const existingReview = await Review.findOne({
            author: user._id,
            alcohol: alcohol._id
        });
        
        if (existingReview) {
            const error = new Error('이미 이 전통주에 대한 리뷰를 작성하셨습니다. 기존 리뷰를 수정해주세요.');
            error.statusCode = 409;
            error.existingReviewId = existingReview._id; // 기존 리뷰 ID 반환
            throw error;
        }

        // 필수 필드 검증
        const { rating, content } = reviewData;
        
        if (!rating || rating < 1 || rating > 5) {
            const error = new Error('별점(rating)은 1-5 사이의 값이어야 합니다.');
            error.statusCode = 400;
            throw error;
        }

        if (!content || content.trim().length === 0) {
            const error = new Error('내용은 필수 입력 항목입니다.');
            error.statusCode = 400;
            throw error;
        }

        const newReviewData = {
            author: user._id,
            alcohol: alcohol._id,
            rating: parseInt(rating),
            content: content.trim()
        };

        if (uploadedFile) {
            newReviewData.imageUrl = await processImageUpload(uploadedFile);
        }

        const review = new Review(newReviewData);
        await review.save();

        // 생성된 리뷰 정보 조회
        const populatedReview = await Review.findById(review._id)
            .populate('author', 'nickname')
            .populate('alcohol', 'alcoholName index')
            .lean();

        return {
            review_id: populatedReview._id,
            author: {
                user_id: populatedReview.author._id,
                nickname: populatedReview.author.nickname
            },
            alcohol: {
                alcohol_id: populatedReview.alcohol.index,
                name: populatedReview.alcohol.alcoholName
            },
            rating: populatedReview.rating,
            content: populatedReview.content,
            image_url: populatedReview.imageUrl,
            created_at: populatedReview.createdAt.toISOString()
        };

    } catch (error) {
        if (error.statusCode) {
            throw error;
        }

        const serviceError = new Error('리뷰 작성 중 오류가 발생했습니다.');
        serviceError.statusCode = 500;
        throw serviceError;
    }
};

// 특정 전통주 리뷰 목록 조회 서비스
const getAlcoholReviews = async (alcoholId) => {
    try {
        const alcohol = await Alcohol.findOne({ index: parseInt(alcoholId) });
        if (!alcohol) {
            const error = new Error('해당 ID의 전통주를 찾을 수 없습니다.');
            error.statusCode = 404;
            throw error;
        }

        const reviews = await Review.find({ alcohol: alcohol._id })
            .populate('author', 'nickname')
            .sort({ createdAt: -1 })
            .lean();

        const reviewList = reviews.map(review => ({
            review_id: review._id,
            author: {
                user_id: review.author._id,
                nickname: review.author.nickname
            },
            rating: review.rating,
            content: review.content,
            image_url: review.imageUrl,
            created_at: review.createdAt.toISOString()
        }));

        return {
            reviews: reviewList,
            total: reviewList.length
        };

    } catch (error) {
        if (error.statusCode) {
            throw error;
        }

        const serviceError = new Error('리뷰 목록 조회 중 오류가 발생했습니다.');
        serviceError.statusCode = 500;
        throw serviceError;
    }
};

// 내 리뷰 목록 조회 서비스
const getMyReviews = async (userInfo) => {
    try {
        const user = await User.findById(userInfo.userId);
        if (!user) {
            const error = new Error('사용자를 찾을 수 없습니다.');
            error.statusCode = 404;
            throw error;
        }

        const reviews = await Review.find({ author: user._id })
            .populate('alcohol', 'alcoholName index')
            .sort({ createdAt: -1 })
            .lean();

        const reviewList = reviews.map(review => ({
            review_id: review._id,
            alcohol: {
                alcohol_id: review.alcohol.index,
                name: review.alcohol.alcoholName
            },
            rating: review.rating,
            content: review.content,
            image_url: review.imageUrl,
            created_at: review.createdAt.toISOString()
        }));

        return {
            reviews: reviewList,
            total: reviewList.length
        };

    } catch (error) {
        if (error.statusCode) {
            throw error;
        }
        const serviceError = new Error('리뷰 목록 조회 중 오류가 발생했습니다.');
        serviceError.statusCode = 500;
        throw serviceError;
    }
};

// 리뷰 수정 서비스
const updateReview = async (userInfo, reviewId, updateData, uploadedFile) => {
    try {
        const review = await getReviewWithPermissionCheck(userInfo, reviewId);

        const fieldsToUpdate = {};

        if (updateData.rating !== undefined) {
            const rating = parseInt(updateData.rating);
            if (rating < 1 || rating > 5) {
                const error = new Error('별점(rating)은 1-5 사이의 값이어야 합니다.');
                error.statusCode = 400;
                throw error;
            }
            fieldsToUpdate.rating = rating;
        }

        if (updateData.content !== undefined) {
            const content = updateData.content.trim();
            if (content.length === 0) {
                const error = new Error('내용은 비워둘 수 없습니다.');
                error.statusCode = 400;
                throw error;
            }
            fieldsToUpdate.content = content;
        }

        if (uploadedFile) {
            fieldsToUpdate.imageUrl = await processImageUpload(uploadedFile);
        }

        if (Object.keys(fieldsToUpdate).length === 0) {
            const error = new Error('수정할 정보가 없습니다.');
            error.statusCode = 400;
            throw error;
        }

        fieldsToUpdate.updatedAt = new Date();
        const updatedReview = await Review.findByIdAndUpdate(
            reviewId,
            fieldsToUpdate,
            { new: true }
        )
        .populate('author', 'nickname')
        .populate('alcohol', 'alcoholName index')
        .lean();

        return {
            review_id: updatedReview._id,
            author: {
                user_id: updatedReview.author._id,
                nickname: updatedReview.author.nickname
            },
            alcohol: {
                alcohol_id: updatedReview.alcohol.index,
                name: updatedReview.alcohol.alcoholName
            },
            rating: updatedReview.rating,
            content: updatedReview.content,
            image_url: updatedReview.imageUrl,
            created_at: updatedReview.createdAt.toISOString(),
            updated_at: updatedReview.updatedAt.toISOString()
        };

    } catch (error) {
        if (error.statusCode) {
            throw error;
        }
        const serviceError = new Error('리뷰 수정 중 오류가 발생했습니다.');
        serviceError.statusCode = 500;
        throw serviceError;
    }
};

// 리뷰 삭제 서비스
const deleteReview = async (userInfo, reviewId) => {
    try {
        await getReviewWithPermissionCheck(userInfo, reviewId);

        await Review.findByIdAndDelete(reviewId);

        return true;

    } catch (error) {
        if (error.statusCode) {
            throw error;
        }
        const serviceError = new Error('리뷰 삭제 중 오류가 발생했습니다.');
        serviceError.statusCode = 500;
        throw serviceError;
    }
};

// 리뷰 존재 및 권한 확인
const getReviewWithPermissionCheck = async (userInfo, reviewId) => {
    const review = await Review.findById(reviewId).populate('author');
    if (!review) {
        const error = new Error('해당 ID의 리뷰를 찾을 수 없습니다.');
        error.statusCode = 404;
        throw error;
    }

    const user = await User.findById(userInfo.userId);
    if (!user) {
        const error = new Error('사용자를 찾을 수 없습니다.');
        error.statusCode = 404;
        throw error;
    }

    if (!review.author._id.equals(user._id)) {
        const error = new Error('이 리뷰를 수정/삭제할 권한이 없습니다.');
        error.statusCode = 403;
        throw error;
    }

    return review;
};

// 이미지 업로드 처리
const processImageUpload = async (file) => {
    try {
        if (!file.location) {
            throw new Error('S3 업로드 실패: 파일 URL을 받지 못했습니다.');
        }

        return file.location;
    } catch (error) {
        const uploadError = new Error('이미지 업로드에 실패했습니다.');
        uploadError.statusCode = 500;
        throw uploadError;
    }
};

export default {
    createReview,
    getAlcoholReviews,
    getMyReviews,
    updateReview,
    deleteReview
};