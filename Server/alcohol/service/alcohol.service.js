import Alcohol from '../model/alcohol.model.js';
import Keyword from '../model/keyword.model.js';

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

// 사용 가능한 키워드 목록 조회
const getAvailableKeywords = async () => {
    try {
        const keywords = await Keyword.find({}, { name: 1, _id: 0 }).sort({ name: 1 });
        return keywords.map(k => k.name);
    } catch (error) {
        console.error('키워드 조회 오류:', error);
        throw error;
    }
};

// 검색 쿼리 구성 함수
const buildSearchQuery = (filters) => {
    const query = {};

    // 키워드 검색
    if (filters.keyword) {
        query.keywords = { $in: [filters.keyword] }; // 배열에서 정확히 일치하는 키워드 검색
    }

    // 텍스트 검색
    if (filters.search) {
        query.name = { $regex: filters.search, $options: 'i' };
    }

    // 카테고리 필터
    if (filters.category) {
        query.category = filters.category;
    }

    // 가격 범위 필터
    if (filters.price_min !== undefined || filters.price_max !== undefined) {
        query.price = {};
        if (filters.price_min !== undefined) {
            query.price.$gte = filters.price_min;
        }
        if (filters.price_max !== undefined) {
            query.price.$lte = filters.price_max;
        }
    }

    // 지역 필터
    if (filters.region) {
        query.region = filters.region;
    }

    // 도수 범위 필터
    if (filters.alcohol_min !== undefined || filters.alcohol_max !== undefined) {
        query.abv = {};
        if (filters.alcohol_min !== undefined) {
            query.abv.$gte = filters.alcohol_min;
        }
        if (filters.alcohol_max !== undefined) {
            query.abv.$lte = filters.alcohol_max;
        }
    }

    return query;
};

// 정렬 옵션 구성 함수
const buildSortOptions = (sort) => {
    const sortOptions = {};

    switch (sort) {
        case 'popular':
            // 인기순 = 리뷰 수 + 북마크 수 (집계 필요)
            // 현재는 임시로 가격 내림차순
            sortOptions.price = -1;
            break;
        case 'rating':
            // 평점순 = 리뷰 평균 평점 (집계 필요)
            // 현재는 임시로 이름순
            sortOptions.name = 1;
            break;
        case 'price_low':
            sortOptions.price = 1; // 가격 낮은순
            break;
        case 'price_high':
            sortOptions.price = -1; // 가격 높은순
            break;
        case 'latest':
            sortOptions.createdAt = -1; // 최신순
            break;
        case 'name':
            sortOptions.name = 1; // 이름 오름차순
            break;
        case 'abv_low':
            sortOptions.abv = 1; // 도수 낮은순
            break;
        case 'abv_high':
            sortOptions.abv = -1; // 도수 높은순
            break;
        default:
            sortOptions._id = 1; // 기본 정렬
    }

    return sortOptions;
};

// 인기순/평점순을 위한 집계 쿼리 함수 (향후 구현용)
const getAlcoholListWithAggregation = async (page = 1, size = 10, filters = {}) => {
    try {
        const pageNumber = Math.max(1, parseInt(page));
        const pageSize = Math.max(1, Math.min(50, parseInt(size)));
        const skip = (pageNumber - 1) * pageSize;

        // 기본 쿼리 조건
        const matchQuery = buildSearchQuery(filters);

        let pipeline = [
            { $match: matchQuery }
        ];

        // 인기순/평점순인 경우 집계 파이프라인 추가
        if (filters.sort === 'popular' || filters.sort === 'rating') {
            pipeline = pipeline.concat([
                // 리뷰 컬렉션과 조인
                {
                    $lookup: {
                        from: 'reviews',
                        localField: '_id',
                        foreignField: 'alcoholId',
                        as: 'reviews'
                    }
                },
                // 북마크 컬렉션과 조인
                {
                    $lookup: {
                        from: 'bookmarks',
                        localField: '_id',
                        foreignField: 'alcoholId',
                        as: 'bookmarks'
                    }
                },
                // 집계 필드 추가
                {
                    $addFields: {
                        reviewCount: { $size: '$reviews' },
                        bookmarkCount: { $size: '$bookmarks' },
                        averageRating: {
                            $cond: {
                                if: { $gt: [{ $size: '$reviews' }, 0] },
                                then: { $avg: '$reviews.rating' },
                                else: 0
                            }
                        },
                        popularityScore: {
                            $add: [
                                { $size: '$reviews' },
                                { $multiply: [{ $size: '$bookmarks' }, 2] } // 북마크에 가중치
                            ]
                        }
                    }
                }
            ]);

            // 정렬 조건
            if (filters.sort === 'popular') {
                pipeline.push({ $sort: { popularityScore: -1, _id: 1 } });
            } else if (filters.sort === 'rating') {
                pipeline.push({ $sort: { averageRating: -1, reviewCount: -1, _id: 1 } });
            }
        } else {
            // 일반 정렬
            const sortOptions = buildSortOptions(filters.sort);
            pipeline.push({ $sort: sortOptions });
        }

        // 페이지네이션
        pipeline = pipeline.concat([
            { $skip: skip },
            { $limit: pageSize }
        ]);

        const [alcohols, totalElements] = await Promise.all([
            Alcohol.aggregate(pipeline),
            Alcohol.countDocuments(matchQuery)
        ]);

        const totalPages = Math.ceil(totalElements / pageSize);

        const alcoholList = alcohols.map(alcohol => ({
            alcohol_id: alcohol._id,
            name: alcohol.name,
            category: alcohol.category,
            price: alcohol.price,
            abv: alcohol.abv,
            region: alcohol.region,
            image_url: alcohol.imageUrl,
            // 집계 데이터 추가 (있는 경우)
            ...(alcohol.averageRating !== undefined && {
                average_rating: Math.round(alcohol.averageRating * 10) / 10,
                review_count: alcohol.reviewCount,
                bookmark_count: alcohol.bookmarkCount
            })
        }));

        return {
            alcohols: alcoholList,
            page_info: {
                page: pageNumber,
                size: pageSize,
                total_elements: totalElements,
                total_pages: totalPages
            },
            applied_filters: filters
        };
    } catch (error) {
        console.error('전통주 목록 조회 오류:', error);
        const serviceError = new Error('전통주 목록 조회 중 오류가 발생했습니다.');
        serviceError.statusCode = 500;
        throw serviceError;
    }
};

export default {
    getAlcoholList: getAlcoholListWithAggregation,
    getAlcoholDetail,
    getAvailableKeywords
};