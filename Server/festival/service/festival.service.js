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
            .select('festival_id name location start_date end_date official_url image_url')
            .sort({ end_date: -1 }) // 종료일 기준 내림차순 정렬
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
    }
};

export default festivalService;