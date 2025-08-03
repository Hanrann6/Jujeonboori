import Alcohol from '../model/alcohol.model.js';

const getAlcoholList = async (page = 1, size = 10) => {
    try {
        const pageNumber = Math.max(1, parseInt(page));
        const pageSize = Math.max(1, Math.min(50, parseInt(size))); // API 최대 50개로 제한
        const skip = (pageNumber - 1) * pageSize;

        const [alcohols, totalElements] = await Promise.all([
            Alcohol.find({})
                .skip(skip)
                .limit(pageSize)
                .lean(),
            Alcohol.countDocuments({})
        ]);

        const totalPages = Math.ceil(totalElements / pageSize);

        const alcoholList = alcohols.map(alcohol => ({
            alcohol_id: alcohol._id,
            name: alcohol.name,
            category: alcohol.category,
            image_url: alcohol.imageUrl
        }));

        return {
            alcohols: alcoholList,
            page_info: {
                page: pageNumber,
                size: pageSize,
                total_elements: totalElements,
                total_pages: totalPages
            }
        };

    } catch (error) {
        console.error('전통주 목록 조회 오류:', error);
        const serviceError = new Error('전통주 목록 조회 중 오류가 발생했습니다.');
        serviceError.statusCode = 500;
        throw serviceError;
    }
};

const getAlcoholDetail = async (alcoholId) => {
    try {
        if (!isValidObjectId(alcoholId)) {
            const error = new Error('유효하지 않은 전통주 ID입니다.');
            error.statusCode = 400;
            throw error;
        }

        const alcohol = await Alcohol.findById(alcoholId).lean();

        if (!alcohol) {
            const error = new Error('해당 ID의 전통주를 찾을 수 없습니다.');
            error.statusCode = 404;
            throw error;
        }

        // 현재 모델에 없는 필드들은 기본값으로 처리
        const alcoholDetail = {
            alcohol_id: alcohol._id,
            name: alcohol.name,
            description: "전통주에 대한 상세 설명입니다.", // 기본값
            category: alcohol.category,
            abv: alcohol.abv,
            volume: "360ml", // 기본값
            price: alcohol.price,
            sweetness: alcohol.sweetness || 0,
            sourness: alcohol.sourness || 0,
            freshness: alcohol.freshness || 0,
            body: alcohol.body || 0,
            sparkling: alcohol.sparkling || 0,
            food: "다양한 음식과 잘 어울립니다.", // 기본값
            ingredients: ["쌀", "누룩", "정제수"], // 기본값
            keywords: ["전통", "한국"], // 기본값
            brewery: {
                name: "전통 양조장",
                location: alcohol.region || "한국"
            },
            image_url: alcohol.imageUrl
        };

        return alcoholDetail;

    } catch (error) {
        if (error.statusCode) {
            throw error;
        }

        console.error('전통주 상세 조회 오류:', error);
        const serviceError = new Error('전통주 상세 조회 중 오류가 발생했습니다.');
        serviceError.statusCode = 500;
        throw serviceError;
    }
};

const isValidObjectId = (id) => {
    return /^[0-9a-fA-F]{24}$/.test(id);
};

export default {
    getAlcoholList,
    getAlcoholDetail
};