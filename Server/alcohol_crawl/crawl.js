// ============================================================================
// 0. 필수 라이브러리 불러오기
// ============================================================================
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


// ============================================================================
// 1. AWS S3 설정
// ============================================================================
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});

const s3 = new AWS.S3();
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;

// ============================================================================
// 2. 유틸리티 함수
// ============================================================================
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function normalizeName(name) {
    return name?.replace(/\s+/g, '')
                .replace(/[^\w가-힣]/g, '') // 특수문자 제거
                .toLowerCase()
                .trim();
}


// ============================================================================
// 3. 크롤링 함수
// ============================================================================
/**
 * 전통주 목록 페이지를 끝까지 크롤링하여 모든 상세 페이지 URL들을 수집합니다.
 * @param {string} baseUrl - 전통주 목록 페이지의 기본 URL
 * @returns {Promise<string[]>} - 수집된 상세 페이지 URL들의 배열
 */
async function crawlAllPagesUrls(baseUrl) {
    const visitedPages = new Set();
    const allDetailUrls = new Set();
    let pageQueue = [baseUrl];

    while (pageQueue.length > 0) {
        const currentUrl = pageQueue.shift();
        if (visitedPages.has(currentUrl)) continue;
        visitedPages.add(currentUrl);

        console.log(`\n크롤링 시작: ${currentUrl}`);
        await sleep(1000);

        try {
            const response = await axios.get(currentUrl);
            const $ = cheerio.load(response.data);

            // 1. 컨텐츠 URL 수집
            $('ul.content_list > li .info_area .subject .title a').each((_, el) => {
                const href = $(el).attr('href');
                if (href && href.startsWith('/entry.naver')) {
                    const absoluteUrl = new URL(href, currentUrl).href;
                    allDetailUrls.add(absoluteUrl);
                }
            });

            // 2. 다음 페이지 링크 수집
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
            console.error(`❌ 오류 발생 (${currentUrl}):`, err.message);
        }
    }

    console.log(`\n✅ 모든 페이지 순회 완료. 총 ${allDetailUrls.size}개의 상세 페이지 URL 수집.`);
    return Array.from(allDetailUrls);
}



/**
 * 전통주 상세 페이지를 방문하여 데이터를 추출하고, 대표 이미지를 S3에 직접 업로드합니다.
 * @param {string} detailPageUrl - 크롤링할 전통주 상세 페이지의 URL
 * @returns {Promise<Object|null>} - 크롤링된 전통주 데이터 객체 또는 오류 발생 시 null
 */
async function crawlAlcoholDetails(detailPageUrl) {
    console.log(`  상세 페이지 크롤링 시작: ${detailPageUrl}`);
    await sleep(500); // 상세 페이지 요청 간 0.5초 딜레이

    try {
        const res = await axios.get(detailPageUrl);
        const $ = cheerio.load(res.data);
        const name = $('h2.headword').text().trim();
        const docId = new URLSearchParams(new URL(detailPageUrl).search).get('docId');

        // 상세 정보 추출
        const alcoholData = {
            detailPageUrl: detailPageUrl,
            docId: docId,
            제품명: name || $('.info_area .subject .title a').first().text().trim() || '알 수 없는 제품'
        };

        $('.info_area .related .info').each((index, element) => {
            const labelElement = $(element).contents().filter(function() {
                return this.nodeType === 3 && $(this).text().trim() !== '';
            }).text().trim();
            const value = $(element).find('.data').text().trim();

            switch (labelElement) {
                case '상품명': if(alcoholData.제품명 === '알 수 없는 제품') alcoholData.제품명 = value; break;
                case '주종': alcoholData.주종 = value; break;
                case '도수': alcoholData['도수%'] = value; break;
                case '용량': alcoholData.용량 = value; break;
                case '가격': alcoholData.가격 = value; break;
                case '원재료': alcoholData.원재료 = value; break;
                case '제조사': alcoholData.제조사 = value; break;
            }
        });

        // 어울리는 음식 추출 (마지막 문장만)
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
        alcoholData.어울리는음식 = foodPairingText;

        // 이미지 URL 및 S3 업로드
        let mainImageUrl = null;
        const productNameForFileName = alcoholData.제품명.replace(/[^a-zA-Z0-9가-힣ㄱ-ㅎㅏ-ㅣ\s]/g, '');

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
                alcoholData.사진URL = s3UploadData.Location;
                console.log(`  [${alcoholData.제품명}] 제품 대표 이미지 S3 저장 완료: ${s3UploadData.Location}`);
            } catch (s3Err) {
                console.error(`  [${alcoholData.제품명}] 제품 대표 이미지 S3 업로드 실패:`, s3Err.message);
                alcoholData.사진URL = mainImageUrl; // S3 업로드 실패 시 원본 URL 유지
            }
        } else {
            console.log(`  [${alcoholData.제품명}] 제품 대표 이미지 URL을 찾을 수 없습니다.`);
            alcoholData.사진URL = '';
        }

        // 맛 그래프 관련 속성 초기화 (웹사이트에서 이미지로 제공되어 직접 추출 불가)
        alcoholData.단맛 = "";
        alcoholData.신맛 = "";
        alcoholData.청량감 = "";
        alcoholData.바디감 = "";
        alcoholData.사진경로 = '';

        // 필요한 모든 필드가 있는지 확인하고 없으면 빈 문자열로 초기화
        const allExpectedFields = [
            '', 'index', '제품명', '단맛', '신맛', '청량감', '바디감', '도수%', '탄산', '주종', 'keyword',
            '용량', '가격', '제조사', '원재료', '어울리는음식', '사진URL', 'detailPageUrl', 'docId'
        ];
        for (const field of allExpectedFields) {
            if (!Object.hasOwn(alcoholData, field)) {
                alcoholData[field] = '';
            }
        }

        return alcoholData;
    } catch (err) {
        console.error('상세 페이지 오류:', detailPageUrl, err.message);
        return null;
    }
}

/**
 * 파일 경로의 확장자에 따라 적절한 Content-Type을 반환합니다.
 * @param {string} filePath - 파일의 전체 경로 또는 파일명
 * @returns {string} - 파일의 Content-Type (MIME 타입)
 */
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


// ============================================================================
// 4. 메인 실행 함수
// ============================================================================
async function runDemo() {
    const mainListPageBaseUrl = 'https://terms.naver.com/list.naver?cid=58636&categoryId=58636&so=st3.asc&viewType=&categoryType=';
    const newCsvFilePath = path.join(__dirname, 'merged_traditional_alcohol.csv');
    const originalCsvFilePath = path.join(__dirname, 'traditional_liquor_df_final.csv');

    const finalHeaders = [
        '', 'index', '제품명', '단맛', '신맛', '청량감', '바디감', '도수%', '탄산', '주종', 'keyword',
        '용량', '가격', '제조사', '원재료',
        '어울리는음식', '사진URL', 'detailPageUrl', 'docId'
    ];

    let existingAlcoholData = [];
    const updatedAlcoholDataMap = new Map();

    // 1. 기존 CSV 로드
    if (fs.existsSync(originalCsvFilePath)) {
        console.log(`\n기존 CSV 파일 (${originalCsvFilePath}) 로드 중...`);
        const fileContent = fs.readFileSync(originalCsvFilePath, 'utf8');
        existingAlcoholData = await new Promise((resolve, reject) => {
            parse(fileContent, { columns: true, skip_empty_lines: true }, (err, records) => {
                if (err) return reject(err);
                const filled = records.map(row => {
                    finalHeaders.forEach(h => { if (!Object.hasOwn(row, h)) row[h] = ''; });
                    return row;
                });
                resolve(filled);
            });
        });
        console.log(`기존 데이터 ${existingAlcoholData.length}개 로드 완료.`);

        existingAlcoholData.forEach(item => {
            // docId가 없으면 detailPageUrl에서 추출하거나 index를 사용하여 임시 docId 생성
            if (!item.docId && item.detailPageUrl) {
                const urlParams = new URLSearchParams(new URL(item.detailPageUrl).search);
                item.docId = urlParams.get('docId');
            } else if (!item.docId && item.index) {
                item.docId = `legacy_${String(item.index).trim()}`;
            }

            // Map의 키는 정규화된 제품명 사용
            const key = normalizeName(item.제품명);
            if (key) {
                updatedAlcoholDataMap.set(key, item);
            } else {
                console.warn(`경고: 기존 데이터에 식별 가능한 키 (제품명)가 없어 Map에 추가할 수 없습니다. 이 항목은 최종 CSV에 포함되지 않을 수 있습니다.`, item);
            }
        });
    } else {
        console.log(`\n기존 CSV 파일 (${originalCsvFilePath})이 없습니다. 새로운 파일을 처음부터 생성합니다.`);
    }

    // 2. 모든 페이지 크롤링
    const allCollectedDetailUrls = await crawlAllPagesUrls(mainListPageBaseUrl);
    console.log(`\n총 ${allCollectedDetailUrls.length}개의 고유한 상세 페이지 URL 수집 완료.`);

    const newlyCrawledData = [];
    console.log(`\n총 ${allCollectedDetailUrls.length}개의 상세 페이지 데이터 크롤링 진행. (이미지는 AWS S3에 직접 업로드)`);

    for (const url of allCollectedDetailUrls) {
        const data = await crawlAlcoholDetails(url);
        if (data) {
            newlyCrawledData.push(data);
        }
    }

    // 3. 병합 (기존 로직 유지, normalizeName 기반)
    let maxIndex = Math.max(
        0,
        ...Array.from(updatedAlcoholDataMap.values())
            .map(item => parseInt(item.index))
            .filter(num => !isNaN(num))
    );
    let nextIndex = maxIndex + 1;

    newlyCrawledData.forEach(newItem => {
        const key = normalizeName(newItem.제품명);
        const existing = updatedAlcoholDataMap.get(key) || {};

        // 새로 크롤링된 데이터가 기존 데이터를 덮어쓰지만,
        // 맛 그래프 등 특정 필드는 기존 값이 비어있지 않으면 유지하는 로직
        const merged = { ...existing, ...newItem };

        ['단맛', '신맛', '청량감', '바디감', '탄산', 'keyword'].forEach(field => {
            if (!merged[field] && existing[field]) merged[field] = existing[field];
        });

        // 'index' 및 첫 번째 빈 컬럼 처리 (기존 CSV에서 넘어온 값 보존)
        if (existing.index && (merged.index === undefined || merged.index === null || String(merged.index).trim() === '')) {
            merged.index = existing.index;
        }
        if (existing[''] && (merged[''] === undefined || merged[''] === null || String(merged['']).trim() === '')) {
            merged[''] = existing[''];
        }

        // 새로운 항목이라면 index 할당
        if (!merged.index) {
            merged.index = `${nextIndex}`;
            merged[''] = `${nextIndex}`;
            nextIndex++;
        }

        updatedAlcoholDataMap.set(key, merged);
    });

    // 4. 최종 데이터 정리 및 새로운 CSV 파일로 저장
    const finalAlcoholData = Array.from(updatedAlcoholDataMap.values()).map(item => {
        const row = {};
        finalHeaders.forEach(header => {
            row[header] = item[header] !== undefined && item[header] !== null ? String(item[header]).trim() : '';
        });
        return row;
    });

    const outputCsvString = await new Promise((resolve, reject) => {
        stringify(finalAlcoholData, { header: true, columns: finalHeaders }, (err, output) => {
            if (err) return reject(err);
            resolve(output);
        });
    });

    fs.writeFileSync(newCsvFilePath, outputCsvString, 'utf8');
    console.log(`\n✅ 데이터가 ${newCsvFilePath} 파일에 성공적으로 업데이트되었습니다. (총 ${finalAlcoholData.length}개 항목)`);
    console.log('이미지는 AWS S3에 업로드되었습니다.');
}

runDemo();