import festivalService from '../service/festival.service.js';

const festivalController = {
    // 축제 목록 조회
    async getFestivals(req, res) {
        try {
            const year = parseInt(req.query.year) || 2025; // 기본값: 2025년
            
            const festivals = await festivalService.getFestivalsByYear(year);
            
            res.status(200).json({
                festivals: festivals
            });
        } catch (error) {
            console.error('축제 목록 조회 중 오류:', error);
            res.status(500).json({
                timestamp: new Date().toISOString(),
                status: 500,
                error: "Internal Server Error",
                message: "축제 목록을 불러오는 중 오류가 발생했습니다.",
                path: req.path
            });
        }
    },

    // 축제 상세 조회
    async getFestivalDetail(req, res) {
        try {
            const festivalId = parseInt(req.params.festival_id);
            
            if (!festivalId || festivalId <= 0) {
                return res.status(400).json({
                    timestamp: new Date().toISOString(),
                    status: 400,
                    error: "Bad Request",
                    message: "유효하지 않은 축제 ID입니다.",
                    path: req.path
                });
            }
            
            const festival = await festivalService.getFestivalById(festivalId);
            
            if (!festival) {
                return res.status(404).json({
                    timestamp: new Date().toISOString(),
                    status: 404,
                    error: "Not Found",
                    message: "해당 ID의 축제를 찾을 수 없습니다.",
                    path: req.path
                });
            }
            
            res.status(200).json(festival);
        } catch (error) {
            console.error('축제 상세 조회 중 오류:', error);
            res.status(500).json({
                timestamp: new Date().toISOString(),
                status: 500,
                error: "Internal Server Error",
                message: "축제 정보를 불러오는 중 오류가 발생했습니다.",
                path: req.path
            });
        }
    }
};

export default festivalController;