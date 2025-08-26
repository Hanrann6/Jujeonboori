// app/(tabs)/(home)/_layout.tsx
import { Stack } from "expo-router";

export default function HomeLayout() {
    return (
        <Stack>
            <Stack.Screen
                name="index"
                options={{
                    headerShown: true,
                    title: "주전부리",
                    headerTitleStyle: { fontFamily: "BagelFatOne", fontSize: 20 },
                    headerTitleAlign: "center",
                    headerShadowVisible: true,
                }} />
            <Stack.Screen
                name="[id]"
                options={{
                    headerShown: true,
                    title: "상세페이지",
                    headerTitleStyle: { fontSize: 18, fontWeight: "700" },
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
        </Stack>
    );
}
