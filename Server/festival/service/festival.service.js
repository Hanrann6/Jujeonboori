import Festival from '../model/festival.model.js';

const festivalService = {
    // 연도별 축제 목록 조회
    async getFestivalsByYear(year) {
        try {
            const startOfYear = new Date(year, 0, 1); // 1월 1일
            const endOfYear = new Date(year, 11, 31, 23, 59, 59); // 12월 31일
            
            const festivals = await Festival.find({
                start_date: {
                    $gte: startOfYear,
                    $lte: endOfYear
                }
            })
            .select('festival_id name location start_date end_date image_url')
            .sort({ start_date: 1 }) // 시작일 순으로 정렬
            .lean();
            
            // 날짜 포맷팅 (YYYY-MM-DD)
            const formattedFestivals = festivals.map(festival => ({
                ...festival,
                start_date: festival.start_date.toISOString().split('T')[0],
                end_date: festival.end_date.toISOString().split('T')[0]
            }));
            
            return formattedFestivals;
        } catch (error) {
            console.error('연도별 축제 조회 중 오류:', error);
            throw error;
        }
    },

    // 축제 ID로 상세 정보 조회
    async getFestivalById(festivalId) {
        try {
            const festival = await Festival.findOne({ festival_id: festivalId })
                .select('-_id -__v -created_at') // MongoDB 기본 필드 제외
                .lean();
            
            if (!festival) {
                return null;
            }
            
            // 날짜 포맷팅
            const formattedFestival = {
                ...festival,
                start_date: festival.start_date.toISOString().split('T')[0],
                end_date: festival.end_date.toISOString().split('T')[0]
            };
            
            return formattedFestival;
        } catch (error) {
            console.error('축제 상세 조회 중 오류:', error);
            throw error;
        }
    }
};

export default festivalService;