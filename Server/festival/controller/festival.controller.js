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
    }
};

export default festivalController;