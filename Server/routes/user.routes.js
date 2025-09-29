import express from 'express';
import multer from 'multer';
import multerS3 from 'multer-s3';
import { S3Client } from '@aws-sdk/client-s3';
import userController from '../user/controller/user.controller.js';
import authMiddleware from '../auth/middleware/auth.middleware.js';
import reviewController from '../review/controller/review.controller.js';
import validateObjectId from '../middleware/validateObjectId.js';

const router = express.Router();

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

// S3 이미지 파일 경로 설정
const upload = multer({
    storage: multerS3({
        s3: s3Client,
        bucket: process.env.S3_BUCKET_NAME,
        key: function (req, file, cb) {
            const timestamp = Date.now();
            // URL에 'reviews'가 들어있으면 reviews 폴더, 아니면 profiles 폴더
            const folder = req.path.includes('/reviews') ? 'reviews' : 'profiles';
            const fileName = `${folder}/${timestamp}_${file.originalname}`;
            cb(null, fileName);
        },
        contentType: multerS3.AUTO_CONTENT_TYPE,
    }),
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png'];

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('지원하지 않는 파일 형식입니다. JPEG, PNG만 업로드 가능합니다.'), false);
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB 제한
    }
});

router.get('/me',
    authMiddleware.verifyAccessToken,
    userController.getMyProfile
);

router.patch('/me',
    authMiddleware.verifyAccessToken,
    upload.single('image'),
    userController.updateMyProfile
);

// router.get('/:user_id',
//     authMiddleware.verifyAccessToken,
//     userController.getUserProfile
// );

router.delete('/me',
    authMiddleware.verifyAccessToken,
    userController.deleteUser
);

// 내 리뷰 목록 조회
router.get('/me/reviews',
    authMiddleware.verifyAccessToken,
    reviewController.getMyReviews
);

// 리뷰 수정
router.patch('/me/reviews/:review_id',
    authMiddleware.verifyAccessToken,
    upload.single('image'),
    reviewController.updateReview
);

// 리뷰 삭제
router.delete('/me/reviews/:review_id',
    authMiddleware.verifyAccessToken,
    reviewController.deleteReview
);

router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                timestamp: new Date().toISOString(),
                status: 400,
                error: "Bad Request",
                message: "파일 크기는 5MB 이하여야 합니다.",
                path: req.path
            });
        }
    }

    if (error.message.includes('지원하지 않는 파일 형식')) {
        return res.status(400).json({
            timestamp: new Date().toISOString(),
            status: 400,
            error: "Bad Request",
            message: error.message,
            path: req.path
        });
    }

    next(error);
});

// userId 파라미터 유효성 검사
// router.get(
//     '/:userId',
//     validateObjectId('userId'),
//     userController.getUserProfile
// );

export default router;