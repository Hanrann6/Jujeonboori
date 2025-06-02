import * as recombee from "recombee-api-client";
import dotenv from "dotenv";
dotenv.config({ path: "../.env" });
const rqs = recombee.requests;

// Recombee 클라이언트 설정
const client = new recombee.ApiClient(process.env.RECOMBEE_DB, process.env.RECOMBEE_PRIVATE_TOKEN, {
  region: "eu-west",
  timeout: 10000,
});

async function recommendByUserPref(userId, count = 5, preference = {}) {
  const { sweetness, sourness, sparkling, body, abv, type, minPrice, maxPrice } = preference;

  // 값이 모두 정수 단위여서 +- 1.0 기준으로 filter 계산
  const filter = `
    'sweetness' >= ${sweetness - 1.0} and 'sweetness' <= ${sweetness + 1.0} and
    'sourness' >= ${sourness - 1.0} and 'sourness' <= ${sourness + 1.0} and
    'sparkling' >= ${sparkling - 1.0} and 'sparkling' <= ${sparkling + 1.0} and
    'body' >= ${body - 1.0} and 'body' <= ${body + 1.0} and
    'abv' >= ${abv - 3} and 'abv' <= ${abv + 3} and
    'type' == "${type}" and
    'price' >= ${minPrice} and 'price' <= ${maxPrice}
  `;

  const result = await client.send(
    new rqs.RecommendItemsToUser(userId, count, {
      filter: filter,
      returnProperties: true,
      cascadeCreate: true,
    })
  );

  return result.recomms.map((item) => ({
    name: item.values.name,
    reason: `주류 ${item.values.type} 중 가격 7000~15000원 사이의 ${item.values.price}원 술. 단맛 ${item.values.sweetness}, 신맛 ${item.values.sourness}, 청량감 ${item.values.sparkling}, 바디감 ${item.values.body}, 도수 ${item.values.abv} 등 유사 수치`,
  }));
}

// 실행 테스트
(async () => {
  //임시 유저 가정
  const userId = "test1";
  const userPref = {
    sweetness: 3,
    sourness: 2,
    sparkling: 2,
    body: 3,
    abv: 12,
    type: "탁주",
    minPrice: 7000,
    maxPrice: 15000
  };

  try {
    const result = await recommendByUserPref(userId, 5, userPref);
    console.log("추천 결과:");
    result.forEach((item, i) => {
      console.log(`${i + 1}. ${item.name}:  ${item.reason}`);
    });
  } catch (err) {
    console.error("추천 실패:", err.message);
  }
})();
