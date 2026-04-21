"use client";

import React from "react";
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import type { VisionBoardPrompt, VisionBoardCategory } from "@/lib/generators";

const COLORS = {
  bg: "#0B1B1D",
  panel: "#0F2426",
  accent: "#FF6A00",
  teal: "#7AE2CF",
  mute: "#6E8B8D",
  text: "#E8ECF0",
  body: "#B2C8C9",
  border: "#1A3034",
};

const styles = StyleSheet.create({
  page: {
    backgroundColor: COLORS.bg,
    color: COLORS.text,
    padding: 32,
    fontSize: 10,
    fontFamily: "Helvetica",
    lineHeight: 1.4,
  },
  // Cover
  cover: {
    flex: 1,
    justifyContent: "space-between",
    padding: 48,
    backgroundColor: COLORS.bg,
  },
  coverTopRule: {
    height: 3,
    width: 80,
    backgroundColor: COLORS.accent,
    marginBottom: 18,
  },
  coverLabel: {
    fontSize: 11,
    color: COLORS.accent,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 6,
  },
  coverTitle: {
    fontSize: 48,
    fontFamily: "Helvetica-Bold",
    color: COLORS.text,
    letterSpacing: -1,
    marginBottom: 10,
  },
  coverSub: {
    fontSize: 13,
    color: COLORS.body,
    marginBottom: 4,
  },
  coverMeta: {
    fontSize: 10,
    color: COLORS.mute,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  // Grid page
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: COLORS.text,
  },
  headerMeta: {
    fontSize: 9,
    color: COLORS.mute,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  panel: {
    width: "50%",
    padding: 6,
  },
  panelInner: {
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    padding: 8,
  },
  panelImage: {
    width: "100%",
    height: 140,
    objectFit: "cover",
    borderRadius: 2,
    marginBottom: 8,
  },
  panelPlaceholder: {
    width: "100%",
    height: 140,
    backgroundColor: "#13282B",
    borderRadius: 2,
    marginBottom: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  panelPlaceholderText: {
    fontSize: 9,
    color: COLORS.mute,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  panelCategory: {
    fontSize: 8,
    color: COLORS.teal,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  panelTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: COLORS.text,
    marginBottom: 4,
  },
  panelDesc: {
    fontSize: 9,
    color: COLORS.body,
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 32,
    right: 32,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: COLORS.mute,
  },
});

const CATEGORY_LABEL: Record<VisionBoardCategory, string> = {
  cinematography: "Cinematography",
  color_palette: "Color Palette",
  lighting: "Lighting",
  costume: "Costume",
  production_design: "Production Design",
  location: "Location",
};

function isUsableUrl(u: string | undefined | null): boolean {
  if (!u) return false;
  return /^https?:\/\//i.test(u) || /^data:image\//i.test(u);
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function Footer({ title, dateString }: { title: string; dateString: string }) {
  return (
    <View style={styles.footer} fixed>
      <Text>{title} — Vision Board</Text>
      <Text>{dateString}</Text>
    </View>
  );
}

export default function VisionBoardDocument({
  title,
  genre,
  prompts,
  dateString,
}: {
  title: string;
  genre?: string;
  prompts: VisionBoardPrompt[];
  dateString: string;
}) {
  const pages = chunk(prompts, 4);
  return (
    <Document title={`${title} — Vision Board`}>
      {/* Cover */}
      <Page size="A4" style={styles.cover}>
        <View>
          <View style={styles.coverTopRule} />
          <Text style={styles.coverLabel}>Director&apos;s Vision Board</Text>
          <Text style={styles.coverTitle}>{title}</Text>
          {genre && <Text style={styles.coverSub}>{genre.toUpperCase()}</Text>}
        </View>
        <View>
          <Text style={styles.coverMeta}>{prompts.length} reference panels</Text>
          <Text style={styles.coverMeta}>{dateString}</Text>
        </View>
      </Page>

      {/* Grid pages, 4 panels each */}
      {pages.map((pageItems, pageIdx) => (
        <Page key={pageIdx} size="A4" style={styles.page}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Visual References</Text>
            <Text style={styles.headerMeta}>
              Page {pageIdx + 1} / {pages.length}
            </Text>
          </View>

          <View style={styles.grid}>
            {pageItems.map((p) => (
              <View key={p.id} style={styles.panel} wrap={false}>
                <View style={styles.panelInner}>
                  {isUsableUrl(p.imageUrl) ? (
                    <Image src={p.imageUrl!} style={styles.panelImage} />
                  ) : (
                    <View style={styles.panelPlaceholder}>
                      <Text style={styles.panelPlaceholderText}>Image pending</Text>
                    </View>
                  )}
                  <Text style={styles.panelCategory}>
                    {CATEGORY_LABEL[p.category] || p.category}
                  </Text>
                  <Text style={styles.panelTitle}>{p.title}</Text>
                  <Text style={styles.panelDesc}>{p.description}</Text>
                </View>
              </View>
            ))}
          </View>

          <Footer title={title} dateString={dateString} />
        </Page>
      ))}
    </Document>
  );
}
