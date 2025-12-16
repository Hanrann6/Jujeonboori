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

