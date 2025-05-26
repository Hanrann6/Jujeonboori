// crawl_script.js - 전통주 지식백과 크롤링 스크립트

// ============================================================================
// 0. 필수 라이브러리 불러오기
// ============================================================================
require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse');
const { stringify } = require('csv-stringify');
const AWS = require('aws-sdk');

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
async function crawlAllPagesUrls(baseUrl) {
    let allDetailUrls = [];
    let currentPage = 1;
    let currentUrl = `${baseUrl}&page=${currentPage}`;
    console.log(`크롤링 시작: ${currentUrl}`);
    await sleep(1000);
    try {
        const response = await axios.get(currentUrl);
        const $ = cheerio.load(response.data);
        $('ul.content_list > li').each((_, el) => {
            const href = $(el).find('.info_area .subject .title a').attr('href');
            if (href && href.startsWith('/entry.naver')) {
                const absoluteUrl = new URL(href, currentUrl).href;
                allDetailUrls.push(absoluteUrl);
            }
        });
    } catch (err) {
        console.error('URL 수집 오류:', err.message);
    }
    return allDetailUrls;
}

async function crawlAlcoholDetails(detailPageUrl) {
    try {
        const res = await axios.get(detailPageUrl);
        const $ = cheerio.load(res.data);
        const name = $('h2.headword').text().trim();
        const docId = new URLSearchParams(new URL(detailPageUrl).search).get('docId');
        const imageUrl = $('#innerImage0').attr('origin_src') || '';
        let food = '';
        const foodEl = $('h3.stress:contains("어울리는 음식")').nextUntil('h3').filter('p.txt').last();
        if (foodEl.length > 0) {
            const text = foodEl.text().trim();
            const sentences = text.split(/(?<=[.?!])\s+/);
            food = sentences.at(-1);
            if (!food.match(/[.?!]$/)) food += '.';
        }
        return {
            제품명: name, docId, detailPageUrl,
            사진URL: imageUrl, 어울리는음식: food,
            단맛: '', 신맛: '', 청량감: '', 바디감: ''
        };
    } catch (err) {
        console.error('상세 페이지 오류:', detailPageUrl, err.message);
        return null;
    }
}

// ============================================================================
// 4. 메인 실행 함수
// ============================================================================
async function runDemo() {
    const mainListPageBaseUrl = 'https://terms.naver.com/list.naver?cid=58636&categoryId=58636&so=st3.asc&viewType=&categoryType=';
    const newCsvFilePath = path.join(__dirname, 'merged_traditional_alcohol_data.csv');
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
        existingAlcoholData.forEach(item => {
            if (!item.docId && item.detailPageUrl) {
                const urlParams = new URLSearchParams(new URL(item.detailPageUrl).search);
                item.docId = urlParams.get('docId');
            } else if (!item.docId && item.index) {
                item.docId = `legacy_${String(item.index).trim()}`;
            }
            const key = normalizeName(item.제품명);
            if (key) {
                updatedAlcoholDataMap.set(key, item);
            }
        });
    }

    // 2. 크롤링
    const allCollectedDetailUrls = await crawlAllPagesUrls(mainListPageBaseUrl);
    const newlyCrawledData = [];
    for (const url of allCollectedDetailUrls) {
        const data = await crawlAlcoholDetails(url);
        if (data) newlyCrawledData.push(data);
    }

    // 3. 병합
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
        const merged = { ...existing, ...newItem };

        ['단맛', '신맛', '청량감', '바디감', '탄산', 'keyword'].forEach(field => {
            if (!merged[field] && existing[field]) merged[field] = existing[field];
        });

        if (existing.index && !merged.index) merged.index = existing.index;
        if (existing[''] && !merged['']) merged[''] = existing[''];

        if (!merged.index) {
            merged.index = `${nextIndex}`;
            merged[''] = `${nextIndex}`;
            nextIndex++;
        }

        updatedAlcoholDataMap.set(key, merged);
    });

    // 4. CSV 저장
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
    console.log(`✅ CSV 생성 완료: ${newCsvFilePath}`);
}

runDemo();
