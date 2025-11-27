export function validatePreference(body) {
  const { sweetness, sourness, carbonation, body: bd, refreshing, abv } = body;
  const nums = [sweetness, sourness, carbonation, bd, refreshing, abv];
  if (nums.some((v) => typeof v !== "number")) {
    return { ok: false, message: "모든 값은 숫자여야 합니다." };
  }
  return {
    ok: true,
    data: { sweetness, sourness, carbonation, body: bd, refreshing, abv },
  };
}
