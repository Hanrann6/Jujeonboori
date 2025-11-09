//app/(tabs)/(home)/index.tsx

import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system";
import { router, useFocusEffect } from "expo-router";
import Papa from "papaparse";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, Keyboard, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import csvAsset from "../../../assets/data/trad_alcohol.csv";
import AlcoholRecommend from "../../components/AlcoholRecommend";
import PriceRecommend from "../../components/PriceRecommend";
import Weathercard from "../../components/Weathercard";
import WeatherRecommend from "../../components/WeatherRecommend";

type Filters = {
    query: string;
    minPrice?: number;
    maxPrice?: number;
    categories: string[];
};

const CATEGORIES = ["탁주", "약주청주", "과실주", "증류주", "기타 주류"];

const BORDER = "#E5E7EB";
const BLACK = "#111827";
const MUTED = "#6B7280";

export default function HomeScreen() {
    const insets = useSafeAreaInsets();

    const [query, setQuery] = useState("");
    const [filters, setFilters] = useState<Filters>({ query: "", categories: [] });

    //필터 적용 패널 드롭다운 state + 애니메이션
    const [open, setOpen] = useState(false);
    const animH = useRef(new Animated.Value(0)).current;    // 높이
    const contentH = useRef(0);                             // 실제 컨텐츠 높이 저장
    const [backdropTop, setBackdropTop] = useState(0);

    // 이름 검색 → 상세페이지 id를 우선 쓰고, 없으면 이름 인코딩하도록) 매핑
    const [nameIndex, setNameIndex] = useState<Map<string, string>>(new Map());

    useEffect(() => {
        (async () => {
            const asset = Asset.fromModule(csvAsset);
            await asset.downloadAsync();
            const csv = await FileSystem.readAsStringAsync(asset.localUri!);
            const parsed = Papa.parse<any>(csv, { header: true, dynamicTyping: true, skipEmptyLines: true });

            const map = new Map<string, string>();
            for (const row of parsed.data) {
                const rawName = row?.["alcoholName"];
                if (!rawName) continue;
                const name = String(rawName).trim();
                const id = row?.["index"] != null ? String(row["index"]) : encodeURIComponent(name);
                map.set(name.toLowerCase(), id); // 소문자 키로 보관(대/소문자 무시)
            }
            setNameIndex(map);
        })();
    }, []);

    const toggle = () => {
        // 필터 적용 패널 높이 (열릴 때는 350, 닫힐 때는 0)
        const to = open ? 0 : 350;
        setOpen(!open);
        Animated.timing(animH, {
            toValue: to, // 애니메이션 높이(animH)를 0에서 350으로, 또는 350에서 0으로
            duration: 250,
            easing: open ? Easing.in(Easing.cubic) : Easing.out(Easing.cubic), //자연스러운 슬라이드 느낌
            useNativeDriver: false, //height 같은 레이아웃 속성을 바꾸려면 false로 
        }).start();
        Keyboard.dismiss();
    };
    // 필터 적용 패널에서 선택한 값들을 최종 반영하고 닫는 함수 
    const onApply = (f: Omit<Filters, "query">) => {
        // 검색창의 query(문자 입력값)와, 패널에서 받은 나머지 필터(f)를 합쳐 최종 객체 생성
        const next: Filters = { ...f, query: query.trim() };

        //패널 닫기 (부드럽게 닫히도록 애니메이션 적용) 
        setOpen(false);
        Animated.timing(animH, {
            toValue: 0,
            duration: 200,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: false,
        }).start();
        console.log("검색/필터 적용:", next);

        router.push({
            pathname: "/(tabs)/(home)/searchResult",
            params: {
                q: next.query || "",
                min: next.minPrice != null ? String(next.minPrice) : "",
                max: next.maxPrice != null ? String(next.maxPrice) : "",
                // 배열은 JSON 문자열로 넘기면 안전
                cats: JSON.stringify(next.categories || []),
            },
        });
    };
    const goSearch = React.useCallback(() => {
        const q = query.trim();
        if (!q) return;
        router.push({ pathname: "/(tabs)/(home)/searchResult", params: { q } });
    }, [query]);
    const [nickname, setNickname] = useState<string>("");

    useFocusEffect(
        useCallback(() => {
          let alive = true;
          (async () => {
            const v = await AsyncStorage.getItem("nickname");
            if (alive) setNickname(v ?? "");
          })();
          return () => { alive = false; }; 
        }, [])
      );

    return (
        <SafeAreaView style={s.safe}>
            <ScrollView style={s.container}>
                <View
                    onLayout={(e) => {
                        const { y, height } = e.nativeEvent.layout;
                        setBackdropTop(y + height);
                    }}
                >
                    {/* 검색창 */}
                    <View style={s.searchRow}>
                        <View style={s.searchBox}>
                            <Ionicons name="search" size={20} color={MUTED} />
                            <TextInput
                                value={query}
                                onChangeText={setQuery}
                                placeholder="검색"
                                placeholderTextColor="#9CA3AF"
                                style={s.searchInput}
                                returnKeyType="search"
                                onSubmitEditing={goSearch}
                            />
                            <Ionicons name="close-circle-outline"
                                size={20}
                                color={MUTED}
                                onPress={() => setQuery("")} />
                        </View>
                        <Pressable style={s.filterBtn} onPress={toggle}>
                            <Text style={s.filterBtnText}>필터</Text>
                            <Ionicons name="options-outline" size={16} color={BLACK} />
                        </Pressable>
                    </View>

                    {/* 필터 적용 패널 */}
                    <Animated.View style={[s.dropdown, { height: animH }]}>
                        <View
                            style={s.dropdownInner}
                            onLayout={(e) => { contentH.current = e.nativeEvent.layout.height; }}
                        >
                            <FilterContent
                                initial={filters}
                                onApply={(partial) => onApply(partial)}
                                onClose={() => toggle()}
                            />
                        </View>
                    </Animated.View>
                </View>

                {/* 메인 콘텐츠*/}
                <Weathercard />
                <View style={s.recContainer}>
                    <View style={s.pricedRec}>
                        <Text style={s.recTitle}><Text style={s.nick}>오늘 날씨에 어울리는</Text> 추천 전통주</Text>  
                        <Text style={s.recsub}>오늘은 이 전통주를 마셔보는 게 어떨까요?</Text>          
                        <WeatherRecommend/> 
                    </View>
                    <View style={s.personalRec}>
                        <Text style={s.recTitle}><Text style={s.nick}>{nickname || "사용자"}</Text>님을 위한 추천 전통주</Text>
                        <Text style={s.recsub}>주류 취향을 반영해 AI가 피드백하여 전통주를 추천해드려요.</Text>          
                        <AlcoholRecommend limit={5} />
                    </View>
                    <View style={s.pricedRec}>
                        <Text style={s.recTitle}><Text style={s.nick}>3만원 이하</Text> 추천 전통주</Text>
                        <PriceRecommend maxPrice={30000} />
                    </View>
                </View>
            </ScrollView>

            {/* 필터 적용 패널 외부 영역을 터치하면 닫히도록 */}
            {open && <Pressable style={[s.backdrop, { top: backdropTop }]} onPress={toggle} />}

            {/* OCR 버튼*/}
            <Pressable
                onPress={() => router.push("/ocr")}
                style={[s.fab, { bottom: 10 + insets.bottom }]}>
                <Image
                    source={require("../../../assets/images/ocr_img.png")}
                    style={s.fabIcon}/>
                <Text style={s.fabLabel}>사진으로{"\n"}검색하기</Text>
            </Pressable>
        </SafeAreaView>
    );
}

// 필터 적용 패널 내부 구현
function FilterContent({
    initial,
    onApply,
    onClose,
}: {
    initial: Filters;
    onApply: (f: Omit<Filters, "query">) => void;
    onClose: () => void;
}) {
    const [min, setMin] = useState(initial.minPrice != null ? String(initial.minPrice) : "");
    const [max, setMax] = useState(initial.maxPrice != null ? String(initial.maxPrice) : "");
    const [cats, setCats] = useState<string[]>(initial.categories);

    const toggleCat = (c: string) =>
        setCats((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
    const num = (s: string) => {
        const n = Number(s.replace(/[^\d]/g, ""));
        return Number.isFinite(n) ? n : undefined;
    };

    return (
        <View>
            <View style={s.formRow}>
                <Text style={s.formLabel}>가격</Text>
                <View style={s.formValueRow}>
                    <TextInput
                        value={min}
                        onChangeText={setMin}
                        placeholder="최소 금액"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="number-pad"
                        style={[s.priceInput, { flex: 1 }]}
                    />
                    <Text style={s.dash}>—</Text>
                    <TextInput
                        value={max}
                        onChangeText={setMax}
                        placeholder="최대 금액"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="number-pad"
                        style={[s.priceInput, { flex: 1 }]}
                    />
                </View>
            </View>
            <View style={s.formRow}>
                <Text style={s.formLabel}>주종</Text>
                <View style={s.chipsWrap}>
                    {CATEGORIES.map((c, i) => (
                        <React.Fragment key={c}>
                            {/* 3번째 칩 뒤에서 줄바꿈 → 다음 칩(증류주)이 자동으로 아랫줄 */}
                            {i === 3 && <View style={s.chipBreak} />}
                            <Pressable
                                onPress={() => toggleCat(c)}
                                style={[s.catChip, cats.includes(c) && s.catChipOn]}
                            >
                                <Text style={[s.catChipText, cats.includes(c) && s.catChipTextOn]}>{c}</Text>
                            </Pressable>
                        </React.Fragment>
                    ))}
                </View>
            </View>

            <Pressable
                style={s.applyBtn}
                onPress={() => onApply({ minPrice: num(min), maxPrice: num(max), categories: cats })}
            >
                <Text style={s.applyBtnText}>적용하기</Text>
            </Pressable>
        </View>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: "#fff" },
    container: { flex: 1, paddingBottom: 24 },
    // 검색창
    searchRow: { flexDirection: "row", alignItems: "center", gap: 8, padding: 20, paddingBottom: 8 },
    searchBox: {
        flex: 1,
        height: 40,
        borderWidth: 1,
        borderColor: BORDER,
        borderRadius: 8,
        paddingHorizontal: 10,
        backgroundColor: "#EEE",
        gap: 8,
        flexDirection: "row",
        alignItems: "center",
    },
    searchInput: { flex: 1, height: "100%", fontSize: 14, color: BLACK },
    filterBtn: {
        height: 40,
        paddingHorizontal: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: BORDER,
        backgroundColor: "#fff",
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    filterBtnText: { color: BLACK, fontWeight: "700" },

    recContainer: {
        flex: 1,
        paddingBottom:20,
        
    },
    personalRec: {
        padding: 20,
        gap: 8,
    },
    pricedRec: {
        padding: 18,
        gap: 8,
    },
    recTitle: {
        fontSize: 22,
        fontWeight: "800",
        color: "#111827",
        margin: 10,
    },
    recsub:{
        marginTop:-15,
        margin:10, 
        fontSize:14
    },
    nick: {
        color: "#F59E0B"
    },

    // 드롭다운 패널
    dropdown: {
        overflow: "hidden",
        paddingHorizontal: 20,
    },
    dropdownInner: {
        backgroundColor: "#fff",
        borderRadius: 10,
        borderWidth: 1,
        borderColor: BORDER,
        padding: 10,
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 1.2,
    },
    sheetTitle: { fontSize: 14, fontWeight: "900", color: BLACK },

    sectionLabel: { marginTop: 10, marginBottom: 6, color: "#374151", fontWeight: "700" },

    priceRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    priceInput: {
        height: 40,
        borderWidth: 1,
        borderColor: BORDER,
        borderRadius: 8,
        paddingHorizontal: 10,
        backgroundColor: "#fff",
        fontSize: 14,
        color: BLACK,
    },
    formRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10,
        marginTop: 10,
        marginHorizontal: 12,
    },
    formLabel: {
        width: 44,
        fontWeight: "700",
        color: "#374151",
        paddingTop: 10,
    },
    formValueRow: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    dash: { color: "#9CA3AF" },
    chipsWrap: {
        flex: 1,
        flexDirection: "row",
        flexWrap: "wrap",
        alignContent: "flex-start",
    },
    chipBreak: {
        width: "100%",     // 한 줄 차단 → 다음 요소가 새 줄에서 시작
        height: 0,
    },
    catChip: {
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: BORDER,
        backgroundColor: "#fff",
        marginRight: 8,
        marginBottom: 8,
    },
    catChipOn: { backgroundColor: "#FFF7ED", borderColor: "#FDBA74" },
    catChipText: { color: "#6B7280" },
    catChipTextOn: { color: "black", fontWeight: "600" },

    applyBtn: {
        marginTop: 14,
        height: 46,
        borderRadius: 10,
        backgroundColor: "#FBBC05",
        alignItems: "center",
        justifyContent: "center",
        marginHorizontal: 12,
        marginBottom: 10,
    },
    applyBtnText: { color: "#111", fontWeight: "500" },

    // 바깥 터치 시 닫힘
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "transparent",
    },
    fab: {
        position: "absolute",
        right: 16,
        width: 80,
        height: 80,
        borderRadius: 999,
        backgroundColor: "#283353",
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowRadius: 999,
        elevation: 2,
    },
    fabIcon: { 
        width: 26, 
        height: 26, 
        resizeMode: "contain", 
        backgroundColor:"#FFF", 
        marginBottom: 2 },

    fabLabel: { 
        fontSize: 11,
        color:"#FFF", 
        fontWeight: "700" },
});
