//app/lib/auth.ts

//토큰 관련 유틸 모듈
//저장/로드/만료체크/재발급/자동 Authorization 헤더 주입

// app/lib/auth.ts
import * as SecureStore from "expo-secure-store";

const API_BASE = process.env.EXPO_PUBLIC_API_URL!;

//access token 만료시간: 받아올때는 초단위, 저장할때는 ms단위 절대시각으로,
const TOKENS = {
  access_token: "access_token",
  refresh_token: "refresh_token",
  access_expires_at: "access_expires_at", // ms 단위 절대시각
};
const CLOCK_SKEW_MS = 60 * 1000; // 만료 60초 전부터 갱신하도록 여유 시간

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
  ]);
}

// 재발급 요청 중복 방지 락 
// 이미 재발급 중이면 그 Promise를 그대로 공유
let inFlightRefresh: Promise<string> | null = null;

export async function getValidAccessToken(): Promise<string | null> {
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

export async function isLoggedIn() {
  const t = await getValidAccessToken();
  return !!t;
}
