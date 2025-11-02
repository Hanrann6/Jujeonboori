//app/lib/auth.ts

//토큰 관련 유틸 모듈
//저장/로드/만료체크/재발급/자동 Authorization 헤더 주입

import * as SecureStore from "expo-secure-store";

const API_BASE = process.env.EXPO_PUBLIC_API_URL!;
const KEY_USER_ID = "user_id";

//access token 만료시간: 받아올때는 초단위, 저장할때는 ms단위 절대시각으로,
const TOKENS = {
  access_token: "access_token",
  refresh_token: "refresh_token",
  access_expires_at: "access_expires_at", // ms 단위 절대시각
};
const CLOCK_SKEW_MS = 60 * 1000; // 만료 60초 전부터 갱신하도록 여유 시간
//로그인, 회원가입 통합 응답 타입
export type KakaoLoginResponse = {
  grant_type: "Bearer";
  access_token: string;
  refresh_token: string;
  access_token_expires_in?: number;
  user: {
    user_id: string | number;
    email?: string | null;
    nickname?: string | null;
    image_url?: string | null;
  };
  is_new_user: boolean;
};

export type ReissueResponse = {
  access_token: string;
  refresh_token: string;
  access_token_expires_in?: number; // 초
};

// 토큰 저장 (재발급/로그인 시에 사용)
export async function saveTokens(res: ReissueResponse) {
  const expiresIn = Number(res.access_token_expires_in)?? 3600;
  const accessExpiresAt = Date.now() + expiresIn * 1000; //만료되는 시점 (ms 단위 절대시각)
  
  const ops: Promise<void>[] = [
    SecureStore.setItemAsync(TOKENS.access_token, res.access_token),
    SecureStore.setItemAsync(TOKENS.access_expires_at, String(accessExpiresAt)),
    SecureStore.setItemAsync(TOKENS.refresh_token, res.refresh_token),    
];
  await Promise.all(ops);
}

// 토큰 로드
export async function loadTokens() {
  const [access_token, refresh_token, access_expires_at] = await Promise.all([
    SecureStore.getItemAsync(TOKENS.access_token),
    SecureStore.getItemAsync(TOKENS.refresh_token),
    SecureStore.getItemAsync(TOKENS.access_expires_at),
  ]);
  return {
    access_token,
    refresh_token,
    access_expires_at: access_expires_at ? Number(access_expires_at) : 0,
  };
}

// 토큰 삭제 (로그아웃 시에 사용)
export async function clearTokens() {
  await Promise.all([
    SecureStore.deleteItemAsync(TOKENS.access_token),
    SecureStore.deleteItemAsync(TOKENS.refresh_token),
    SecureStore.deleteItemAsync(TOKENS.access_expires_at),
    SecureStore.deleteItemAsync(KEY_USER_ID),
  ]);
}

// 재발급 요청 중복 방지 락 
// 이미 재발급 중이면 그 Promise를 그대로 공유
let inFlightRefresh: Promise<string> | null = null;

export async function getValidAccessToken(): Promise<string | null> {
  //console.log("[TOKENS]", await loadTokens());
  const {access_token, refresh_token, access_expires_at } = await loadTokens();
  if (!access_token) return null;

  //남은 시간이 60초 이하이면 재발급 시도
  const almostExpired = Date.now() > (access_expires_at - CLOCK_SKEW_MS);
  if (!almostExpired) return access_token;

  if (!refresh_token) return null;
  return await refreshAccessTokenCoalesced(refresh_token);
}
// 재발급 요청 중복 방지
// 재발급이 이미 진행 중이면 그 같은 Promise를 리턴하고 아니면 새로 재발급 -> 끝나면 락을 해제
async function refreshAccessTokenCoalesced(refresh_token: string) {
  if (!inFlightRefresh) {
    inFlightRefresh = refreshAccessToken(refresh_token).finally(() => {
      inFlightRefresh = null;
    });
  }
  return inFlightRefresh;
}

// access_token 재발급
async function refreshAccessToken(refresh_token: string): Promise<string> {
  const r = await fetch(`${API_BASE}/oauth/reissue`, {
    method: "POST",
    headers: { Authorization: `Bearer ${refresh_token}` },
  });
  if (!r.ok) {
    // 재발급 실패 → 세션 정리
    await clearTokens();
    throw new Error(`reissue 실패 (${r.status}) ${await r.text().catch(() => "")}`);
  }
  //발급받은 토큰 저장 
  const json = (await r.json()) as ReissueResponse;
  await saveTokens(json);
  console.log("Access token reissued", json.access_token);
  return json.access_token;
}

/** 자동 Authorization 헤더 + 401 시 한 번 재시도 */
export async function authedFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  let token = await getValidAccessToken();
  const headers = {
    ...(init.headers as Record<string, string> | undefined),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  let res = await fetch(input, { ...init, headers });
  if (res.status === 401) {
    // access_token 토큰 만료로 가정 → refresh_token 시도
    const { refresh_token } = await loadTokens();
    if (refresh_token) {
      try {
        token = await refreshAccessTokenCoalesced(refresh_token);
        const headers2 = {
          ...(init.headers as Record<string, string> | undefined),
          Authorization: `Bearer ${token}`,
        };
        res = await fetch(input, { ...init, headers: headers2 });
      } catch {
        // 재발급 실패 → 로그아웃 상태로
        await clearTokens();
      }
    }
  }
  return res;
}
// --- 카카오 로그인 통합 ---
export async function loginWithKakaoIdToken(idToken: string): Promise<{
  isNewUser: boolean;
}> {
  const res = await fetch(`${API_BASE}/oauth/login/kakao`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id_token: idToken }),
  });

  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`kakao login 실패 (${res.status}) ${raw}`);
  }

  const json = JSON.parse(raw) as KakaoLoginResponse;

  // 1) 토큰은 신규/기존 모두 저장해야 이후 온보딩/프로필 저장 API 호출 가능
  await saveTokens({
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    access_token_expires_in: Number.isFinite(Number(json.access_token_expires_in))
      ? Number(json.access_token_expires_in)
      : 3600,
  });

  // 2) 유저 식별자 + 프로필 캐시
  await saveUserId(json.user.user_id);

  // 3) 화면 분기용 리턴
  return { isNewUser: Boolean(json.is_new_user) };
}

export async function isLoggedIn() {
  const t = await getValidAccessToken();
  return !!t;
}

export async function logout(): Promise<void> {
  const { access_token, refresh_token } = await loadTokens();

  try {
    if (access_token && refresh_token) {
      await fetch(`${API_BASE}/oauth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${access_token}`,
        },
        body: JSON.stringify({ refreshToken: refresh_token }),
      });
    }
  } finally {
    await clearTokens();
  }
}

export async function deleteAccount() {
  await getValidAccessToken();
  const { access_token, refresh_token } = await loadTokens();
  if (!access_token || !refresh_token) throw new Error("로그인이 필요합니다.");
  const url = `${API_BASE}/users/me`;
  console.log("[DELETE] url:", url);
  console.log("[DELETE] auth(access):", access_token.slice(0, 20), "…");
  console.log("[DELETE] body:", { refreshToken: refresh_token.slice(0, 20) + "…" });

  const res = await fetch(`${API_BASE}/users/me`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${access_token}`,
    },

    body: JSON.stringify({ refreshToken: refresh_token }),
  });
  const raw = await res.text().catch(() => "");
  console.log("[DELETE] status:", res.status, res.statusText);
  console.log("[DELETE] raw:", raw);
  
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`회원탈퇴 실패 (${res.status}) ${msg || res.statusText}`);
  }

  await clearTokens();
  if (res.status === 204) return {};
  try { return await res.json(); } catch { return {}; }
}

//user id 저장
// 저장
export async function saveUserId(id: string | number) {
  await SecureStore.setItemAsync(KEY_USER_ID, String(id));
}

// 조회
export async function getUserId(): Promise<string | null> {
  const v = await SecureStore.getItemAsync(KEY_USER_ID);
  return v && v.trim() ? v : null;
}

// (선택) 삭제: 로그아웃 시 함께 지우고 싶다면 clearTokens에 포함
export async function clearUserId() {
  await SecureStore.deleteItemAsync(KEY_USER_ID);
}
