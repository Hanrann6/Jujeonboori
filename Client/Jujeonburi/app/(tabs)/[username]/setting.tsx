import { logout } from "@/app/lib/auth";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Setting() {
    const [loading, setLoading] = useState(false);
    const handleLogout = async () => {
        if (loading) return;
        setLoading(true);
        try {
            await logout();                    // 서버 로그아웃 + 로컬 토큰 삭제
            console.log("Logged out");
            router.replace("/(beforeLogin)");  // 로그인 전 스택으로
        } catch (e: any) {
            Alert.alert("로그아웃 실패", e?.message ?? "다시 시도해 주세요.");
        } finally {
            setLoading(false);
        }
    };
    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.container}>
                <Text style={styles.Title}>설정</Text>
                <View style={styles.BtnContainer}>
                    <TouchableOpacity style={styles.Btn} onPress={() => router.push("./changeNick")}>
                        <Text style={styles.BtnText}>닉네임 변경</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.Btn} onPress={handleLogout} disabled={loading}>
                        <Text style={styles.BtnText}>로그아웃</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.Btn} onPress={() => router.push("./delete")}>
                        <Text style={styles.BtnText}>회원탈퇴</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: "#FFFFFF"
    },
    container: {
        flex: 1,
        paddingHorizontal: 20,

    },
    Title: {
        fontSize: 22,
        fontWeight: "800",
        color: "#111827",
        margin: 20,
        marginTop: 0,
    },
    BtnContainer: {
        alignItems: "center",
    },
    Btn: {
        marginTop: 10,
        width: 320,
        height: 45,
        justifyContent: "center",
        padding: 10,
        backgroundColor: "white",
        borderRadius: 8,
        borderWidth: 1.5,
        borderColor: "gray",
    },
    BtnText: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#333",
        textAlign: "center"
    },
});