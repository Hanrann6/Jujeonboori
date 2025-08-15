import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
    Keyboard,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from "react-native";

export default function NicknameScreen() {
    const router = useRouter();
    const { suggested = "" } = useLocalSearchParams<{ suggested?: string }>();
    const [name, setName] = useState(String(suggested ?? ""));

    // 2~12자, 한/영/숫자만 허용 (Android용)
    const valid = useMemo(() => /^[A-Za-z0-9가-힣]{2,12}$/.test(name), [name]);

    const onContinue = async () => {
        // TODO: 서버 저장
        await AsyncStorage.setItem("nickname", name.trim());
        router.replace({
            pathname: "/(initialProfile)", 
            params: { nickname: name }, // 입력받은 닉네임을 넘겨줌 
          });
    };

    return (
        <SafeAreaView style={styles.safe}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                <View style={styles.container}>
                    <View style={styles.titleContainer}>
                        <Text style={styles.title}>
                            주전부리에서 사용할{'\n'}닉네임을 입력해주세요.
                        </Text>
                    </View>
                    {/* 입력창 */}
                    <View style={styles.formContainer}>
                        <TextInput
                            value={name}
                            onChangeText={setName}
                            placeholder={`예) ${suggested || "닌자토끼"}`}
                            placeholderTextColor="#9CA3AF"
                            style={styles.input}
                            autoCapitalize="none"
                            autoCorrect={false}
                            maxLength={12}
                            returnKeyType="done"
                            onSubmitEditing={() => valid && onContinue()}
                            // Android에서 조합형 한글 입력 시 깜빡임 완화
                            importantForAutofill="no"
                            textContentType="none"
                        />

                        {!valid && name.length > 0 && (
                            <Text style={styles.hintText}>2–12자, 한글/영문/숫자만 사용할 수 있어요.</Text>
                        )}

                        <TouchableOpacity
                            style={[styles.continueBtn, { opacity: valid ? 1 : 0.5 }]}
                            disabled={!valid}
                            onPress={onContinue}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.continueBtnText}>계속</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableWithoutFeedback>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: "#fff"
    },
    container: {
        flex: 1,
        paddingHorizontal: 28,
    },
    titleContainer: {
        paddingTop: 70,
        paddingBottom: 30
    },
    title: {
        paddingHorizontal: 10,
        fontSize: 24,
        lineHeight: 30,
        fontWeight: "800",
        color: "#111",
        ...(Platform.OS === "android" ? { includeFontPadding: false } : null),
    },
    formContainer:{
        paddingHorizontal: 10,
        gap: 6,
        paddingTop: 4
    },
    input: {
        height: 44,
        borderRadius: 10,
        borderWidth: 1.2,
        borderColor: "#E0E0E0",
        paddingHorizontal: 12,
        backgroundColor: "#fff",
        fontSize: 14,
        color: "#111",
        ...(Platform.OS === "android" ? { includeFontPadding: false } : null),
    },
    hintText: {
        paddingHorizontal: 8,
        fontSize: 12,
        color: "#9CA3AF"
    },
    continueBtn: {
        height: 44,
        borderRadius: 10,
        backgroundColor: "#FBBC05",
        alignItems: "center",
        justifyContent: "center",
        marginTop: 4,
    },
    continueBtnText: {
        color: "#111",
        fontWeight: "700",
        fontSize: 14
    },
});