// app/(beforeLogin)/signUp.tsx
import { initializeKakaoSDK } from "@react-native-kakao/core";
import {
  login as kakaoLogin
} from "@react-native-kakao/user";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect } from "react";
import { Image, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
const API_BASE = process.env.EXPO_PUBLIC_API_URL!;
const APP_SCHEME = process.env.EXPO_PUBLIC_APP_SCHEME || "jujeonburi";
const KAKAO_NATIVE_KEY=process.env.EXPO_PUBLIC_KAKAO_NATIVE_KEY!;

//서버응답 타입
type KakaoResponse = {
  grant_type: string;
  access_token: string;
  refresh_token: string;
  access_token_expires_in: number;
  user?: {
    user_id: string | number;
    email?: string | null;
    nickname?: string | null;
    image_url?: string | null;
  };
  is_new_user: boolean;
}

export default function SignUpScreen() { 
  const router = useRouter();
   // 1) Kakao SDK 초기화 (앱 시작시 1회)
  useEffect(() => {
    try {
      initializeKakaoSDK(KAKAO_NATIVE_KEY);
    } catch (e) {
      console.warn("KakaoSDK init failed:", e);
    }
  }, []);

  // 2) 카카오 로그인 api
  // 2-1) 토큰 저장 함수
  const saveTokens = async (data: KakaoResponse) => {
    const expiresIn = Number(data.access_token_expires_in ?? 3600); // 초
    const accessExpiresAt = Date.now() + expiresIn * 1000; // 절대시각(ms) 단위로 바꿔서 저장 

    const ops: Promise<void>[] = [
      SecureStore.setItemAsync("access_token", data.access_token),
      SecureStore.setItemAsync("refresh_token", data.refresh_token),
      SecureStore.setItemAsync("access_expires_at", String(accessExpiresAt)),
    ];

    await Promise.all(ops);
  };
  // 2-2) 카카오 로그인 핸들러
  const onKakao = async()=>{
    try{
      const kakaoResult = await kakaoLogin();
      //console.log("Kakao login result:", kakaoResult);
      const kakaoAccessToken = kakaoResult.idToken;
      //console.log(kakaoAccessToken);
      if(!kakaoAccessToken) {
        throw new Error("카카오 인가코드를 받지 못했습니다.");
      }

      const res = await fetch(`${API_BASE}/oauth/login/kakao`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({id_token: kakaoAccessToken }),
      })

      if (!res.ok) {
        throw new Error("서버로부터 인가를 받지 못했습니다.");
      }

      const resJson: KakaoResponse = await res.json();
      await saveTokens(resJson);
      //await router.replace(resJson.is_new_user ? "/(beforeLogin)/setNick" : "/(tabs)/(home)/index");
      router.push("/(beforeLogin)/setNick");
    

    } catch (error) {
      console.log(error);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* 텍스트 영역 */}
        <View style={styles.IntroTextContainer}>
          <Text style={[styles.IntroText_1, styles.bold]}>전통주,{"\n"}</Text>
          <Text style={styles.IntroText_2}>
            어렵지 않게 즐길 수 있도록{"\n"}
            <Text style={styles.bold}>주전부리</Text>가 도와드릴게요.
          </Text>
        </View>
        {/* 버튼 영역 */}
        <View style={styles.buttonContainer}>
          {/* 카카오 회원가입 */}
          <TouchableOpacity onPress={onKakao} activeOpacity={0.8}>
            <Image source={require("../../assets/images/kakao_signUp_medium_wide.png")} style={styles.kakaoBtn}
              resizeMode="contain" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FFF"
  },
  container: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 20
  },
  IntroTextContainer: {
    flex: 9,
    justifyContent: "center",
    paddingBottom: 90,
  },
  bold: {
    fontWeight: "bold",
  },
  IntroText_1: {
    fontSize: 36,
    color: "#111",
    ...(Platform.OS === "android" ? { includeFontPadding: false } : null),
  },
  IntroText_2: {
    marginTop: -20,
    fontSize: 24,
    lineHeight: 30,
    color: "#333",
  },
  buttonContainer: {
    flex: 1,
    paddingBottom: 110,
    gap: 12,
  },
  kakaoBtn: {
    width: 300
  },
});
