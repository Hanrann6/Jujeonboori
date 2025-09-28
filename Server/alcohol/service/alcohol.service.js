import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CSV_PATH = path.join(__dirname, 'sool.csv');

// CSV 데이터 로드 및 파싱
const loadAlcoholData = () => {
    try {
        const csvData = fs.readFileSync(CSV_PATH, 'utf8');
        const parsed = Papa.parse(csvData, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true
        });

        return parsed.data.map(row => ({
            index: row.index,
            alcoholName: row.alcoholName,
            normalizedName: row.normalizedName,
            foodPairing: row.foodPairing,
            sweetness: row.sweetness,
            sourness: row.sourness,
            freshness: row.freshness,
            body: row.body,
            degree: row.degree,
            alcoholType: row.alcoholType,
            keywords: row.keywords ? row.keywords.split(',').map(k => k.trim()) : [],
            volume: row.volume,
            price: row.price,
            priceValue: row.priceValue,
            ingredients: row.ingredients,
            brewery: row.brewery,
            description: row.description,
            representative: row.representative,
            address: row.address,
            contact: row.contact,
            website: row.website,
            imageUrl: row.imageUrl,
            detailPageUrl: row.detailPageUrl,
            docId: row.docId
        }));
    } catch (error) {
        console.error('CSV 파일 로드 실패:', error);
        return [];
    }
};

const getAlcoholList = async (page = 1, size = 10, filters = {}) => {
    try {
        // 필터 조건이 하나도 없으면 검색어 필수
        const hasAnyFilter = filters.search || filters.category || filters.keyword || filters.price_min !== undefined || filters.price_max !== undefined;
        if (!hasAnyFilter) {
            const error = new Error('검색어 또는 필터 조건이 필요합니다.');
            error.statusCode = 400;
            throw error;
        }

        const pageNumber = Math.max(1, parseInt(page));
        const pageSize = Math.max(1, Math.min(50, parseInt(size)));
        const skip = (pageNumber - 1) * pageSize;

        // 매번 CSV 파일에서 데이터 로드
        let alcohols = loadAlcoholData();

        // 검색/필터 적용
        alcohols = applyFilters(alcohols, filters);

        // 페이지네이션
        const totalElements = alcohols.length;
        const totalPages = Math.ceil(totalElements / pageSize);
        const paginatedAlcohols = alcohols.slice(skip, skip + pageSize);

        const alcoholList = paginatedAlcohols.map(alcohol => ({
            alcohol_id: alcohol.index,
            name: alcohol.alcoholName,
            category: alcohol.alcoholType,
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
        if (!alcoholId || isNaN(alcoholId)) {
            const error = new Error('유효하지 않은 전통주 ID입니다.');
            error.statusCode = 400;
            throw error;
        }

        // CSV 파일에서 데이터 로드
        const alcohols = loadAlcoholData();
        const alcohol = alcohols.find(a => a.index === parseInt(alcoholId));

        if (!alcohol) {
            const error = new Error('해당 ID의 전통주를 찾을 수 없습니다.');
            error.statusCode = 404;
            throw error;
        }

        // MongoDB에서 리뷰 데이터 조회 (평점 계산)
        let averageRating = 0;
        let reviewCount = 0;

        try {
            // Review 모델 동적 import
            const { default: Review } = await import('../review/model/review.model.js');
            
            const reviews = await Review.find({ alcohol: parseInt(alcoholId) });
            reviewCount = reviews.length;
            
            if (reviewCount > 0) {
                const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
                averageRating = Math.round((totalRating / reviewCount) * 10) / 10;
            }
        } catch (reviewError) {
            console.error('리뷰 데이터 조회 실패:', reviewError);
            // 리뷰 조회 실패해도 전통주 정보는 반환
        }

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
            average_rating: averageRating,
            review_count: reviewCount
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

// 사용 가능한 키워드 목록 조회 (CSV에서 추출)
const getAvailableKeywords = async () => {
    try {
        const alcohols = loadAlcoholData();
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

// 필터 적용 함수
const applyFilters = (alcohols, filters) => {
    let filtered = [...alcohols];

    // 1. 일반 검색 - 전통주 이름
    if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        filtered = filtered.filter(alcohol => 
            alcohol.alcoholName && alcohol.alcoholName.toLowerCase().includes(searchTerm)
        );
    }

    // 2-1. 필터 검색 - 가격대별
    if (filters.price_min !== undefined || filters.price_max !== undefined) {
        filtered = filtered.filter(alcohol => {
            const price = alcohol.priceValue;
            let matches = true;
            
            if (filters.price_min !== undefined && price < filters.price_min) {
                matches = false;
            }
            if (filters.price_max !== undefined && price > filters.price_max) {
                matches = false;
            }
            
            return matches;
        });
    }

    // 2-2. 필터 검색 - 주종별
    if (filters.category) {
        filtered = filtered.filter(alcohol => 
            alcohol.alcoholType === filters.category
        );
    }

    // 3. 키워드 목록 중 선택해서 검색
    if (filters.keyword) {
        filtered = filtered.filter(alcohol => 
            alcohol.keywords && alcohol.keywords.includes(filters.keyword)
        );
    }

    return filtered;
};

export default {
    getAlcoholList,
    getAlcoholDetail,
    getAvailableKeywords
};