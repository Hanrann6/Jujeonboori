import { FlatList, Image, ImageSourcePropType, StyleSheet, Text, View } from "react-native";
import activityJson from "./activity_contents.json";
import { activityImages } from "./activityImages";

/* ---------- 타입 ---------- */
type Activity = {
  content_id: number;
  name: string;
  description: string;
  imageKey?: string;
};

const getActivityImageSource = (key?: string): ImageSourcePropType => {
  if (key && (activityImages as any)[key]) return (activityImages as any)[key];
  return activityImages.default;
};


const introImage = require("../../../assets/images/img_0.png");

/* ---------- 색상 ---------- */
const BG = "#FFFFFF";
const BORDER = "#E5E7EB";
const TITLE = "#111827";
const SUB = "#374151";
const CARD_BG = "#FFF7EB";
const BLACK = "#111827";

export default function ActivityPage() {
  const HeaderCard = () => (
    <View style={styles.hero}>
      <Image source={introImage} style={styles.heroImage} />
      <View style={styles.heroTexts}>
        <Text style={styles.head}>
          우리 술과 함께 즐길 수 있는{"\n"}주전부리를 준비해봤어요.
        </Text>
        <Text style={styles.body}>
          전통주 이름의 기원부터 술자리에 얽힌 어원까지, 술과 함께하는 이야기를 들려드릴게요.
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <HeaderCard />
      <FlatList<Activity>
        data={activityJson as Activity[]}
        keyExtractor={(it) => String(it.content_id)}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        ItemSeparatorComponent={() => <View style={{ height: 20 }} />}
        renderItem={({ item }) => (
          <View style={styles.section}>
            {/* 섹션 타이틀 */}
            <View style={styles.sectionRow}>
              <Image source={getActivityImageSource(item.imageKey)} style={styles.sectionIcon} />
              <Text style={styles.sectionTitle}>{item.name}</Text>
            </View>
            <View style={styles.sectionDivider} />

            {/* 본문 텍스트 */}
            <View style={styles.bodyBox}>
              <Text style={styles.bodyText}>{item.description}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  /* ── 상단 배너 ── */
  hero: {
    backgroundColor: CARD_BG,
    paddingVertical: 16,
    paddingHorizontal: 25,
    paddingTop: 30,
    paddingBottom: 30,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  heroImage: {
    width: 128,
    height: 140,
    position: "absolute",
    left: 10,
  },
  heroTexts: {
    flex: 1,
    alignItems: "center",
    paddingLeft: 100,
  },
  head: {
    fontSize: 21,
    fontWeight: "800",
    textAlign: "right",
    lineHeight: 24,
    marginBottom: 4,
    color:"black"
  },
  body: {
    fontSize: 12,
    color: SUB,
    textAlign: "right",
    lineHeight: 16,
    alignItems: "center",
    marginLeft: 10,
    marginTop: 4,
    marginRight: 4,
  },

  /* ── 섹션 ── */
  section: {
    marginHorizontal: 10,
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  sectionIcon: {
    width: 48,
    height: 48,
    resizeMode: "contain"
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: TITLE
  },
  sectionDivider: {
    height: 2,
    backgroundColor: "black",
    marginTop: 4,
    marginBottom: 10
  },

  /* ── 본문 ── */
  bodyBox: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    padding: 14,
  },
  bodyText: { fontSize: 14, color: 'black', lineHeight: 22 },
});
