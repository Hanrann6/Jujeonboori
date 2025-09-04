import alcoholService from '../service/alcohol.service.js';
import { sendViewDetailEvent } from '../../personalize/service/personalize.service.js';

const getAlcoholList = async (req, res) => {
    try {
        const { page, size } = req.query;

        const alcoholList = await alcoholService.getAlcoholList(page, size);

        res.status(200).json(alcoholList);

    } catch (error) {
        console.error('전통주 목록 조회 오류:', error);

        if (error.statusCode) {
            const errorResponse = {
                timestamp: new Date().toISOString(),
                status: error.statusCode,
                error: error.statusCode === 400 ? "Bad Request" : "Internal Server Error",
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

const getAlcoholDetail = async (req, res) => {
    try {
        const { alcohol_id } = req.params;

        const alcoholDetail = await alcoholService.getAlcoholDetail(alcohol_id);

        // AWS Personalize 이벤트 전송
        try {
            const userId = req.user.userId;
            
            await sendViewDetailEvent(userId, alcohol_id.toString());
            
            console.log(`Personalize 이벤트 전송 완료: 사용자 ${userId}, 전통주 ${alcohol_id}`);
        } catch (personalizeError) {
            // Personalize 이벤트 실패해도 API 응답은 정상 처리
            console.error('Personalize 이벤트 전송 실패:', personalizeError);
        }

        res.status(200).json(alcoholDetail);

    } catch (error) {
        console.error('전통주 상세 조회 오류:', error);

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

const getKeywords = async (req, res) => {
    try {
        const keywords = await alcoholService.getAvailableKeywords();
        res.status(200).json({ keywords });
    } catch (error) {
        console.error('키워드 목록 조회 오류:', error);
        res.status(500).json({
            timestamp: new Date().toISOString(),
            status: 500,
            error: "Internal Server Error",
            message: "키워드 목록 조회 중 오류가 발생했습니다.",
            path: req.path
        });
    }
};

export default {
    getAlcoholList,
    getAlcoholDetail,
    getKeywords
};