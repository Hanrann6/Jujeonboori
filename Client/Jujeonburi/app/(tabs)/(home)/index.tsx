//app/(tabs)/(home)/index.tsx

import { Ionicons } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import {
    Animated,
    Easing,
    Keyboard,
    Platform,
    Pressable,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

type Filters = {
    query: string;
    minPrice?: number;
    maxPrice?: number;
    categories: string[];
};

const CATEGORIES = ["탁주", "약주/청주", "과실주", "증류주", "기타 주류"];
//자주쓰는 색상 정의
const BORDER = "#E5E7EB";
const BLACK = "#111827";
const MUTED = "#6B7280";

export default function HomeScreen() {
    const [query, setQuery] = useState("");
    const [filters, setFilters] = useState<Filters>({ query: "", categories: [] });

    //필터 적용 패널 드롭다운 state + 애니메이션
    const [open, setOpen] = useState(false);
    const animH = useRef(new Animated.Value(0)).current;    // 높이
    const contentH = useRef(0);                             // 실제 컨텐츠 높이 저장
    const [backdropTop, setBackdropTop] = useState(0);

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
        // 1) 검색창의 query(문자 입력값)와, 패널에서 받은 나머지 필터(f)를 합쳐 최종 객체 생성
        const next: Filters = { ...f, query: query.trim() };
        // 2) 상태 업데이트 → 칩 표시, 리스트 필터링 등 렌더링에 사용 
        setFilters(next);
        // 3) 패널 닫기
        setOpen(false);
        // 4) 부드럽게 닫히도록 애니메이션 적용
        Animated.timing(animH, {
            toValue: 0,
            duration: 200,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: false,
        }).start();
        console.log("검색/필터 적용:", next);
    };

    return (
        <SafeAreaView style={s.safe}>
            <View style={s.container}>
                <View
                    onLayout={(e) => {
                        const { y, height } = e.nativeEvent.layout;
                        setBackdropTop(y + height);
                    }}
                >
                    {/* 검색창 */}
                    <View style={s.searchRow}>
                        <View style={s.searchBox}>
                            <Ionicons name="search" size={18} color={MUTED} />
                            <TextInput
                                value={query}
                                onChangeText={setQuery}
                                placeholder="검색"
                                placeholderTextColor="#9CA3AF"
                                style={s.searchInput}
                                returnKeyType="search"
                                onSubmitEditing={() => onApply({ ...filters })}
                            />
                        </View>
                        <Pressable style={s.filterBtn} onPress={toggle}>
                            <Text style={s.filterBtnText}>필터</Text>
                            <Ionicons name="options-outline" size={16} color={BLACK} />
                        </Pressable>
                    </View>

                    {/* 필터 적용 패널 */}
                    <Animated.View style={[s.dropdown, { height: animH}]}>
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

                {/* 메인 콘텐츠 자리 */}
                <View style={{ flex: 1 }} />
            </View>

            {/* 필터 적용 패널 외부 영역을 터치하면 닫히도록 */}
            {open && <Pressable style={[s.backdrop, { top: backdropTop }]} onPress={toggle} />}
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
    container: { flex: 1 },

    header: {
        height: 48,
        paddingHorizontal: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: BORDER,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    title: {
        fontSize: 16,
        fontWeight: "900",
        color: BLACK,
        ...(Platform.OS === "android" ? { includeFontPadding: false } : null),
    },

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
});
