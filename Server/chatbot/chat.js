import dotenv from "dotenv";
dotenv.config({ path: "../.env" });
import OpenAI from "openai";
import fs from 'fs';
import readline from "node:readline";
import csv from "csv-parser";


const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // API 키를 .env에서 불러옴
});

// csv 파일 읽어오기
export async function loadCSVData(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => results.push(row))
      .on("end", () => resolve(results))
      .on("error", reject);
  });
}

// 질문하기
export async function askGPT(userQuestion, drinksData) {
  const context = drinksData // tokens maximum 에러나서 slice함
    .slice(0, 200)
    .map((drink) => `- ${drink["제품명"]}`)
    .join("\n");

  const prompt = `
너는 대한민국 전통주에 정통한 "전통주 추천 전문가 AI"야.

당신의 역할은 다음과 같습니다:

사용자가 입력한 문장에는 음식, 기분, 날씨, 계절, 상황, 장소, 분위기 등의 요소가 포함될 수 있습니다.  
당신은 그 내용을 바탕으로 아래에 제공된 전통주 목록 내에서만, 사용자에게 가장 적절한 전통주 3가지를 추천해야 합니다.

### 중요 조건:

1. 반드시 아래 전통주 목록 내의 제품명에서만 추천을 골라야 하며, 외부 지식이나 추가 정보를 사용해서 새로운 전통주를 생성하거나 추론하지 마세요.
2. 추천 결과는 단순히 이름만 나열하는 것이 아니라, 아래 요소들을 반드시 json 형식으로 출력하세요. 문자열 형태로 감싸지 마세요. 응답 전체가 JSON 객체여야 합니다.:
   [
  {
    "name": "제품명",
    "summary": "특징 요약",
    "reason": "사용자 질문에 어울리는 이유",
    "image": "이미지 URL",
    "detailPage": "상세페이지 URL"
  },
  ...
]
3. 추천 순서는 관련도 순으로 가장 잘 맞는 술부터 배치하세요.
4. 추천 항목마다 줄바꿈과 구분을 통해 사용자 입장에서 보기 쉽게 구성하세요.

### 데이터 제한 조건:

- 사용자는 질문만 입력하며, 전통주 목록 외에 다른 설명은 존재하지 않습니다.
- 제공된 전통주 목록 외 정보를 참고하거나 상상해서 보완하지 마세요.
- 추천하지 않은 전통주의 정보는 언급하지 마세요.

---

이제 사용자 질문과 전통주 목록을 제공합니다. 이를 바탕으로 위 조건을 모두 지켜 추천을 수행하세요.

[전통주 목록]
${context}

[사용자 질문]
${userQuestion}
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }],
  });

  return response.choices[0].message.content;
}


// //콘솔에서 질문 입력
// async function run() {
//   const drinksData = await loadCSVData("../alcohol_crawl/sorted_traditional_alcohol.csv");

//   const rl = readline.createInterface({
//     input: process.stdin,
//     output: process.stdout,
//   });

//   rl.question("전통주에 대해 궁금한 점을 입력하세요: ", async (userInput) => {
//     await askGPT(userInput, drinksData);
//     rl.close();
//   });
// }

// run();