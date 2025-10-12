import mongoose from 'mongoose';
import fs from 'fs';
import Papa from 'papaparse';
import 'dotenv/config';
import Alcohol from './alcohol/model/alcohol.model.js';
import Festival from './festival/model/festival.model.js';

const festivalData = [
    // 3월 (2개)
    {
        festival_id: 1,
        name: "스페이스 스피리츠 페스타",
        description: "부산에서 열리는 다양한 주류를 경험할 수 있는 축제입니다.",
        location: "부산항국제전시 컨벤션센터",
        start_date: new Date("2025-03-01"),
        end_date: new Date("2025-03-02"),
        official_url: null,
        image_url: null
    },
    {
        festival_id: 2,
        name: "2025 대한민국 주류대상 박람회",
        description: "한국 최대 규모의 주류 박람회로 다양한 전통주와 세계 각국의 주류를 만나볼 수 있습니다.",
        location: "SETEC",
        start_date: new Date("2025-03-07"),
        end_date: new Date("2025-03-09"),
        official_url: "https://korea-alcohol-expo.com",
        image_url: "https://static.onoffmix.com/afv2/thumbnail/2025/01/23/v329b7b94977ac72fb05190e0d205a4810.jpg"
    },
    // 4월 (2개)
    {
        festival_id: 3,
        name: "대한민국맥주박람회 및 드링크서울",
        description: "대한민국맥주박람회 및 드링크서울은 주류 산업의 모든 밸류체인이 참여하는 국내 유일 맥주산업의 비즈니스 플랫폼으로, 전시와 더불어 컨퍼런스와 대회가 함께 열려 최신 트렌드와 기술을 공유하고 업계 네트워킹의 장으로 개최된다.",
        location: "코엑스",
        start_date: new Date("2025-04-10"),
        end_date: new Date("2025-04-12"),
        official_url: "https://www.coex.co.kr/exhibitions/대한민국맥주박람회-및-드링크서울/",
        image_url: "https://img2.stibee.com/20607_2535508_1732850225999902567.png"
    },
    {
        festival_id: 4,
        name: "제 4회 수원주류박람회 경기주류관광페스타",
        description: "경기도 수원에서 열리는 지역 특색 주류 축제입니다.",
        location: "수원메쎄",
        start_date: new Date("2025-04-25"),
        end_date: new Date("2025-04-27"),
        official_url: "https://www.theglassshow.co.kr",
        image_url: "https://suwonmesse.com/wp-content/uploads/kboard_thumbnails/3/202502/67a5711851f097287401.png;"
    },
    // 5월 (3개)
    {
        festival_id: 5,
        name: "막걸리 엑스포",
        description: "전통을 빚고, 지역을 잇고, 미래로 뻗다. 대한민국 막걸리 엑스포는 전통과 지역의 가치를 미래로 잇는 장입니다.",
        location: "양재 AT센터",
        start_date: new Date("2025-05-23"),
        end_date: new Date("2025-05-25"),
        official_url: "https://www.maxpo.co.kr",
        image_url: "https://www.maxpo.co.kr/theme/basic/img/past_expo_2025.png"
    },
    {
        festival_id: 6,
        name: "2025 서울 사케 페스티벌",
        description: "일본 사케와 한국 전통주를 함께 즐길 수 있는 특별한 축제입니다.",
        location: "SETEC",
        start_date: new Date("2025-05-24"),
        end_date: new Date("2025-05-25"),
        official_url: "https://www.sakefestival.co.kr",
        image_url: "https://www.setec.or.kr/upload/schedule/20250212/2D9241C1B4914359AD2AE14CC591D2D8.png"
    },
    {
        festival_id: 7,
        name: "2025 광주주류관광페스타",
        description: "광주주류관광페스타는 술과 여행을 사랑하는 MZ세대와 업계 관계자가 방문하는 축제형 박람회입니다.",
        location: "광주컨벤션",
        start_date: new Date("2025-05-29"),
        end_date: new Date("2025-06-01"),
        official_url: "https://www.liquorfesta.com",
        image_url: "https://file2.nocutnews.co.kr/newsroom/image/2025/05/30/202505301021286243_0.jpg"
    },
    // 6월 (1개)
    {
        festival_id: 8,
        name: "2025 서울국제주류 & 와인박람회",
        description: "세계 각국의 와인과 주류를 한자리에서 만나는 국제 박람회입니다.",
        location: "코엑스",
        start_date: new Date("2025-06-26"),
        end_date: new Date("2025-06-28"),
        official_url: "https://www.siwse.com",
        image_url: "https://www.siwse.com/en/img/landing_visual_2025_m01.jpg"
    },
    // 7월 (1개)
    {
        festival_id: 9,
        name: "2025 서울 바앤스피릿쇼",
        description: "서울바앤스피릿쇼는 새로운 주류산업의 문화와 트렌드를 이끄는 High-Class 주류 전시회입니다.",
        location: "코엑스",
        start_date: new Date("2025-07-25"),
        end_date: new Date("2025-07-27"),
        official_url: "https://www.barshow.co.kr",
        image_url: "https://tkfile.yes24.com/upload2/PerfBlog/202504/20250402/20250402-53323.jpg"
    },
    // 8월 (1개)
    {
        festival_id: 10,
        name: "2025 부산국제주류박람회",
        description: "부산/경남 지역기반의 최고의 주류 비즈니스 플랫폼이자 공급사, 도매사, 판매처 및 소비자를 한 자리에서 만날 수 있는 부산국제주류박람회, 2025년 8월 부산으로 초대합니다.",
        location: "벡스코 제1전시장 2홀",
        start_date: new Date("2025-08-15"),
        end_date: new Date("2025-08-17"),
        official_url: "http://bilie.co.kr",
        image_url: "https://busandabom.net/upload/2025%20부산국제주류박람회.jpg"
    },
    // 9월 (2개)
    {
        festival_id: 11,
        name: "고양시 전국 막걸리 축제",
        description: "가와지쌀의 도시 고양특례시, 맛과 멋을 빚다",
        location: "일산문화광장",
        start_date: new Date("2025-09-20"),
        end_date: new Date("2025-09-21"),
        official_url: null,
        image_url: "https://img3.yna.co.kr/etc/inner/KR/2025/09/01/AKR20250901043600060_01_i_P4.jpg"
    },
    {
        festival_id: 12,
        name: "2025 서울국제주류&와인박람회 마곡",
        description: "마곡에서 열리는 국제 주류 박람회입니다.",
        location: "코엑스 마곡 전시장",
        start_date: new Date("2025-09-25"),
        end_date: new Date("2025-09-27"),
        official_url: "http://magok.siwse.com",
        image_url: "https://coexmagok.co.kr/wp-content/uploads/2025/02/엠블럼국문_616px.jpg"
    },
    // 10월 (2개)
    {
        festival_id: 13,
        name: "제4회 디오니 주류박람회",
        description: "작년 전주에서 가장 핫!했던 디오니 주류박람회, 전북에서 가장 주목받는 주류 페스티벌이 돌아옵니다!",
        location: "디오니스토어",
        start_date: new Date("2025-10-25"),
        end_date: new Date("2025-10-26"),
        official_url: null,
        image_url: "https://tkfile.yes24.com/upload2/PerfBlog/202509/20250902/20250902-55132.jpg"
    },
    {
        festival_id: 14,
        name: "대전국제와인EXPO",
        description: "대한민국 순수혈통 와인의 시작, 대전",
        location: "대전컨벤션센터",
        start_date: new Date("2025-10-24"),
        end_date: new Date("2025-10-26"),
        official_url: "https://www.djwinefair.com",
        image_url: "https://example.com/images/wine_expo_daejeon.jpg"
    },
    // 11월 (2개)
    {
        festival_id: 15,
        name: "우리술대축제",
        description: "대한민국 우리술 대축제는 우리술의 가치와 우수성을 알리는 국내 최대의 전통주 행사입니다. 전국의 다양한 우리술을 한 자리에서 만날 수 있으며, 매년 다채로운 소비자 체험 프로그램을 경험해보세요.",
        location: "AT센터",
        start_date: new Date("2025-11-14"),
        end_date: new Date("2025-11-16"),
        official_url: "https://thesool.com/front/publication/M000000097/list.do",
        image_url: null
    },
    {
        festival_id: 16,
        name: "K-라이스페스타 일산",
        description: "관람객과 함께하는 국내 최대 규모 우리쌀•우리술 K-대축제",
        location: "일산 킨텍스 제 1전시장 3홀",
        start_date: new Date("2025-11-28"),
        end_date: new Date("2025-11-30"),
        official_url: null,
        image_url: "https://cdn.aflnews.co.kr/news/photo/202508/301578_153012_1043.jpg"
    },
    // 12월 (1개)
    {
        festival_id: 17,
        name: "2025 부산국제주류&와인박람회 12월",
        description: "부산에서 열리는 연말 국제 주류 박람회입니다.",
        location: "벡스코",
        start_date: new Date("2025-12-19"),
        end_date: new Date("2025-12-21"),
        official_url: "https://busan.siwse.com",
        image_url: "https://busan.siwse.com/img/en/busan_landing_visual_2025_m01.jpg"
    }
];

async function seedAllData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        await Festival.deleteMany({});
        await Festival.insertMany(festivalData);
        console.log(`축제 데이터 삽입 완료\n`);

        const csvFile = fs.readFileSync('./Server/alcohol_crawl/real_final.csv', 'utf8');
        
        await new Promise((resolve, reject) => {
            Papa.parse(csvFile, {
                header: true,
                skipEmptyLines: true,
                complete: async (results) => {
                    try {
                        await Alcohol.deleteMany({});
                        await Alcohol.insertMany(results.data);
                        console.log(`전통주 데이터 삽입 완료\n`);
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                },
                error: (error) => {
                    reject(error);
                }
            });
        });
        
        process.exit(0);
        
    } catch (error) {
        console.error('데이터 삽입 중 오류:', error);
        process.exit(1);
    }
}

seedAllData();