import { validatePreference } from "../model/preference.model.js";
import { putPreferenceCsv } from "../service/s3.service.js";
import {
  upsertUserToPersonalize,
  logPreferenceEvent,
} from "../service/personalize.service.js";

export async function submitPreference(req, res) {
  try {
    const userId = String(req.query.userId || req.body.userId || "");
    if (!userId)
      return res.status(400).json({ message: "userId가 필요합니다." });

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
