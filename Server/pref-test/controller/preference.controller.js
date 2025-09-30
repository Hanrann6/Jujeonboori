import jwt from "jsonwebtoken"
import { validatePreference } from "../model/preference.model.js";
import { putPreferenceCsv } from "../service/s3.service.js";
import { upsertUserToPersonalize } from "../service/personalize.service.js";
import { getPreferenceCsv } from "../service/s3.service.js";

export async function submitPreference(req, res) {
  try {
    // // 쿠키에서 토큰 꺼내기
    // const token = req.cookies.accessToken;
    // if (!token) return res.status(401).json({ message: "토큰 없음" });

    // // JWT 검증 → userId = sub
    // const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // const userId = decoded.sub;
    // if (!userId)
    //   return res.status(400).json({ message: "토큰에 userId(sub)가 없음" });

    const userId = String(req.query.userId || req.body.userId || "");
    if (!userId)
      return res.status(400).json({ message: "userId가 필요합니다." });

    // 요청 body 검증
    const check = validatePreference(req.body);
    if (!check.ok) return res.status(400).json({ message: check.message });
    const pref = check.data;

    // S3 저장
    const { key } = await putPreferenceCsv(userId, pref);

    // Personalize 반영
    await upsertUserToPersonalize(userId, pref);

    // 이벤트 기록
    //await logPreferenceEvent(userId, pref);

    return res.status(200).json({ ok: true, s3Key: key });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "서버 오류", detail: err.message });
  }
}

// S3에서 선호도 결과 조회
export async function getPreference(req, res) {
  try {
    const userId = String(req.query.userId || req.body.userId || "");
    if (!userId) {
      return res.status(400).json({ message: "userId가 필요합니다." });
    }

    const pref = await getPreferenceCsv(userId);
    if (!pref) {
      return res.status(404).json({ message: "해당 유저 데이터 없음" });
    }

    return res.status(200).json(pref);
  } catch (err) {
    console.error("getPreference error:", err);
    return res.status(500).json({ message: "서버 오류", detail: err.message });
  }
}
