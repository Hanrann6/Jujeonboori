import reviewService from '../service/review.service.js';
import { sendReviewEvent } from '../../personalize/service/personalize.service.js';

// 리뷰 작성
const createReview = async (req, res) => {
    try {
        const { alcohol_id } = req.params;

        const newReview = await reviewService.createReview(
            req.user,
            alcohol_id,
            req.body,
            req.file
        );

        // AWS Personalize 이벤트 전송
        try {
            const userId = req.user.userId;
            const rating = parseInt(req.body.rating);
            
            await sendReviewEvent(userId, alcohol_id.toString(), rating);
            
            console.log(`Personalize 리뷰 이벤트 전송 완료: 사용자 ${userId}, 전통주 ${alcohol_id}, 평점 ${rating}`);
        } catch (personalizeError) {
            // Personalize 이벤트 실패해도 리뷰 작성은 정상 처리
            console.error('Personalize 리뷰 이벤트 전송 실패:', personalizeError);
        }

        res.status(200).json(newReview);

    } catch (error) {
        console.error('리뷰 작성 오류:', error);

        if (error.statusCode) {
            let errorType;
            if (error.statusCode === 404) {
                errorType = "Not Found";
            } else if (error.statusCode === 400) {
                errorType = "Bad Request";
            } else if (error.statusCode === 403) {
                errorType = "Forbidden";
            } else if (error.statusCode === 409) {
                errorType = "Conflict";
            } else {
                errorType = "Internal Server Error";
            }

            const errorResponse = {
                timestamp: new Date().toISOString(),
                status: error.statusCode,
                error: errorType,
                message: error.message,
                path: req.path
            };
            
            // 중복 리뷰의 경우 기존 리뷰 ID 추가
            if (error.statusCode === 409 && error.existingReviewId) {
                errorResponse.existingReviewId = error.existingReviewId;
            }
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

// 특정 전통주 리뷰 목록 조회
const getAlcoholReviews = async (req, res) => {
    try {
        const { alcohol_id } = req.params;
        const { page, size } = req.query;

        const reviewList = await reviewService.getAlcoholReviews(alcohol_id, page, size);

        res.status(200).json(reviewList);

    } catch (error) {
        console.error('전통주 리뷰 목록 조회 오류:', error);

        if (error.statusCode) {
            let errorType;
            if (error.statusCode === 404) {
                errorType = "Not Found";
            } else if (error.statusCode === 400) {
                errorType = "Bad Request";
            } else {
                errorType = "Internal Server Error";
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

// 내 리뷰 목록 조회
const getMyReviews = async (req, res) => {
    try {
        const { page, size } = req.query;

        const reviewList = await reviewService.getMyReviews(req.user, page, size);

        res.status(200).json(reviewList);

    } catch (error) {
        console.error('내 리뷰 목록 조회 오류:', error);

        if (error.statusCode) {
            let errorType;
            if (error.statusCode === 404) {
                errorType = "Not Found";
            } else if (error.statusCode === 400) {
                errorType = "Bad Request";
            } else {
                errorType = "Internal Server Error";
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

// 리뷰 수정
const updateReview = async (req, res) => {
    try {
        const { review_id } = req.params;

        const updatedReview = await reviewService.updateReview(
            req.user,
            review_id,
            req.body,
            req.file
        );

        res.status(200).json(updatedReview);

    } catch (error) {
        console.error('리뷰 수정 오류:', error);

        if (error.statusCode) {
            let errorType;
            if (error.statusCode === 404) {
                errorType = "Not Found";
            } else if (error.statusCode === 400) {
                errorType = "Bad Request";
            } else if (error.statusCode === 403) {
                errorType = "Forbidden";
            } else {
                errorType = "Internal Server Error";
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

// 리뷰 삭제
const deleteReview = async (req, res) => {
    try {
        const { review_id } = req.params;

        await reviewService.deleteReview(req.user, review_id);

        res.status(204).send();

    } catch (error) {
        console.error('리뷰 삭제 오류:', error);

        if (error.statusCode) {
            let errorType;
            if (error.statusCode === 404) {
                errorType = "Not Found";
            } else if (error.statusCode === 400) {
                errorType = "Bad Request";
            } else if (error.statusCode === 403) {
                errorType = "Forbidden";
            } else {
                errorType = "Internal Server Error";
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

export default {
    createReview,
    getAlcoholReviews,
    getMyReviews,
    updateReview,
    deleteReview
};