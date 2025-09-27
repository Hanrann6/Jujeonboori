import dotenv from 'dotenv';
import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse';
import { stringify } from 'csv-stringify';
import AWS from 'aws-sdk';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

// 1. AWS S3 설정
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});

const s3 = new AWS.S3();
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;

// 1. 유틸리티 함수
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function normalizeName(name) {
    return name?.replace(/\s+/g, '')
                .replace(/[^\w가-힣]/g, '') // 특수문자 제거
                .toLowerCase()
                .trim();
}

// 3. 네이버 지식백과 크롤링 함수들 (기존 코드 활용)
async function crawlAllPagesUrls(baseUrl) {
    const visitedPages = new Set();
    const allDetailUrls = new Set();
    let pageQueue = [baseUrl];

    while (pageQueue.length > 0) {
        const currentUrl = pageQueue.shift();
        if (visitedPages.has(currentUrl)) continue;
        visitedPages.add(currentUrl);

        console.log(`\n네이버 지식백과 크롤링: ${currentUrl}`);
        await sleep(1000);

        try {
            const response = await axios.get(currentUrl);
            const $ = cheerio.load(response.data);

            // 컨텐츠 URL 수집
            $('ul.content_list > li .info_area .subject .title a').each((_, el) => {
                const href = $(el).attr('href');
                if (href && href.startsWith('/entry.naver')) {
                    const absoluteUrl = new URL(href, currentUrl).href;
                    allDetailUrls.add(absoluteUrl);
                }
            });

            // 다음 페이지 링크 수집
            $('#paginate a').each((_, el) => {
                const href = $(el).attr('href');
                if (href && href.includes('page=')) {
                    const absoluteUrl = new URL(href, currentUrl).href;
                    if (!visitedPages.has(absoluteUrl)) {
                        pageQueue.push(absoluteUrl);
                    }
                }
            });

        } catch (err) {
            console.error(`네이버 오류 (${currentUrl}):`, err.message);
        }
    }

    console.log(`\n네이버 지식백과 URL 수집 완료: 총 ${allDetailUrls.size}개`);
    return Array.from(allDetailUrls);
}

// 네이버 상세 페이지 크롤링 및 S3 업로드
async function crawlAlcoholDetails(detailPageUrl) {
    console.log(`  네이버 상세 페이지 크롤링: ${detailPageUrl}`);
    await sleep(500);

    try {
        const res = await axios.get(detailPageUrl);
        const $ = cheerio.load(res.data);
        const name = $('h2.headword').text().trim();
        const docId = new URLSearchParams(new URL(detailPageUrl).search).get('docId');

        const alcoholData = {
            detailPageUrl: detailPageUrl,
            docId: docId,
            alcoholName: name || $('.info_area .subject .title a').first().text().trim() || '알 수 없는 제품'
        };

        // 기본 정보 추출 (기존 로직)
        $('.info_area .related .info').each((index, element) => {
            const labelElement = $(element).contents().filter(function() {
                return this.nodeType === 3 && $(this).text().trim() !== '';
            }).text().trim();
            const value = $(element).find('.data').text().trim();

            switch (labelElement) {
                case '상품명': if(!alcoholData.alcoholName || alcoholData.alcoholName === '알 수 없는 제품') alcoholData.alcoholName = value; break;
                case '주종': alcoholData.alcoholType = value; break;
                case '도수': alcoholData.degree = value; break;
                case '용량': alcoholData.volume = value; break;
                case '가격': alcoholData.price = value; break;
                case '원재료': alcoholData.ingredients = value.replace(/\s+/g, ' ').trim(); break;
                case '제조사': alcoholData.manufacturer = value; break;
            }
        });

        // 추가 정보 추출 (테이블에서)
        $('.tmp_profile_tb tbody tr').each((_, row) => {
            const label = $(row).find('th span.title').text().trim();
            let value = $(row).find('td').text().trim();
            const aTag = $(row).find('td a');

            if (label === '홈페이지' && aTag.length > 0) {
                value = aTag.attr('href');
            }
            
            switch (label) {
                case '상품명': if(!alcoholData.alcoholName || alcoholData.alcoholName === '알 수 없는 제품') alcoholData.alcoholName = value; break;
                case '주종': if(!alcoholData.alcoholType) alcoholData.alcoholType = value; break;
                case '도수': if(!alcoholData.degree) alcoholData.degree = value; break;
                case '용량': if(!alcoholData.volume) alcoholData.volume = value; break;
                case '가격': if(!alcoholData.price) alcoholData.price = value; break;
                case '원재료': if(!alcoholData.ingredients) alcoholData.ingredients = value.replace(/\s+/g, ' ').trim(); break;
                case '제조사': 
                    if(!alcoholData.manufacturer) alcoholData.manufacturer = value;
                    alcoholData.brewery = value; 
                    break;
                case '대표자명': alcoholData.representative = value; break;
                case '주소': alcoholData.address = value.replace(/\s+/g, ' ').trim(); break;
                case '연락처': alcoholData.contact = value; break;
                case '홈페이지': alcoholData.website = value; break;
            }
        });

        // 상세정보 추출
        let detailInfoText = "";
        const detailInfoHeading = $('h3.stress').first();
        if (detailInfoHeading.length > 0) {
            const nextP = detailInfoHeading.nextAll('p.txt').first();
            if (nextP.length > 0) {
                detailInfoText = nextP.text().trim();
            }
        }
        if (!detailInfoText) {
            detailInfoText = $('.se_section .se_section_area .se_ogtext').text().trim() ||
                             $('p.txt').first().text().trim();
        }
        alcoholData.description = detailInfoText.replace(/\s+/g, ' ').trim();

        // 어울리는 음식 추출
        let foodPairingText = "";
        const foodPairingHeading = $('h3.stress:contains("어울리는 음식")');
        if (foodPairingHeading.length > 0) {
            const targetP = foodPairingHeading.nextUntil('h3').filter('p.txt').last();
            if (targetP.length > 0) {
                foodPairingText = targetP.text().trim();
                const sentences = foodPairingText.split(/(?<=[.?!])\s+/);
                if (sentences.length > 0) {
                    foodPairingText = sentences[sentences.length - 1].trim();
                    if (!foodPairingText.match(/[.?!]$/)) {
                        foodPairingText += '.';
                    }
                }
            }
        }
        alcoholData.foodPairing = foodPairingText;

        // 이미지 URL 및 S3 업로드
        let mainImageUrl = null;
        const productNameForFileName = alcoholData.alcoholName.replace(/[^a-zA-Z0-9가-힣ㄱ-ㅎㅏ-ㅣ\s]/g, '');

        const mainImageTag1 = $('#innerImage0');
        if (mainImageTag1.length > 0) {
            mainImageUrl = mainImageTag1.attr('origin_src') || mainImageTag1.attr('data-src') || mainImageTag1.attr('src');
        }
        if (!mainImageUrl) {
            const mainImageTag2 = $('img[alt$="_대표사진"], img[alt$="_대표이미지"]');
            if (mainImageTag2.length > 0) {
                mainImageUrl = mainImageTag2.first().attr('origin_src') || mainImageTag2.first().attr('data-src') || mainImageTag2.first().attr('src');
            }
        }
        
        if (mainImageUrl) {
            try {
                const imageResponse = await axios({
                    url: mainImageUrl,
                    method: 'GET',
                    responseType: 'arraybuffer'
                });

                const s3FileName = `${alcoholData.docId}-${productNameForFileName}_main${path.extname(mainImageUrl.split('?')[0])}`;
                const s3Key = `images/${s3FileName}`;

                const params = {
                    Bucket: S3_BUCKET_NAME, Key: s3Key, Body: imageResponse.data, ContentType: getContentType(s3FileName)
                };

                const s3UploadData = await s3.upload(params).promise();
                alcoholData.imageURL = s3UploadData.Location;
                console.log(`    네이버 이미지 S3 업로드 완료: ${s3UploadData.Location}`);
            } catch (s3Err) {
                console.error(`    네이버 이미지 S3 업로드 실패:`, s3Err.message);
                alcoholData.imageURL = mainImageUrl;
            }
        } else {
            alcoholData.imageURL = '';
        }

        return alcoholData;
    } catch (err) {
        console.error('네이버 상세 페이지 오류:', detailPageUrl, err.message);
        return null;
    }
}

function getContentType(filePath) {
    const extname = path.extname(filePath).toLowerCase();
    switch (extname) {
        case '.png': return 'image/png';
        case '.jpg':
        case '.jpeg': return 'image/jpeg';
        case '.gif': return 'image/gif';
        case '.webp': return 'image/webp';
        default: return 'application/octet-stream';
    }
}

// 4. TheSool 키워드 크롤링 클래스
class TheSoolKeywordCrawler {
    constructor() {
        this.baseUrl = 'https://thesool.com/front/find/M000000082/list.do';
        this.keywords = [
            '가성비', '가을', '겨울', '고문헌', '과일류', '기념일', '꿀', '달콤', '드라이', '매실',
            '명절', '무감미료', '베리류', '봄', '삼(蔘)류', '선물', '소용량', '스파클링', '여름', '연말',
            '예쁜술', '이색전통주', '저도수', '저용량', '진한맛', '집들이', '칵테일', '커플', '탄산', '통밀',
            '파티', '혼술', '홈술'
        ];
        this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
    }

    // URL 생성 함수
    generateUrl(keyword, pageIndex = 1) {
        const params = new URLSearchParams({
            searchType: '1',
            searchKey: keyword,
            searchKind: '',
            levelType: '',
            searchString: '',
            productId: '',
            pageIndex: pageIndex.toString(),
            categoryNm: keyword,
            kind: ''
        });
        
        return `${this.baseUrl}?${params.toString()}`;
    }

    // 키워드별 제품 이름만 추출
    async crawlKeywordPage(keyword, pageIndex = 1) {
        const url = this.generateUrl(keyword, pageIndex);
        console.log(`TheSool 크롤링: ${keyword} - 페이지 ${pageIndex}`);
        
        try {
            await sleep(1000);
            
            const response = await axios.get(url, {
                headers: { 'User-Agent': this.userAgent }
            });

            const $ = cheerio.load(response.data);
            
            const productNames = [];
            
            // TheSool 상품 목록에서 제품명만 추출
            $('.product-list ul li.item').each((index, element) => {
                const $el = $(element);
                const name = $el.find('.detail dt .title-area .name').text().trim();
                
                if (name) {
                    productNames.push(name);
                }
            });

            // 다음 페이지 확인 - 더 세밀한 디버깅
            const paginationDebug = [];
            $('.paging .paging-list li').each((i, el) => {
                const $el = $(el);
                const onclick = $el.find('a').attr('onclick') || '';
                const text = $el.find('a').text().trim();
                paginationDebug.push(`"${text}": ${onclick}`);
            });
            
            const hasNextPage = $('.paging .paging-list li').filter((i, el) => {
                const $el = $(el);
                const onclick = $el.find('a').attr('onclick') || '';
                const nextPageMatch = onclick.match(/fn_egov_link_page\((\d+)\)/);
                if (nextPageMatch) {
                    const nextPageNum = parseInt(nextPageMatch[1]);
                    return nextPageNum > pageIndex;
                }
                return false;
            }).length > 0;

            console.log(`  ${keyword} 페이지 ${pageIndex}: ${productNames.length}개 제품명 수집`);
            
            // 페이지네이션 디버깅 정보
            if (paginationDebug.length > 0) {
                console.log(`  페이지네이션: [${paginationDebug.join(', ')}] hasNextPage: ${hasNextPage}`);
            } else {
                console.log(`  페이지네이션: 없음`);
            }
            
            return { keyword, pageIndex, productNames, hasNextPage };

        } catch (error) {
            console.error(`TheSool 오류 - ${keyword} 페이지 ${pageIndex}:`, error.message);
            return { keyword, pageIndex, productNames: [], hasNextPage: false };
        }
    }

    // 키워드별 모든 페이지 크롤링
    async crawlKeyword(keyword) {
        console.log(`\n=== [${keyword}] 크롤링 시작 ===`);
        
        const allProductNames = [];
        let currentPage = 1;
        let hasNextPage = true;
        const maxPages = 50; // 무한 루프 방지

        while (hasNextPage && currentPage <= maxPages) {
            const result = await this.crawlKeywordPage(keyword, currentPage);
            
            if (result.productNames.length === 0) {
                console.log(`  ${keyword}: 페이지 ${currentPage}에서 제품 없음, 종료`);
                break;
            }
            
            console.log(`  페이지 ${currentPage}: ${result.productNames.length}개 제품명`);
            // 첫 페이지는 제품명들을 출력해서 확인
            if (currentPage === 1 && result.productNames.length > 0) {
                console.log(`  첫 3개 제품명 예시: ${result.productNames.slice(0, 3).join(', ')}`);
            }
            
            allProductNames.push(...result.productNames);
            hasNextPage = result.hasNextPage;
            currentPage++;

            await sleep(1500); // 페이지 간 대기
        }

        console.log(`=== [${keyword}] 완료: 총 ${allProductNames.length}개 제품 ===`);
        
        return {
            keyword,
            productNames: allProductNames,
            totalCount: allProductNames.length
        };
    }

    // 모든 키워드 크롤링
    async crawlAllKeywords() {
        const keywordProductMap = new Map(); // keyword -> Set of product names
        
        console.log(`\nTheSool 키워드 크롤링 시작: 총 ${this.keywords.length}개 키워드`);
        
        for (const keyword of this.keywords) {
            console.log(`\n[${keyword}] 크롤링 시작...`);
            
            const result = await this.crawlKeyword(keyword);
            
            // 제품명 정규화해서 저장
            const normalizedNames = new Set();
            result.productNames.forEach(name => {
                const normalized = normalizeName(name);
                if (normalized) normalizedNames.add(normalized);
            });
            
            keywordProductMap.set(keyword, normalizedNames);
            
            console.log(`[${keyword}] 최종 완료: 원본 ${result.totalCount}개 → 정규화 ${normalizedNames.size}개 제품`);
            
            // 첫 5개 정규화 결과 예시 출력
            if (normalizedNames.size > 0) {
                const examples = Array.from(normalizedNames).slice(0, 5);
                console.log(`  정규화 예시: ${examples.join(', ')}`);
            }
            
            await sleep(2000); // 키워드 간 대기
        }

        console.log(`\nTheSool 크롤링 완료`);
        return keywordProductMap;
    }
}

// 5. 기존 데이터셋과 매칭하여 키워드 업데이트
function updateKeywordsInDataset(existingData, keywordProductMap) {
    console.log('\n기존 데이터셋 키워드 업데이트 시작...');
    
    let updatedCount = 0;
    const keywordStats = new Map();
    
    // 각 키워드별 통계 초기화
    keywordProductMap.forEach((_, keyword) => {
        keywordStats.set(keyword, 0);
    });

    existingData.forEach(item => {
        const normalizedName = normalizeName(item.alcoholName || item['제품명']);
        
        if (!normalizedName) return;
        
        let matchedKeywords = [];
        
        // 각 키워드의 제품 목록과 비교
        keywordProductMap.forEach((productNames, keyword) => {
            if (productNames.has(normalizedName)) {
                matchedKeywords.push(keyword);
            }
        });
        
        if (matchedKeywords.length > 0) {
            // 여러 키워드에 매칭되면 콤마로 연결
            const newKeyword = matchedKeywords.join(', ');
            
            // 키워드 업데이트
            item.keyword = newKeyword;
            
            updatedCount++;
            matchedKeywords.forEach(kw => {
                keywordStats.set(kw, keywordStats.get(kw) + 1);
            });
            
            console.log(`  매칭: ${item.alcoholName || item['제품명']} → [${newKeyword}]`);
        }
    });
    
    console.log(`\n키워드 업데이트 완료: ${updatedCount}개 제품 업데이트`);
    console.log('\n키워드별 매칭 통계:');
    keywordStats.forEach((count, keyword) => {
        console.log(`  ${keyword}: ${count}개`);
    });
    
    return existingData;
}

// 6. 메인 실행 함수
async function runIntegratedCrawling() {
    const crawler = new TheSoolKeywordCrawler();
    const naverBaseUrl = 'https://terms.naver.com/list.naver?cid=58636&categoryId=58636&so=st3.asc&viewType=&categoryType=';
    const originalCsvPath = path.join(__dirname, 'traditional_liquor_df_final.csv');
    const updatedCsvPath = path.join(__dirname, 'integrated_traditional_liquor.csv');

    const finalHeaders = [
        'index', 'alcoholName', 'normalizedName', 'sweetness', 'sourness', 'freshness', 'body', 'degree', 'sparkling', 'alcoholType', 'keyword',
        'volume', 'price', 'manufacturer', 'ingredients', 'brewery', 'description', 'representative', 'address', 'contact', 'website',
        'foodPairing', 'imageURL', 'detailPageUrl', 'docId'
    ];

    let existingData = [];
    const updatedDataMap = new Map();

    // 1. 기존 데이터 로드
    if (fs.existsSync(originalCsvPath)) {
        console.log(`기존 데이터 로드: ${originalCsvPath}`);
        const fileContent = fs.readFileSync(originalCsvPath, 'utf8');
        
        existingData = await new Promise((resolve, reject) => {
            parse(fileContent, { columns: true, skip_empty_lines: true }, (err, records) => {
                if (err) return reject(err);
                
                const converted = records.map(row => {
                    const fieldMapping = {
                        '제품명': 'alcoholName', '단맛': 'sweetness', '신맛': 'sourness', 
                        '청량감': 'freshness', '바디감': 'body', '도수%': 'degree', 
                        '탄산': 'sparkling', '주종': 'alcoholType', '용량': 'volume', 
                        '가격': 'price', '제조사': 'manufacturer', '원재료': 'ingredients',
                        '양조장': 'brewery', '상세정보': 'description', '대표자명': 'representative',
                        '주소': 'address', '연락처': 'contact', '홈페이지': 'website',
                        '어울리는음식': 'foodPairing', '사진URL': 'imageURL'
                    };
                    
                    const convertedRow = {};
                    Object.keys(row).forEach(key => {
                        // 첫 번째 빈 컬럼 제거
                        if (key === '' || key.trim() === '') return;
                        
                        const newKey = fieldMapping[key] || key;
                        convertedRow[newKey] = row[key] || '';
                    });
                    
                    // keyword 컬럼 초기화 (기존 값이 있어도 빈칸으로 설정)
                    convertedRow.keyword = '';
                    
                    // normalizedName 생성 (매칭용)
                    convertedRow.normalizedName = normalizeName(convertedRow.alcoholName);
                    
                    finalHeaders.forEach(h => { 
                        if (!convertedRow.hasOwnProperty(h)) convertedRow[h] = ''; 
                    });
                    
                    return convertedRow;
                });
                
                resolve(converted);
            });
        });
        
        console.log(`기존 데이터 ${existingData.length}개 로드 완료`);
    console.log(`기존 keyword 컬럼 값들을 모두 빈칸으로 초기화합니다.`);
        
        existingData.forEach(item => {
            // docId가 없으면 detailPageUrl에서 추출하거나 index를 사용하여 임시 docId 생성
            if (!item.docId && item.detailPageUrl) {
                const urlParams = new URLSearchParams(new URL(item.detailPageUrl).search);
                item.docId = urlParams.get('docId');
            } else if (!item.docId && item.index) {
                item.docId = `legacy_${String(item.index).trim()}`;
            }

            // normalizedName으로 매핑 (매칭용)
            const key = item.normalizedName || normalizeName(item.alcoholName);
            if (key) updatedDataMap.set(key, item);
        });
    }

    // 2. TheSool에서 키워드별 제품명 크롤링
    const keywordProductMap = await crawler.crawlAllKeywords();

    // 3. 네이버 지식백과에서 새로운 상세 정보 크롤링
    const naverDetailUrls = await crawlAllPagesUrls(naverBaseUrl);
    console.log(`\n네이버 상세 페이지 크롤링 시작: ${naverDetailUrls.length}개`);
    
    const newNaverProducts = [];
    for (const url of naverDetailUrls) {
        const data = await crawlAlcoholDetails(url);
        if (data) {
            newNaverProducts.push(data);
        }
    }

    console.log(`네이버 상세 페이지 크롤링 완료: ${newNaverProducts.length}개`);

    // 4. 새로운 네이버 데이터로 기존 데이터 업데이트 또는 추가
    let maxIndex = Math.max(0, ...Array.from(updatedDataMap.values())
        .map(item => parseInt(item.index)).filter(num => !isNaN(num)));
    let nextIndex = maxIndex + 1;

    newNaverProducts.forEach(newItem => {
        const key = normalizeName(newItem.alcoholName);
        const existing = updatedDataMap.get(key) || {};

        // 새로 크롤링된 데이터가 기존 데이터를 덮어쓰지만,
        // 맛 그래프 등 특정 필드는 기존 값이 비어있지 않으면 유지
        const merged = { ...existing, ...newItem };

        // alcoholName은 원본 그대로 유지 (네이버 지식백과 원문)
        // normalizedName은 매칭용으로 생성
        merged.normalizedName = normalizeName(merged.alcoholName);

        ['sweetness', 'sourness', 'freshness', 'body', 'sparkling'].forEach(field => {
            if (!merged[field] && existing[field]) merged[field] = existing[field];
        });

        // 'index' 처리 (기존 CSV에서 넘어온 값 보존)
        if (existing.index && (merged.index === undefined || merged.index === null || String(merged.index).trim() === '')) {
            merged.index = existing.index;
        }

        // 새로운 항목이라면 index 할당
        if (!merged.index) {
            merged.index = `${nextIndex}`;
            nextIndex++;
        }

        updatedDataMap.set(key, merged);
    });

    // 5. TheSool 키워드 정보로 keyword 컬럼 업데이트 (매칭 디버깅 강화)
    console.log('\nTheSool 키워드 매칭 시작...');
    console.log(`기존 데이터: ${updatedDataMap.size}개`);
    
    let keywordUpdatedCount = 0;
    let matchingDetails = new Map(); // 키워드별 매칭 세부사항
    
    keywordProductMap.forEach((_, keyword) => {
        matchingDetails.set(keyword, { matches: [], misses: [] });
    });

    updatedDataMap.forEach((item, normalizedKey) => {
        let matchedKeywords = [];
        
        // normalizedKey로 TheSool 키워드와 매칭
        keywordProductMap.forEach((productNames, keyword) => {
            if (productNames.has(normalizedKey)) {
                matchedKeywords.push(keyword);
                matchingDetails.get(keyword).matches.push(item.alcoholName);
            } else {
                // 부분 매칭 시도 (디버깅용)
                let partialMatch = false;
                productNames.forEach(thesoolName => {
                    if (thesoolName.includes(normalizedKey) || normalizedKey.includes(thesoolName)) {
                        matchingDetails.get(keyword).misses.push(`부분매칭실패: "${item.alcoholName}" vs "${thesoolName}"`);
                        partialMatch = true;
                    }
                });
                if (!partialMatch) {
                    matchingDetails.get(keyword).misses.push(`매칭실패: "${item.alcoholName}" (${normalizedKey})`);
                }
            }
        });
        
        if (matchedKeywords.length > 0) {
            const newKeyword = matchedKeywords.join(', ');
            item.keyword = newKeyword;
            keywordUpdatedCount++;
            console.log(`  키워드 매칭: ${item.alcoholName} → [${newKeyword}]`);
        }
    });
    
    // 매칭 결과 상세 분석
    console.log('\n=== 키워드별 매칭 분석 ===');
    keywordProductMap.forEach((productNames, keyword) => {
        const matches = matchingDetails.get(keyword).matches;
        const misses = matchingDetails.get(keyword).misses.slice(0, 3); // 처음 3개만
        
        console.log(`\n[${keyword}]:`);
        console.log(`  TheSool에서 수집: ${productNames.size}개`);
        console.log(`  기존 데이터와 매칭: ${matches.length}개`);
        
        if (matches.length > 0) {
            console.log(`  매칭 성공 예시: ${matches.slice(0, 3).join(', ')}`);
        }
        if (misses.length > 0 && matches.length < 5) {
            console.log(`  매칭 실패 예시: ${misses.join(', ')}`);
        }
    });

    // 6. 최종 데이터 정리 및 CSV 저장
    const finalData = Array.from(updatedDataMap.values()).map(item => {
        const row = {};
        finalHeaders.forEach(header => {
            row[header] = (item[header] !== undefined && item[header] !== null) ? 
                String(item[header]).trim() : '';
        });
        return row;
    });

    const csvString = await new Promise((resolve, reject) => {
        stringify(finalData, { header: true, columns: finalHeaders }, (err, output) => {
            if (err) return reject(err);
            resolve(output);
        });
    });

    fs.writeFileSync(updatedCsvPath, csvString, 'utf8');
    
    console.log(`\n✅ 통합 크롤링 완료!`);
    console.log(`   입력 파일: ${originalCsvPath}`);
    console.log(`   출력 파일: ${updatedCsvPath}`);
    console.log(`   총 데이터: ${finalData.length}개`);
    console.log(`   새로운 네이버 데이터: ${newNaverProducts.length}개`);
    console.log(`   키워드 업데이트: ${keywordUpdatedCount}개`);
    console.log(`   이미지 S3 업로드: 완료`);

    // 키워드별 통계
    console.log('\n📊 키워드별 매칭 통계:');
    const keywordStats = new Map();
    keywordProductMap.forEach((_, keyword) => keywordStats.set(keyword, 0));
    
    finalData.forEach(item => {
        if (item.keyword) {
            item.keyword.split(', ').forEach(kw => {
                if (keywordStats.has(kw.trim())) {
                    keywordStats.set(kw.trim(), keywordStats.get(kw.trim()) + 1);
                }
            });
        }
    });
    
    keywordStats.forEach((count, keyword) => {
        if (count > 0) console.log(`   ${keyword}: ${count}개`);
    });
}

// 실행
runIntegratedCrawling().catch(console.error);