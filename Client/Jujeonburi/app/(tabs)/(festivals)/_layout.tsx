// app/(tabs)/(festival)/_layout.tsx
import { Stack } from "expo-router";

export default function FestivalLayout() {
    return (
        <Stack>
            <Stack.Screen
                name="index"
                options={{
                    headerShown: true,
                    title: "우리 전통주 축제",
                    headerTitleStyle: { fontSize: 18, fontWeight: "700" },
                    headerTitleAlign: "center",
                    headerShadowVisible: true,
                }} />
        </Stack>
    );
}
