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
                    headerTitleStyle: {fontFamily:"BagelFatOne", fontSize: 20},
                    headerTitleAlign: "center",
                    headerShadowVisible: true,
                }} />
        </Stack>
    );
}
