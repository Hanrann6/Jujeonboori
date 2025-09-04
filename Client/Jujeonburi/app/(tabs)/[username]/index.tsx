//app/(tabs)/[username/index.tsx

import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";

export default function MyPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState<string>("");

  useEffect(() => {
    (async () => {
      const nick = (await AsyncStorage.getItem("nickname")) ?? "";
      setNickname(nick);
    })();
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>
          <Text style={styles.nick}>{nickname || "사용자"}</Text>님의 정보
        </Text>
        <View style={styles.optionContainer}>
         <ListItem
            icon={<Ionicons name="podium-outline" size={25} color="#F59E0B" />}
            label="주류 취향 프로필"
            onPress={() => router.push("/(tabs)/[username]/myProfile")}
          />
          <ListItem
            icon={<Ionicons name="heart-outline" size={25} color="#F59E0B" />}
            label="찜한 전통주"
            onPress={() => router.push("/(tabs)/[username]/bookmark")}
          />
          <ListItem
            icon={<Ionicons name="chatbubble-ellipses-outline" size={25} color="#F59E0B" />}
            label="작성한 리뷰"
            onPress={() => router.push("/(tabs)/[username]/review")}
          />
          <ListItem
            icon={<Ionicons name="settings-outline" size={25} color="#F59E0B" />}
            label="설정"
            onPress={() => router.push("/(tabs)/[username]/setting")}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

/** 한 줄 항목 */
function ListItem({
  icon,
  label,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.row}
      android_ripple={{ color: "#F3F4F6" }}
    >
      <View style={styles.rowLeft}>
        <View style={styles.iconWrap}>{icon}</View>
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={22} color="#111827" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    margin:20,
    marginTop:40
  },
  nick: {
     color: "#F59E0B" 
  },
  optionContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 8,
    justifyContent: "space-between",
  },
  rowLeft: {
     flexDirection: "row", 
     alignItems: "center", 
     gap: 15 },

  iconWrap: {
    width: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    lineHeight: 20,
  },
});
