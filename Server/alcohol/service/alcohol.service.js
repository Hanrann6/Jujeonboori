import { fileURLToPath } from 'url';
import Alcohol from '../model/alcohol.model.js';

const __filename = fileURLToPath(import.meta.url);

const getAlcoholList = async (filters = {}) => {
    try {
        // 필터 조건이 하나도 없으면 검색어 필수
        const hasAnyFilter = filters.search || filters.category || filters.keyword || filters.price_min !== undefined || filters.price_max !== undefined;
        if (!hasAnyFilter) {
            const error = new Error('검색어 또는 필터 조건이 필요합니다.');
            error.statusCode = 400;
            throw error;
        }

        const searchQuery = buildSearchQuery(filters);
        const alcohols = await Alcohol.find(searchQuery).lean();

        const alcoholList = alcohols.map(alcohol => ({
            alcohol_id: alcohol.index,
            name: alcohol.alcoholName,
            category: alcohol.alcoholType,
            image_url: alcohol.imageUrl
        }));

        return {
            alcohols: alcoholList
        };

    } catch (error) {
        console.error('전통주 목록 조회 오류:', error);
        if (error.statusCode) {
            throw error;
        }
        const serviceError = new Error('전통주 목록 조회 중 오류가 발생했습니다.');
        serviceError.statusCode = 500;
        throw serviceError;
    }
};

const getAlcoholDetail = async (alcoholId) => {
    try {
        if (!alcoholId || isNaN(alcoholId)) {
            const error = new Error('유효하지 않은 전통주 ID입니다.');
            error.statusCode = 400;
            throw error;
        }

        const pipeline = [
            { $match: { index: parseInt(alcoholId) } },
            {
                $lookup: {
                    from: 'reviews',
                    localField: 'index',
                    foreignField: 'alcohol',
                    as: 'reviews'
                }
            },
            {
                $addFields: {
                    reviewCount: { $size: '$reviews' },
                    averageRating: {
                        $cond: {
                            if: { $gt: [{ $size: '$reviews' }, 0] },
                            then: { $avg: '$reviews.rating' },
                            else: 0
                        }
                    }
                }
            }
        ];

        const result = await Alcohol.aggregate(pipeline);

        if (!result || result.length === 0) {
            const error = new Error('해당 ID의 전통주를 찾을 수 없습니다.');
            error.statusCode = 404;
            throw error;
        }

        const alcohol = result[0];

        const alcoholDetail = {
            alcohol_id: alcohol.index,
            name: alcohol.alcoholName,
            description: alcohol.description,
            category: alcohol.alcoholType,
            degree: alcohol.degree,
            volume: alcohol.volume,
            price: alcohol.price,
            // 가격 값 숫자로 처리하려면:
            price_value: alcohol.priceValue,
            sweetness: alcohol.sweetness,
            sourness: alcohol.sourness,
            freshness: alcohol.freshness,
            body: alcohol.body,
            food: alcohol.foodPairing,
            ingredients: alcohol.ingredients,
            keywords: alcohol.keywords,
            brewery: alcohol.brewery,
            location: alcohol.address,
            representative: alcohol.representative,
            contact: alcohol.contact,
            website: alcohol.website,
            image_url: alcohol.imageUrl,
            average_rating: Math.round(alcohol.averageRating * 10) / 10,
            review_count: alcohol.reviewCount
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

// 사용 가능한 키워드 목록 조회
const getAvailableKeywords = async () => {
    try {
        const alcohols = await Alcohol.find({}, 'keywords').lean();
        const keywordSet = new Set();
        
        alcohols.forEach(alcohol => {
            if (alcohol.keywords && Array.isArray(alcohol.keywords)) {
                alcohol.keywords.forEach(keyword => {
                    if (keyword && keyword.trim()) {
                        keywordSet.add(keyword.trim());
                    }
                });
            }
        });

        return Array.from(keywordSet).sort();
    } catch (error) {
        console.error('키워드 조회 오류:', error);
        throw error;
    }
};

// 검색 쿼리 구성 함수
const buildSearchQuery = (filters) => {
    const query = {};

    // 1. 일반 검색 - 전통주명
    if (filters.search) {
        query.alcoholName = { $regex: filters.search, $options: 'i' };
    }

    // 2-1. 필터 검색 - 가격대별
    if (filters.price_min !== undefined || filters.price_max !== undefined) {
        query.priceValue = {};
        if (filters.price_min !== undefined) {
            query.priceValue.$gte = filters.price_min;
        }
        if (filters.price_max !== undefined) {
            query.priceValue.$lte = filters.price_max;
        }
    }

    // 2-2. 필터 검색 - 주종별
    if (filters.category) {
        query.alcoholType = filters.category;
    }

    // 3. 키워드 목록 중 선택해서 검색
    if (filters.keyword) {
        query.keywords = { $in: [filters.keyword] };
    }

    return query;
};

export default {
    getAlcoholList,
    getAlcoholDetail,
    getAvailableKeywords
};