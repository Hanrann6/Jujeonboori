// app/(tabs)/[username]/bookmark.tsx
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system";
import { useFocusEffect, useRouter } from "expo-router";
import Papa from "papaparse";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import csvAsset from "../../../assets/data/trad_alcohol.csv";

const FAV_KEY = "@fav:alcohol";

type AlcoholRow = {
  "제품명": string;
  "주종"?: string;
  "도수%": number;
  "사진URL"?: string;
  "docId"?: string | number;
};
type Meta = { id: string; name: string; imageUrl?: string };

async function getFavIds(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(FAV_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw) as string[]; } catch { return []; }
}
async function setFavIds(ids: string[]) {
  await AsyncStorage.setItem(FAV_KEY, JSON.stringify([...new Set(ids)]));
}
async function removeFav(id: string) {
  const now = await getFavIds();
  await setFavIds(now.filter(x => x !== id));
}
async function loadMetaMap(): Promise<Map<string, Meta>> {
  const map = new Map<string, Meta>();
  const asset = Asset.fromModule(csvAsset);
  await asset.downloadAsync();
  const csv = await FileSystem.readAsStringAsync(asset.localUri!);
  const parsed = Papa.parse<AlcoholRow>(csv, { header: true, dynamicTyping: true, skipEmptyLines: true });
  for (const row of parsed.data) {
    const id = row["docId"] != null ? String(row["docId"]) : undefined;
    const name = row["제품명"] ? String(row["제품명"]).trim() : "";
    const rawImg = (row["사진URL"] ?? "").toString().trim();
    const imageUrl = /^https?:\/\//i.test(rawImg) ? rawImg : undefined;
    if (id && name) map.set(id, { id, name, imageUrl });
  }
  return map;
}

export default function BookmarkScreen() {
  const router = useRouter();

  const [nickname, setNickname] = useState<string>("");
  const [metaMap, setMetaMap] = useState<Map<string, Meta>>(new Map());
  const [ids, setIds] = useState<string[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // 닉네임
  useEffect(() => {
    (async () => {
      setNickname((await AsyncStorage.getItem("nickname")) ?? "");
    })();
  }, []);

  // CSV 메타 로드(최초 1회)
  useEffect(() => {
    (async () => setMetaMap(await loadMetaMap()))();
  }, []);

  const loadFavs = useCallback(async () => {
    setIds(await getFavIds());
  }, []);

  useEffect(() => { loadFavs(); }, [loadFavs]);
  useFocusEffect(useCallback(() => { loadFavs(); }, [loadFavs]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFavs();
    setRefreshing(false);
  }, [loadFavs]);

  // 메타 매핑
  const data = useMemo(() => {
    if (!ids) return [];                // ids === null, undefined 대비
    return ids
      .map(id => metaMap.get(id))
      .filter((m): m is Meta => !!m);
  }, [ids, metaMap]);

  if (ids === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>불러오는 중…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>
          <Text style={styles.nick}>{nickname || "익명"}</Text>님이 찜한 전통주
        </Text>
      </View>
      <View style={{ flex: 1, paddingTop: 8 }}>
        {data.length === 0 ? (
          <View style={styles.center}><Text style={{ textAlign:"center", color: "#6B7280" }}>아직 찜한 전통주가 없어요.{"\n"}마셔보고 싶은 전통주를 찜해보세요.</Text></View>
        ) : (
          <FlatList
            data={data}
            keyExtractor={(m) => m.id}
            numColumns={2}
            columnWrapperStyle={{ paddingHorizontal: 45, justifyContent: "space-between", marginBottom: 12 }}
            contentContainerStyle={{ paddingBottom: 24, gap: 8 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: "/(tabs)/(home)/[id]",
                      params: {
                        id: item.id, alcoholName: item.name
                      }
                    })}
                  style={{ alignItems: "center" }}
                >
                  <Image
                    source={
                      item.imageUrl
                        ? { uri: item.imageUrl }
                        : require("../../../assets/images/bottle_placeholder.png")
                    }
                    style={styles.thumb}
                  />
                  <Text numberOfLines={2} style={styles.name}>{item.name}</Text>
                </Pressable>

                {/* 찜 하트 */}
                <Pressable
                  onPress={async () => { await removeFav(item.id); await loadFavs(); }}
                  style={styles.heart}
                  hitSlop={12}
                  accessibilityLabel="찜 해제"
                >
                  <Ionicons name="heart" size={18} color="#F59E0B" />
                </Pressable>
              </View>
            )}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  headerContainer: {
    margin: 20,
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  },
  nick: {
    color: "#F59E0B",
    fontWeight: "800"
  },
  card:{        
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexBasis: '48%',  
    flexGrow: 0,  
    padding: 10,
    alignItems: 'center',
    minHeight: 200,     
  },
  thumb: {
    width: 90,
    height: 130,
    resizeMode: "contain",
    marginTop: 4
  },

  name: {
    textAlign: "center",
    marginTop: 8,
    color: "#111827",
    fontWeight: "700"
  },

  heart: {
    position: "absolute",
    top: 8, right: 8,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: "white",
    alignItems: "center", justifyContent: "center",
    elevation: 2,
  },
});
