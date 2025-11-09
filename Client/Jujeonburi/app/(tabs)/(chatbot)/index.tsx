import { authedFetch, getUserId } from "@/app/lib/auth";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";



// --- API 타입 ---
type BotResultItem = {
  name: string;
  description?: string;
  reason?: string;
  imageURL?: string;
  alcoholId: string;
};

// 우리 UI에서 쓰는 통합 타입(기존 카드 렌더링과 호환)
type RelatedAlcohol = {
  name: string;
  image_url?: string;
  description?: string;
  alcoholId: string;
  reason?: string;
};

type ChatbotResponse = {
  result?: {
    answer?: string;
    result?: BotResultItem[];
  };
};
// --- 로그 API 타입 ---
type ChatLog = {
  _id: string;
  userId: string;
  question: string;
  answer?: {
    name: string;
    summary?: string;
    reason?: string;
    image?: string;
    detailPage?: string; // 있을 수도 있음
  }[];
  createdAt: string; // ISO
};
type ChatLogResp = { logs: ChatLog[] };

// 상세 URL에서 id를 뽑아낼 수 있으면 뽑아오기(없으면 빈 문자열)
function extractIdFromDetail(url?: string): string {
  if (!url) return "";
  try {
    const u = new URL(url);
    return u.searchParams.get("id") || u.pathname.split("/").filter(Boolean).pop() || "";
  } catch { return ""; }
}

// 서버 로그 1건 -> 우리 메시지 2건(질문/답변)으로 변환
function mapLogToMsgs(log: ChatLog): Msg[] {
  const ts = new Date(log.createdAt).getTime() || Date.now();
  const related: RelatedAlcohol[] = (log.answer || []).map(a => ({
    name: a.name,
    image_url: a.image,
    description: a.summary,
    reason: a.reason,
    alcoholId: extractIdFromDetail(a.detailPage),
  }));

  const userMsg: Msg = {
    id: `${log._id}-q`,
    role: "user",
    text: log.question,
    createdAt: ts,
  };

  const botText = related.length > 0 ? "아래 추천을 참고해보세요!" : "추천 결과가 없어요.";
  const botMsg: Msg = {
    id: `${log._id}-a`,
    role: "assistant",
    text: botText,
    createdAt: ts + 1,
    related,
  };

  return [userMsg, botMsg];
}

const API_BASE = process.env.EXPO_PUBLIC_API_URL;

async function askChatbot(question: string) {

  const res = await authedFetch(`${API_BASE}/chatbot/recommend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
  // authedFetch가 refresh까지 시도했는데도 실패하면 401이 남아있을 수 있음
  if (res.status === 401) {
    throw new Error("로그인이 필요합니다."); // UI에서 로그인 유도 문구로 사용
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`POST /chatbot/recommend 실패 (${res.status}) ${text}`);
  }

  const data = (await res.json()) as ChatbotResponse;

  // 서버 결과 → 우리 카드 모델로 매핑
  const payload = data?.result ?? {};
  const list =
    Array.isArray((data as any)?.result)
      ? ((data as any).result as BotResultItem[])
      : (payload.result ?? []);

  const related: RelatedAlcohol[] = list.map((r) => ({
    name: r.name,
    image_url: r.imageURL,
    description: r.description,
    alcoholId: r.alcoholId,
    reason: r.reason,
  }));
  const answer =
    payload.answer ??
    (related.length > 0 ? "아래 추천을 참고해보세요!" : "추천 결과를 찾지 못했어요.");

  console.log("서버에서 받아온 답:", { answer, related });  // 화면에서 쓸 형태로 반환
  return {
    related,
    answer,
  };
}

//챗봇 아바타 이미지 가져오기기
const AVATAR = require("../../../assets/images/avatar.png");

//챗봇 or 사용자 메시지 타입 정의
type Role = "assistant" | "user";
type Msg = {
  id: string;
  role: Role;
  text: string;
  createdAt: number;
  related?: RelatedAlcohol[];
};

const now = Date.now();

const SEED: Msg[] = [
  {
    id: "default",
    role: "assistant",
    text:
      "안녕하세요! 주전부리의 챗봇 술동이에요.\n어떤 전통주를 마셔야할지 잘 모르겠다면,\n저에게 질문해주세요!",
    createdAt: now - 1000 * 60 * 2,
  },
];

//말풍선 컴포넌트 정의 함수
function Bubble({ role, text, createdAt, related, }: { role: Role; text: string; createdAt: number; related?: RelatedAlcohol[] }) {
  const isUser = role === "user";
  const RelatedList = related && related.length > 0 ? (

    <View>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 10, paddingTop: 8 }}
        data={related}
        keyExtractor={(it, idx) => `${it.name}-${idx}`}
        renderItem={({ item }) => (
          <Pressable
            style={styles.recCard}
            onPress={() =>
              router.push({
                pathname: "/(tabs)/(home)/[id]",
                params: {
                  id: item.alcoholId
                },
              })
            }
          >
            <Image
              source={
                item.image_url
                  ? { uri: item.image_url }
                  : require("../../../assets/images/bottle_placeholder.png")
              }
              style={styles.recThumb}
              resizeMode="cover"
            />
            <Text numberOfLines={2} style={styles.recName}>{item.name}</Text>
            {item.reason ? <Text style={styles.recDesc}>{item.reason}</Text> : null}
          </Pressable>
        )}
      />
      <Text style={[styles.bubbleText, styles.botText]}>카드를 누르면 해당 전통주의 상세 페이지로 이동해요.{"\n"}다른 추천이 필요하면 언제든지 질문해주세요!</Text>
    </View>

  ) : null;

  //사용자 말풍선
  if (isUser) {
    return (
      <View style={[styles.row, styles.rowRight]}>
        <View style={[styles.bubble, styles.userBubble, styles.userRadius]}>
          <Text style={[styles.bubbleText, styles.userText]}>{text}</Text>
        </View>
      </View>
    );
  }

  //챗봇 말풍선
  return (
    <View style={[styles.row, styles.rowLeft]}>
      <Image source={AVATAR} style={styles.avatar} />
      <View style={[styles.bubble, styles.botBubble, styles.botRadius]}>
        <Text style={[styles.bubbleText, styles.botText]}>{text}</Text>
        {RelatedList}
      </View>
    </View>
  );
}

/* ---------- 색상 ---------- */
const BORDER = "#E5E7EB";
const SUB = "#374151";
const CARD_BG = "#FFF7EB";

export default function ChatBot() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Msg[]>(SEED);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<Msg>>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  const dayLabel = useMemo(() => {
    const d = new Date(messages[0]?.createdAt ?? Date.now());
    //날짜 객체 d를 한국어(Korea) 로케일 규칙에 맞춰 문자열로 포맷
    return d.toLocaleString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }, [messages]);

  const onSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    // 사용자 메시지 추가
    const userMsg: Msg = { id: String(Date.now()), role: "user", text, createdAt: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    // 로딩 버블 추가
    setSending(true);
    const thinkingId = String(Date.now() + 1);
    setMessages((prev) => [
      ...prev,
      { id: thinkingId, role: "assistant", text: "추천을 준비하는 중이에요...", createdAt: Date.now() + 1 },
    ]);

    try {
      const { answer, related } = await askChatbot(text);

      setMessages(prev =>
        prev.map(m =>
          m.id === thinkingId
            ? { ...m, text: answer, related }
            : m
        )
      );
    } catch (e: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === thinkingId
            ? { ...m, text: `오류가 발생했어요: ${e?.message ?? "요청 실패"}` }
            : m
        )
      );
    } finally {
      setSending(false);
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    }
  };


  const renderItem = ({ item }: { item: Msg }) => (
    <Bubble
      role={item.role}
      text={item.text}
      createdAt={item.createdAt}
      related={item.related} />
  );
  const HeaderCard = () => (
    <View style={styles.hero}>
      <View style={styles.heroTexts}>
        <Text style={{ marginLeft: -5, marginRight: 5 }}>💡 </Text>
        <Text style={styles.body}>
          주전부리의 챗봇, 술동이는{"\n"}상황에 어울리는 전통주를 추천해주는 AI 챗봇이에요.
        </Text>
      </View>
    </View>
  );

  useFocusEffect(
    React.useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          setInitialLoading(true);
          const userId = await getUserId();
          if (!userId) { setInitialLoading(false); return; }

          const url = `${API_BASE}/chatbot/logs`;
          const res = await authedFetch(url, { method: "GET" });
          console.log("[챗봇 로그] 요청 URL:", url);
          console.log("[챗봇 로그] 응답 상태:", res.status);
          if (!res.ok) {
            const t = await res.text().catch(() => "");
            throw new Error(`GET /chatbot/logs 실패(${res.status}) ${t}`);
          }
          const data = (await res.json()) as ChatLogResp;
          console.log("[챗봇 로그] 응답 데이터:", data);

          // 오래된 것부터 정렬 후 변환
          const histMsgs = (data.logs || [])
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
            .flatMap(mapLogToMsgs);

          if (!cancelled) {
            // seed(안내문) + 히스토리로 초기화
            setMessages([SEED[0], ...histMsgs]);
          }
        } finally {
          if (!cancelled) setInitialLoading(false);
        }
      })();
      return () => { cancelled = true; };
    }, [])
  );
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.select({ ios: "padding", android: undefined })}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        {/* 초기 히스토리 로딩 표시: seed만 있을 때 + 서버 로딩 중*/} 
        {/*
        {initialLoading && messages.length <= 1 ? (
          <View style={{ padding: 16, alignItems: "center" }}>
            <ActivityIndicator />
          </View>
        ) : null}
        */}
        {/* 메시지 영역 */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 76 },
          ]}
          ListHeaderComponent={
            <View style={styles.dayLabelWrap}>
              <Text style={styles.dayLabel}>{dayLabel}</Text>
              <HeaderCard />
            </View>
          }
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
        />

        {/* 하단 입력 영역 */}
        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="입력해주세요..."
            placeholderTextColor="#9CA3AF"
            style={styles.input}
            multiline
            maxLength={500}
          />
          <Pressable
            style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
            onPress={onSend}
            disabled={!input.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Ionicons name="arrow-up-circle-outline" size={40} color="#fff" />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  container: { flex: 1, backgroundColor: "#FFFFFF" },

  // 리스트
  listContent: {
    paddingHorizontal: 14,
    paddingTop: 10,
    rowGap: 10,
    justifyContent: "flex-end",
  },
  dayLabelWrap: { alignItems: "center", marginBottom: 6 },
  dayLabel: { fontSize: 12, color: "#9CA3AF" },

  // 메시지 행
  row: { width: "100%", flexDirection: "row" },
  rowLeft: { justifyContent: "flex-start", alignItems: "flex-start" }, // ⬅️ 상단 정렬
  rowRight: { justifyContent: "flex-end" },
  avatar: {
    width: 43,
    height: 40,
    borderRadius: 14,
    marginRight: 8,
    backgroundColor: "#FAFAFA",
  },
  bubble: {
    maxWidth: "85%",
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  botBubble: { backgroundColor: "#FFBF60" },
  botRadius: {
    borderTopLeftRadius: 6,
    borderTopRightRadius: 14,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
  userBubble: { backgroundColor: "#E5E7EB" },
  userRadius: {
    borderTopLeftRadius: 14,
    borderTopRightRadius: 6,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },

  bubbleText: { fontSize: 13, lineHeight: 18 },
  botText: { color: "#111827", fontWeight: "500" },
  userText: { color: "#111827" },

  // 입력 바
  inputBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: "#FFFFFF",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E7EB",
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
    fontSize: 14,
    color: "#111827",
  },
  sendBtn: {
    height: 40,
    width: 40,
    borderRadius: 999,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { opacity: 0.45 },
  recCard: {
    width: 200,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 10,
    backgroundColor: "#fff",
    alignItems: "center",
    margin: 4,
    marginBottom: 10,
  },
  recThumb: {
    width: 100,
    height: 120,
    borderRadius: 8,
    backgroundColor: "#F3F4F6"
  },
  recName: { marginTop: 6, fontWeight: "700", color: "#111827", textAlign: "center" },
  recDesc: {
    marginTop: 8,
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center"
  },
  hero: {
    backgroundColor: CARD_BG,
    marginTop: 10,
    paddingVertical: 12,
    paddingHorizontal: 25,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  heroTexts: {
    flex: 1,
    flexDirection: "row",
    gap: 10,
  },
  body: {
    fontSize: 12,
    color: SUB,
    textAlign: "justify",
    lineHeight: 16,
    alignItems: "center",
  },
});
