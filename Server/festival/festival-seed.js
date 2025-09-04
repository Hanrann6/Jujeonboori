// 더미 데이터 생성 스크립트
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Festival from './model/festival.model.js';

dotenv.config();

const festivalData = [
    {
        festival_id: 1,
        name: "스페이스 스프리츠 페스타",
        description: "부산에서 열리는 다양한 주류를 경험할 수 있는 축제입니다.",
        location: "부산항국제전시 컨벤션센터",
        start_date: new Date("2025-03-01"),
        end_date: new Date("2025-03-02"),
        official_url: null,
        image_url: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&h=300&fit=crop"
    },
    {
        festival_id: 2,
        name: "2025 대한민국 주류대상 박람회",
        description: "한국 최대 규모의 주류 박람회로 다양한 전통주와 세계 각국의 주류를 만나볼 수 있습니다.",
        location: "SETEC",
        start_date: new Date("2025-03-07"),
        end_date: new Date("2025-03-09"),
        official_url: "https://korea-alcohol-expo.com",
        image_url: "https://example.com/images/korea_alcohol_expo.jpg"
    },
    {
        festival_id: 3,
        name: "2025 메가쇼",
        description: "광교컨벤션에서 열리는 대규모 주류 전시회입니다.",
        location: "광교컨벤션",
        start_date: new Date("2025-03-27"),
        end_date: new Date("2025-03-30"),
        official_url: null,
        image_url: "https://example.com/images/mega_show.jpg"
    },
    {
        festival_id: 4,
        name: "DRINK SEOUL & 대한민국 맥주 박람회",
        description: "서울에서 열리는 맥주와 주류 전문 박람회입니다.",
        location: "코엑스",
        start_date: new Date("2025-04-10"),
        end_date: new Date("2025-04-12"),
        official_url: null,
        image_url: "https://example.com/images/drink_seoul.jpg"
    },
    {
        festival_id: 5,
        name: "제 4회 수원주류박람회 경기주류관광페스타",
        description: "경기도 수원에서 열리는 지역 특색 주류 축제입니다.",
        location: "수원메쎄",
        start_date: new Date("2025-04-25"),
        end_date: new Date("2025-04-27"),
        official_url: null,
        image_url: "https://example.com/images/suwon_alcohol.jpg"
    },
    {
        festival_id: 6,
        name: "2025 서울 사케페스티벌",
        description: "일본 사케와 한국 전통주를 함께 즐길 수 있는 특별한 축제입니다.",
        location: "SETEC",
        start_date: new Date("2025-05-24"),
        end_date: new Date("2025-05-25"),
        official_url: null,
        image_url: "https://example.com/images/sake_festival.jpg"
    },
    {
        festival_id: 7,
        name: "막걸리 엑스포",
        description: "한국 전통 막걸리의 모든 것을 경험할 수 있는 박람회입니다.",
        location: "양재 AT센터",
        start_date: new Date("2025-05-23"),
        end_date: new Date("2025-05-25"),
        official_url: null,
        image_url: "https://example.com/images/makgeolli_expo.jpg"
    },
    {
        festival_id: 8,
        name: "2025 서울 국제 주류 & 와인 박람회",
        description: "세계 각국의 와인과 주류를 한자리에서 만나는 국제 박람회입니다.",
        location: "코엑스",
        start_date: new Date("2025-06-26"),
        end_date: new Date("2025-06-28"),
        official_url: null,
        image_url: "https://example.com/images/wine_expo.jpg"
    },
    {
        festival_id: 9,
        name: "2025 서울 바앤스피릿쇼",
        description: "바텐더와 칵테일 애호가들을 위한 전문 주류 박람회입니다.",
        location: "코엑스",
        start_date: new Date("2025-07-25"),
        end_date: new Date("2025-07-27"),
        official_url: null,
        image_url: "https://example.com/images/bar_spirit.jpg"
    },
    {
        festival_id: 10,
        name: "2025 부산국제주류박람회",
        description: "부산에서 열리는 국제적인 주류 박람회입니다.",
        location: "벡스코 제 1 전시장 2홀",
        start_date: new Date("2025-08-15"),
        end_date: new Date("2025-08-17"),
        official_url: null,
        image_url: "https://example.com/images/busan_alcohol.jpg"
    }
];

// DB 연결 & 삽입
async function seedFestivals() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB 연결 성공');
        
        // 기존 데이터 삭제
        await Festival.deleteMany({});
        console.log('기존 축제 데이터 삭제');
        
        // 새 데이터 삽입
        await Festival.insertMany(festivalData);
        console.log('축제 더미 데이터 삽입 완료');
        
        process.exit(0);
    } catch (error) {
        console.error('데이터 삽입 중 오류:', error);
        process.exit(1);
    }
}

seedFestivals();