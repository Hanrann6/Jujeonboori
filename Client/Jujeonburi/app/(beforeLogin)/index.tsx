/* 앱 설치시 보이는 가장 초기 화면 */
import * as Font from "expo-font";
import { useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const fetchFonts = async () => {
    await Font.loadAsync({
        'BagelFatOne': require('../../assets/fonts/BagelFatOne-Regular.ttf')
    });
}

export default function IntroScreen() {
    const router = useRouter();
    const [fontsLoaded, setFontsLoaded] = useState(false);
    useEffect(() => {
        const loadFonts = async () => {
            await fetchFonts();
            setFontsLoaded(true);
            SplashScreen.hideAsync();
        };
        loadFonts();
    }, []);
    console.log("API_BASE:", API_BASE);


    if (!fontsLoaded) {
        // 폰트 로딩이 완료될 때까지 로딩 화면을 표시
        return null;
    }
    return (
        <View style={styles.container}>
            <View style={styles.titleContainer}>
                <Text style={styles.appTitle}>주전{"\n"}부리</Text>
            </View>
            <View style={styles.bottomContainer}>
                <TouchableOpacity style={styles.startButton} onPress={() => router.push("/signUp")}>
                    <Text style={styles.startButtonText}>시작하기</Text>
                </TouchableOpacity>
                <View style={styles.loginContainer}>
                    <Text style={styles.askText}>이미 계정이 있나요?</Text>
                    <TouchableOpacity onPress={() => router.push("/login")}>
                        <Text style={styles.loginText}>로그인</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container:
    {
        backgroundColor: "white",
        flex: 1,
        justifyContent: "center",
        alignItems: "center"
    },
    titleContainer:
    {
        flex: 8,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 20,
    },
    appTitle: {
        fontFamily: "BagelFatOne",
        fontSize: 85,
        textAlign: "center",
        lineHeight: 100,
        color: "black",
    },
    bottomContainer:{
        flex: 2,
        justifyContent: "center",
        alignItems: "center",
        gap: 8,

    },
    loginContainer: {
        flexDirection: "row",
        alignItems: "baseline",
        gap: 8,
        paddingBottom: 100,
    },
    startButton: {
        marginTop: 20,
        width: 300,
        height: 45,
        justifyContent: "center",
        padding: 10,
        backgroundColor: "#FBBC05",
        borderRadius: 8,
    },
    startButtonText: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#333",
        textAlign: "center"
    },
    askText:{
        color:"#808080"
    },
    loginText: {
        fontSize: 14,
        color: "black",
        paddingVertical: 0,
        fontWeight: "bold",
    }
});