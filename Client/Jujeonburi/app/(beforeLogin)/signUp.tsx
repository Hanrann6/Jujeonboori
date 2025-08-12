// app/(beforeLogin)/signUp.tsx

import { useRouter } from "expo-router";
import { Image, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
// import { login, me } from "@react-native-kakao/user";  // 실제 연동 시

export default function SignUpScreen() {
    // TODO: Kakao SDK 연결 함수 구현해서 버튼에 연결하기기
    const router = useRouter();
    const onKakao = () => {
    // await login();
    // const profile = await me();
    // const suggested = profile.kakaoAccount?.profile?.nickname ?? "";

    const suggested = ""; // 우선 ''(공백)으로로 설정. 연동 후 위 주석으로 교체
    router.push({ pathname: "/(beforeLogin)/setNick", params: { suggested } });
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
