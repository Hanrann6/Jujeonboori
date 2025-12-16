# 🥂 주전부리

전통주에 관심이 많지만 관련 지식이 부족한 입문자들을 위해,<br>
사용자의 주류 선호도를 학습하고 날씨, 사용자 행동패턴(클릭, 찜, 리뷰) 등의 맥락을 반영하여,<br> 
개인 맞춤형 전통주를 추천해주는 AI 전통주 큐레이션 서비스입니다.


---

## 🛠 기술 스택 및 프레임워크

| 항목           | 내용                              |
|----------------|-----------------------------------|
| 언어           | JavaScript (ES6+), Typescript v5.8.3 , Node.js v22.14.0 |
| 런타임         | Node.js                            |
| 백엔드 프레임워크 | Express v4.18.2                      |
| 프론트엔드 프레임워크 | React Navtive v0.79.5, Expo v.53.0.22                    |
| AI     | Qdrant, Huggingface MiniLM, LangChain, Gemini  |
| 추천 시스템 | AWS Personalize, AWS S3 |
| 데이터 처리   | Jimp, CLOVA OCR, Gemini          |
| HTTP 클라이언트 | axios                            |
| 플랫폼         | GitHub, VSCode, Terminal (CLI 기반), AWS (EC2·S3)|

---

## 📁 폴더 구조

Jujeonboori/

├── Server/ </br>
│ ├── alcohol # 전통주 엔티티 관련 로직 </br>
│ ├── auth # 사용자 인증 관련 로직 </br>
│ ├── chatbot/ # RAG 챗봇 관련 코드 </br>
│ ├── recommend/ # 전통주 추천 </br>
│ │ └── aws-recommend # AWS Personalize 기반 추천 </br>
│ │ └── price-recommend # 가격 기반 추천 </br>
│ │ └── weather-recommend # 가격 기반 추천 </br>
│ ├── alcohol_crawl # 전통주 데이터셋 크롤링 </br>
│ ├── ocr # ocr 로직 </br>
│ ├── pref-test # 전통주 선호도 테스트 </br>
│ ├── personalize # 사용자 인터랙션 반영 </br>
│ ├── bookmark # 북마크 기능 </br>
│ ├── review # 리뷰 관련 </br>
│ ├── festival # 전통주 축제 관련 </br>
│ ├── config # 설정 파일 </br>
│ ├── routes # 라우터 </br>
│ ├── .env # 환경변수 파일 </br>
│ ├── server.js #서버 실행 파일 </br>
│ ├── Dockerfile # 배포 설정 </br>
│ └── package.json </br>
├── Client/ </br>
│ ├── app/ </br>
│ │ ├── (beforeLogin)/ # 로그인 </br>
│ │ │ ├── index.tsx # 온보딩 화면 </br>
│ │ │ ├── login.tsx # 로그인 화면</br>
│ │ │ ├── setNick.tsx # 닉네임 설정 화면 </br>
│ │ │ ├── signUp.tsx # 회원가입 화면 </br>
│ │ ├── (initialProfile)/ # 사용자 주류 프로필 설정 화면 </br>
│ │ │ ├── index.tsx # 테스트 화면 </br>
│ │ │ ├── taste_questions.json # 테스트 질문 및 선지 파일 </br>
│ │ │ ├── testResult.tsx # 주류 프로필 설정 결과 화면 </br>
│ │ ├── (tabs)/ # 탭 라우터 구조 </br>
│ │ │ ├── (activity)/index.tsx # 액티비티 탭 화면 </br>
│ │ │ ├── (chatbot)/index.tsx # 챗봇 탭 화면 </br>
│ │ │ ├── (festivals)/index.tsx # 축제 탭 화면 </br>
│ │ │ ├── (home)/ <br>
│ │ │ │ ├── review/[reviewId].tsx # 개별 리뷰 화면 <br>
│ │ │ │ ├── [id].tsx # 개별 전통주 상세페이지<br>
│ │ │ │ ├── index.tsx # 어플 메인화면 <br>
│ │ │ │ ├── ocr. tsx # 전통주 ocr 화면 <br>
│ │ │ │ ├── searchResult.tsx # 전통주 검색결과 화면 <br>
│ │ │ │ ├── reviewList.tsx # 개별 전통주 전체 리뷰 목록 <br>
│ │ │ ├── [username]/ # 마이페이지 <br>
│ │ │ │ ├── bookmark.tsx # 찜한 전통주 화면</br>
│ │ │ │ ├── changeNick.tsx # 닉네임 변경 화면 <br>
│ │ │ │ ├── delete.tsx # 회원탈퇴 화면 </br>
│ │ │ │ ├── index.tsx # 마이페이지 메인 화면 </br>
│ │ │ │ ├── myProfile.tsx # 사용자의 주류 취향 프로필 화면 </br>
│ │ │ │ ├── review.tsx # 작성한 리뷰 화면</br>
│ │ │ │ ├── setting.tsx # 설정 화면 <br>
│ │ ├── components/ # 모달, 컴포넌트 <br>
│ │ │ ├── AlcoholRecommend.tsx # 취향 기반 추천 컴포넌트 <br>
│ │ │ ├── PriceRecommend.tsx # 가격 기반 추천 컴포넌트 <br>
│ │ │ ├── ReviewModal.tsx # 리뷰 작성 모달 <br>
│ │ │ ├── Weathercard.tsx # 날씨 렌더링 컴포넌트 <br>
│ │ │ ├── WeatherRecommend.tsx # 날씨 기반 추천 컴포넌트 <br>
│ │ ├── lib/auth.ts #토큰 관련 함수 및 인증된 fetch 함수 코드<br>
│ ├── app.json/ </br>
│ ├── package.json/ </br>
└── README.md </br>


---

## 👥 팀원

| 이름       | 역할              |
|------------|-------------------|
| 육란     | 백엔드 / AI 설계. RAG 기반 챗봇, AWS Personalize 추천 기능, OCR, 선호도 테스트 API, 북마크 관리 API, Jenkins CI/CD |
| 송연우     | 백엔드. 전통주 세부 정보 크롤링, 위치 기반 날씨 API, 회원 API(로그인/탈퇴), 상세 전통주 API, 리뷰 작성/삭제/관리 API, 검색 필터링 구현 |
| 안유경     | 프론트엔드. UI 설계, BE-FE API 연결, 문서 작업 |

---

## 🔌 사용 API 및 리소스

- [OpenAI Google Gemini](https://ai.google.dev/gemini-api/docs?hl=ko)
- [Huggingface MiniLM Embedding Model](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2)
- [Langchain](https://www.langchain.com/)
- [Qdrant Vector DB](https://qdrant.tech/)
- [Naver Clova OCR](https://www.ncloud.com/product/aiService/ocr)
- [단기 예보 조회](http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0)
- [웹 스크래핑 JS 라이브러리](https://cheerio.js.org/)
- 전통주 데이터셋 (CSV, 약 650개 품목 포함)

---

## ✅ 주요 기능

① 전통주 취향 테스트<br>
② AWS Personalize 기반 취향 기반 추천 + 날씨, 가격 기반 전통주 추천 기능<br>
③ Gemini 기반 챗봇을 통한 전통주 추천 기능<br>
④ NAVER Clova OCR 기반 전통주 검색 기능<br>

---

## 🚀 How to Install

### 1. 레포지토리 클론
```
git clone https://github.com/Hanrann6/Jujeonboori.git
cd Server
```

### 2. 환경변수 설정
`.env` 파일을 생성하고 다음 정보를 입력합니다:

### 3. 의존성 설치
```
npm install
```

---

## 🔨 How to Build

---

## ✅ How to Test

---

## 📊 Description of Sample Data
### 1. 전통주 데이터 (650여개)
**출처**: 네이버 지식백과 웹 크롤링<br>
**파일**: `Server/alcohol_crawl/real_final.csv`<br><br>

**샘플 데이터**:
```csv
index,alcoholName,normalizedName,foodPairing,sweetness,sourness,freshness,body,degree,
alcoholType,keywords,volume,price,priceValue,ingredients,brewery,description,
representative,address,contact,website,imageUrl,detailPageUrl,docId
```
<br>

**필드 설명**:
| 필드명 | 타입 | 설명 | 예시 |
|--------|------|------|------|
| `index` | Number | 데이터 고유 ID (unique) | 20 |
| `alcoholName` | String | 전통주 이름 (필수) | "가평 잣 막걸리" |
| `normalizedName` | String | 정규화된 이름 | "가평잣막걸리" |
| `foodPairing` | String | 음식 페어링 정보 | "반찬으로 나오는 우리음식과 모두 잘 어울린다." |
| `sweetness` | Number | 단맛 (1-5) | 2 |
| `sourness` | Number | 신맛 (1-5) | 2 |
| `freshness` | Number | 청량감 (1-5) | 3 |
| `body` | Number | 바디감 (1-5) | 3 |
| `degree` | Number | 도수 | 6 |
| `alcoholType` | String | 주류 종류 | "탁주" |
| `keywords` | [String] | 키워드 배열 | [] |
| `volume` | String | 용량 | "750ml" |
| `price` | String | 가격 (표시용) | "￦1,450" |
| `priceValue` | Number | 가격 (숫자) | 1450 |
| `ingredients` | String | 원재료 | "쌀, 정제수, 쌀입국, 잣, 효모, 정제효소 등" |
| `brewery` | String | 제조사/양조장 | "가평 우리술" |
| `description` | String | 상세 설명 | "가평의 특산물을 넣어 만드는..." |
| `representative` | String | 대표자명 | "박성기" |
| `address` | String | 주소 | "경기도 가평군 조종면 대보간선로 26, 29" |
| `contact` | String | 연락처 | "070) 4115-8525" |
| `website` | String | 웹사이트 URL | "http://www.woorisool.kr" |
| `imageUrl` | String | 이미지 URL (S3) | "https://capstone-liquor-images.s3..." |
| `detailPageUrl` | String | 네이버 출처 URL | "https://terms.naver.com/entry..." |
| `docId` | String | 네이버 문서 ID | "3551492" |

<br>

**샘플 데이터**:
```csv
20,가평 잣 막걸리,가평잣막걸리,반찬으로 나오는 우리음식과 모두 잘 어울린다.,2,2,3,3,6,탁주,,750ml,"￦1,450",1450,"쌀, 정제수, 쌀입국, 잣, 효모, 정제효소 등",가평 우리술,"가평의 특산물을 넣어 만드는 막걸리...",박성기,"경기도 가평군 조종면 대보간선로 26, 29",070) 4115-8525,http://www.woorisool.kr,https://capstone-liquor-images.s3.ap-southeast-2.amazonaws.com/images/3551492-가평%20잣%20막걸리_main.jpg,https://terms.naver.com/entry.naver?docId=3551492&cid=58637&categoryId=58651,3551492
```

**MongoDB 저장 시 구조**:
```javascript
{
  _id: ObjectId("..."), // DB 자동 생성
  index: 20, // unique, required
  alcoholName: "가평 잣 막걸리", // required
  normalizedName: "가평잣막걸리",
  foodPairing: "반찬으로 나오는 우리음식과...",
  sweetness: 2,
  sourness: 2,
  freshness: 3,
  body: 3,
  degree: 6,
  alcoholType: "탁주",
  keywords: [],
  volume: "750ml",
  price: "￦1,450",
  priceValue: 1450,
  ingredients: "쌀, 정제수, 쌀입국, 잣, 효모, 정제효소 등",
  brewery: "가평 우리술",
  description: "가평의 특산물을 넣어 만드는...",
  representative: "박성기",
  address: "경기도 가평군 조종면 대보간선로 26, 29",
  contact: "070) 4115-8525",
  website: "http://www.woorisool.kr",
  imageUrl: "https://capstone-liquor-images.s3...",
  detailPageUrl: "https://terms.naver.com/entry...",
  docId: "3551492",
  createdAt: Date,
  updatedAt: Date
}
```
<br>

**데이터 특징**:
- 맛 프로필 (단맛, 신맛, 청량감, 바디감) 1-5 척도로 수치화
- 음식 페어링 정보 포함
- AWS S3에 이미지 업로드 완료
- 네이버 지식백과 원본 링크 보존

<br>

### 2. 축제 데이터 (2025년 기준)
**출처**: 수동 수집  
**파일**: `festival/festival-seed.js`
**필드 설명**:
| 필드명 | 타입 | 설명 | 예시 |
|--------|------|------|------|
| `festival_id` | Number | 축제 고유 ID (unique, required) | 2 |
| `name` | String | 축제명 (required, max 255자) | "2025 대한민국 주류대상 박람회" |
| `description` | String | 축제 설명 (required) | "한국 최대 규모의 주류 박람회..." |
| `location` | String | 개최 장소 (required, max 255자) | "SETEC" |
| `start_date` | Date | 시작일 (required) | "2025-03-07" |
| `end_date` | Date | 종료일 (required) | "2025-03-09" |
| `official_url` | String | 공식 웹사이트 (max 255자) | "https://korea-alcohol-expo.com" |
| `image_url` | String | 포스터 이미지 URL (max 255자) | "https://static.onoffmix.com/..." |
| `created_at` | Date | 생성일 (default: Date.now) | Date |

<br>

**샘플 데이터**:
```javascript
{
  festival_id: 2,
  name: "2025 대한민국 주류대상 박람회",
  description: "한국 최대 규모의 주류 박람회로 다양한 전통주와 세계 각국의 주류를 만나볼 수 있습니다.",
  location: "SETEC",
  start_date: new Date("2025-03-07"),
  end_date: new Date("2025-03-09"),
  official_url: "https://korea-alcohol-expo.com",
  image_url: "https://static.onoffmix.com/afv2/thumbnail/2025/01/23/v329b7b94977ac72fb05190e0d205a4310.jpg"
}
```
<br>

**MongoDB 저장 구조**:
```javascript
{
  _id: ObjectId("..."),
  festival_id: 2,
  name: "2025 대한민국 주류대상 박람회",
  description: "한국 최대 규모의 주류 박람회로...",
  location: "SETEC",
  start_date: ISODate("2025-03-07T00:00:00.000Z"),
  end_date: ISODate("2025-03-09T00:00:00.000Z"),
  official_url: "https://korea-alcohol-expo.com",
  image_url: "https://static.onoffmix.com/afv2/thumbnail/...",
  created_at: ISODate("2025-01-15T...")
}
```
<br>

---

## 🧾 커밋 메시지 규칙 (Conventional Commits)


| ✨ | feat | 새로운 기능 추가 |
| --- | --- | --- |
| 🔧 | fix | 버그 수정 |
| 📝 | docs | 문서 수정 |
| 🎨 | style | 코드 포맷팅, 오타 수정, 주석 수정 및 삭제 등 |
| ♻️ | refactor | 코드 리팩토링 |
| ✅ | test | 테스트 코드 |
| 💚 | chore | 빌드 및 패키지 수정 및 삭제 |
| 💄 | ui | UI 및 스타일 파일 추가 및 수정 |
| 🔀 | merge | 브랜치를 머지 |

