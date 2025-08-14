import express from 'express';
import alcoholController from '../alcohol/controller/alcohol.controller.js';
import authMiddleware from '../auth/middleware/auth.middleware.js';
import reviewController from '../review/controller/review.controller.js';
import multer from 'multer';
import multerS3 from 'multer-s3';
import { S3Client } from '@aws-sdk/client-s3';

const router = express.Router();

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

const upload = multer({
    storage: multerS3({
        s3: s3Client,
        bucket: process.env.S3_BUCKET_NAME,
        key: function (req, file, cb) {
            // S3에 저장될 파일 경로: reviews/timestamp_filename
            const timestamp = Date.now();
            const fileName = `reviews/${timestamp}_${file.originalname}`;
            cb(null, fileName);
        },
        contentType: multerS3.AUTO_CONTENT_TYPE,
    }),
    fileFilter: (req, file, cb) => {
        // 이미지 파일만 허용
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

router.get('/', 
    authMiddleware.verifyAccessToken,
    alcoholController.getAlcoholList
);

router.get('/:alcohol_id',
    authMiddleware.verifyAccessToken,
    alcoholController.getAlcoholDetail
);

// 리뷰 작성
router.post('/:alcohol_id/reviews',
    authMiddleware.verifyAccessToken,
    upload.single('image'),
    reviewController.createReview
);

// 특정 전통주 리뷰 목록 조회
router.get('/:alcohol_id/reviews',
    authMiddleware.verifyAccessToken,
    reviewController.getAlcoholReviews
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
        
        if (error.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
                timestamp: new Date().toISOString(),
                status: 400,
                error: "Bad Request",
                message: "예상치 못한 파일 필드입니다. 'image' 필드를 사용하세요.",
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

export default router;