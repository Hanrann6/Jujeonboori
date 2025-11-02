// app/(tabs)/(home)/_layout.tsx
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { TouchableOpacity } from "react-native";

function BackBtn() {
    const router = useRouter();
    return (
        <TouchableOpacity onPress={() => router.back()} style={{ paddingHorizontal: 12 }}>
            <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
    );
}
export default function HomeLayout() {
    
    return (
        <Stack initialRouteName="index" screenOptions={{ headerShown: false }} >
            <Stack.Screen
                name="index"
                options={{
                    headerShown: true,
                    title: "주전부리",
                    headerTitleStyle: { fontFamily: "BagelFatOne", fontSize: 24 },
                    headerTitleAlign: "center",
                    headerShadowVisible: true,
                }} />
            <Stack.Screen
                name="searchResult"
                options={{
                    headerShown: true,
                    title: "주전부리",
                    headerTitleStyle: { fontFamily: "BagelFatOne",fontSize: 20,},
                    headerTitleAlign: "center",
                    headerShadowVisible: true,
                }} />
            <Stack.Screen
                name="[id]"
                options={{
                    headerShown: true,
                    title: "상세페이지",
                    headerTitleStyle: {fontFamily: "BagelFatOne",fontSize: 20},
                    headerTitleAlign: "center",
                    headerShadowVisible: true,
                }} />
            <Stack.Screen
                name="reviewList"
                options={{
                    headerShown: true,
                    title: "리뷰 목록",
                    headerTitleStyle: { fontSize: 18, fontWeight: "700" },
                    headerTitleAlign: "center",
                    headerShadowVisible: true,
                }} />
            <Stack.Screen
                name="review/[reviewId]"
                options={{
                    headerShown: true,
                    title: "리뷰",
                    headerTitleStyle: { fontSize: 18, fontWeight: "700" },
                    headerTitleAlign: "center",
                    headerShadowVisible: true,
                }} />
            <Stack.Screen
                name="ocr"
                options={{
                    headerShown: true,
                    title: "사진으로 검색하기",
                    headerTitleStyle: { fontSize: 18, fontWeight: "700" },
                    headerTitleAlign: "center",
                    headerShadowVisible: true,
                }} />
        </Stack>
    );
}
