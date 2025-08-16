import { Ionicons } from "@expo/vector-icons";
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
const AVATAR = require("../../../assets/images/avatar.png");

type Role = "assistant" | "user";
type Msg = { id: string; role: Role; text: string; createdAt: number };

const now = Date.now();

const SEED: Msg[] = [
  {
    id: "default",
    role: "assistant",
    text:
      "안녕하세요! 주전부리의 챗봇 술동이에요.\n무엇을 도와드릴까요?",
    createdAt: now - 1000 * 60 * 2,
  },
];

export default function ChatBot() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Msg[]>(SEED);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<Msg>>(null);

  const dayLabel = useMemo(() => {
    const d = new Date(messages[0]?.createdAt ?? Date.now());
    return d.toLocaleString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }, [messages]);

  const onSend = () => {
    const text = input.trim();
    if (!text || sending) return;

    // 사용자 메시지 추가
    const userMsg: Msg = { id: String(Date.now()), role: "user", text, createdAt: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    // UI용 로딩 버블(추후 OpenAI 연동 시 교체)
    setSending(true);
    const thinking: Msg = {
      id: String(Date.now() + 1),
      role: "assistant",
      text: "추천을 준비하는 중이에요...",
      createdAt: Date.now() + 1,
    };
    setMessages((prev) => [...prev, thinking]);

    // 데모: 1.2초 뒤 'thinking' 대체
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === thinking.id
            ? {
                ...m,
                text:
                  "예시 답변입니다. 나중에 추천 API 연동 시 이 자리에 결과가 들어갑니다.",
              }
            : m
        )
      );
      setSending(false);
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    }, 1200);
  };

  const renderItem = ({ item }: { item: Msg }) => (
    <Bubble role={item.role} text={item.text} createdAt={item.createdAt} />
  );

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.select({ ios: "padding", android: undefined })}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
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

function Bubble({ role, text }: { role: Role; text: string; createdAt: number }) {
    const isUser = role === "user";
  
    // 사용자 말풍선(오른쪽)
    if (isUser) {
      return (
        <View style={[styles.row, styles.rowRight]}>
          <View style={[styles.bubble, styles.userBubble, styles.userRadius]}>
            <Text style={[styles.bubbleText, styles.userText]}>{text}</Text>
          </View>
        </View>
      );
    }
  
    // 봇 말풍선(왼쪽) + 아바타
    return (
      <View style={[styles.row, styles.rowLeft]}>
        <Image source={AVATAR} style={styles.avatar} />
        <View style={[styles.bubble, styles.botBubble, styles.botRadius]}>
          <Text style={[styles.bubbleText, styles.botText]}>{text}</Text>
        </View>
      </View>
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

  // 말풍선
  avatar: {
    width: 41,
    height: 38,
    borderRadius: 14,
    marginRight: 8,
    backgroundColor: "#FFF7ED",
  },
  bubble: {
    maxWidth: "78%",
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  botBubble: { backgroundColor: "#FDBA74" }, // 주황(밝은)
  userBubble: { backgroundColor: "#E5E7EB" }, // 회색

  // 둥근 모서리: 꼬리 느낌
  botRadius: {
    borderTopLeftRadius: 6,
    borderTopRightRadius: 14,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
  userRadius: {
    borderTopLeftRadius: 14,
    borderTopRightRadius: 6,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },

  bubbleText: { fontSize: 14, lineHeight: 20 },
  botText: { color: "#111827", fontWeight: "600" },
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
});
