import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

const testNum = 6; // 질문 개수

export default function TasteTest() {
    const { nickname = "" } = useLocalSearchParams<{ nickname?: string }>();
    const [pressed, setPressed] = useState(false);
    const [focused, setFocused] = useState(false);
    return (
        <View style={styles.container}>
            <View style={styles.titleContainer}>
                <Text style={styles.title}>
                    <Text style={styles.nickname}>{nickname}</Text>
                    님 취향에 맞춘{'\n'}전통주를 추천해드릴게요.
                </Text>
                <Text style={styles.hintText}>선택한 결과를 기반으로 맞춤 추천을 해드려요.</Text>
            </View>
            <View style={styles.testContainer}>
                <Text style={styles.testTitle}>질문 <Text >{testNum}</Text>.</Text>
                <Text style={styles.testText}>전통주를 마셔본 적이 있나요?</Text>
                <View style={styles.testBox}>
                    <Pressable
                            onFocus={() => setFocused(true)}
                            onBlur={() => setFocused(false)}
                            onPress={() => setPressed(true)}
                            style={[styles.answerBtn]}>
                        <Text style={styles.answerBtnText} >네, 먹어봤어요.</Text>
                    </Pressable>
                    <Pressable style={[styles.answerBtn]}>
                        <Text style={styles.answerBtnText}>아니요, 처음이에요.</Text>
                    </Pressable>
                </View>
            </View>
            <View style={styles.stepContainer}>

            </View>

        </View>
    );
};

const styles = StyleSheet.create({
    container:
    {
        backgroundColor: "white",
        flex: 1,
    },
    titleContainer: {
        flex: 4,
        justifyContent: "center",
        alignItems: "stretch",
        paddingLeft: 40,
        paddingTop: 70,
    },
    nickname: {
        fontWeight: "bold",
        fontSize: 24,
        color: "#EE8F00",
    },
    title: {
        fontWeight: "bold",
        fontSize: 24,
    },
    hintText: {
        fontSize: 12,
        color: "#828282",

    },
    testContainer: {
        flex: 8,
        justifyContent: "center",
        backgroundColor: "#EE8F00",
        padding: 20,
        marginTop: 10,
    },
    testTitle: {
        fontSize: 24,
        textAlign: "left",
        fontWeight: "bold",
        paddingLeft: 20,
    },
    testText: {
        fontSize: 20,
        textAlign: "left",
        fontWeight: "bold",
        paddingLeft: 20,
    },
    testBox: {
        flex: 4,
        backgroundColor: "blue",
        margin: 20,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
    answerBtn: {
        flex: 1,
        backgroundColor: "#EEE",
        borderRadius: 10,
        width: 150,
        height: 230,
        margin: 10,
        alignItems: "center",
        justifyContent: "center",

    },
    answerBtnText: {
        fontSize: 14,
        textAlign: "center",
    },
    stepContainer: {
        flex:4,
    }
});