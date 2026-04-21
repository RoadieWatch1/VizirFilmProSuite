"use client";

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import type { FilmPackage } from "@/lib/store";

const COLORS = {
  bg: "#0B1B1D",
  panel: "#0F2426",
  accent: "#FF6A00",
  accentSoft: "#FF6A0033",
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
    padding: 40,
    fontSize: 11,
    fontFamily: "Helvetica",
    lineHeight: 1.5,
  },
  // Cover
  cover: {
    flex: 1,
    justifyContent: "space-between",
    padding: 50,
    backgroundColor: COLORS.bg,
  },
  coverTopRule: {
    height: 3,
    width: 80,
    backgroundColor: COLORS.accent,
    marginBottom: 20,
  },
  coverTitle: {
    fontSize: 52,
    fontFamily: "Helvetica-Bold",
    color: COLORS.text,
    letterSpacing: -1,
    marginBottom: 12,
  },
  coverGenre: {
    fontSize: 13,
    color: COLORS.accent,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 32,
    fontFamily: "Helvetica-Bold",
  },
  coverLogline: {
    fontSize: 18,
    color: COLORS.body,
    lineHeight: 1.5,
    fontStyle: "italic",
    maxWidth: 460,
  },
  coverFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 14,
    color: COLORS.mute,
    fontSize: 9,
  },
  // Sections
  sectionHeader: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.accent,
    paddingBottom: 6,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  sectionKicker: {
    color: COLORS.accent,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 2,
    fontFamily: "Helvetica-Bold",
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
  },
  paragraph: {
    color: COLORS.body,
    fontSize: 11,
    lineHeight: 1.6,
    marginBottom: 10,
  },
  pull: {
    color: COLORS.text,
    fontSize: 14,
    fontStyle: "italic",
    fontFamily: "Helvetica-Oblique",
    borderLeftWidth: 2,
    borderLeftColor: COLORS.accent,
    paddingLeft: 10,
    marginBottom: 14,
  },
  label: {
    color: COLORS.accent,
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 14,
  },
  chip: {
    borderWidth: 1,
    borderColor: COLORS.accentSoft,
    color: COLORS.accent,
    fontSize: 9,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 2,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontFamily: "Helvetica-Bold",
    marginRight: 4,
    marginBottom: 4,
  },
  // Character grid
  characterGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  characterCard: {
    width: "48%",
    marginRight: "2%",
    marginBottom: 14,
    backgroundColor: COLORS.panel,
    borderRadius: 4,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  characterImage: {
    width: "100%",
    height: 140,
    marginBottom: 8,
    objectFit: "cover",
    borderRadius: 2,
    backgroundColor: "#10292C",
  },
  characterName: {
    color: COLORS.text,
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    marginBottom: 2,
  },
  characterRole: {
    color: COLORS.accent,
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  },
  characterDesc: {
    color: COLORS.body,
    fontSize: 10,
    lineHeight: 1.4,
  },
  // Storyboard grid
  storyboardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  storyboardCard: {
    width: "48%",
    marginRight: "2%",
    marginBottom: 14,
  },
  storyboardImage: {
    width: "100%",
    height: 140,
    backgroundColor: "#10292C",
    borderRadius: 2,
    objectFit: "cover",
  },
  storyboardCaption: {
    color: COLORS.body,
    fontSize: 9,
    marginTop: 4,
    lineHeight: 1.4,
  },
  storyboardLabel: {
    color: COLORS.accent,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  // Budget
  budgetRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  budgetCat: {
    color: COLORS.text,
    fontSize: 11,
    flex: 1,
  },
  budgetPct: {
    color: COLORS.mute,
    fontSize: 10,
    width: 60,
    textAlign: "right",
  },
  budgetAmt: {
    color: COLORS.accent,
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    width: 100,
    textAlign: "right",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 12,
    marginTop: 6,
    borderTopWidth: 2,
    borderTopColor: COLORS.accent,
  },
  totalLabel: {
    color: COLORS.text,
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  totalAmt: {
    color: COLORS.accent,
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: COLORS.mute,
  },
});

function truncate(s: string | undefined, n: number): string {
  if (!s) return "";
  if (s.length <= n) return s;
  return s.slice(0, n - 1).trimEnd() + "…";
}

function isUsableUrl(u: string | undefined | null): boolean {
  if (!u) return false;
  return /^https?:\/\//i.test(u) || /^data:image\//i.test(u);
}

function formatUsd(n: number): string {
  if (!isFinite(n)) return "$0";
  return "$" + Math.round(n).toLocaleString("en-US");
}

export default function PitchDeckDocument({
  pkg,
  dateString,
}: {
  pkg: FilmPackage;
  dateString: string;
}) {
  const title = pkg.idea || "Untitled";
  const genre = pkg.genre || "";
  const length = pkg.length || "";
  const logline = pkg.logline || "";
  const synopsis = pkg.synopsis || "";
  const themes = pkg.themes || [];
  const concept = pkg.concept || "";
  const characters = pkg.characters || [];
  const storyboard = pkg.storyboard || [];
  const budget = pkg.budget || [];
  const directorStatement = pkg.directorStatement;
  const runtime = pkg.estimatedRuntime || length;

  const total = budget.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  const featuredStoryboard = storyboard.slice(0, 6);

  return (
    <Document title={title} author="VizirPro">
      {/* ===== COVER ===== */}
      <Page size="LETTER" style={styles.cover}>
        <View>
          <View style={styles.coverTopRule} />
          <Text style={styles.coverGenre}>{genre || "Feature Film"}</Text>
        </View>
        <View>
          <Text style={styles.coverTitle}>{title}</Text>
          {logline ? <Text style={styles.coverLogline}>{logline}</Text> : null}
        </View>
        <View style={styles.coverFooter}>
          <Text>PITCH DECK · {dateString}</Text>
          <Text>VIZIR</Text>
        </View>
      </Page>

      {/* ===== STORY ===== */}
      <Page size="LETTER" style={styles.page}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionKicker}>01 · Story</Text>
          <Text style={styles.sectionTitle}>The Film</Text>
        </View>

        <View style={styles.metaRow}>
          {genre ? <Text style={styles.chip}>{genre}</Text> : null}
          {runtime ? <Text style={styles.chip}>{runtime}</Text> : null}
          {themes.slice(0, 4).map((t, i) => (
            <Text key={i} style={styles.chip}>
              {t}
            </Text>
          ))}
        </View>

        {logline ? (
          <>
            <Text style={styles.label}>Logline</Text>
            <Text style={styles.pull}>{logline}</Text>
          </>
        ) : null}

        {synopsis ? (
          <>
            <Text style={styles.label}>Synopsis</Text>
            {synopsis.split(/\n\n+/).map((p, i) => (
              <Text key={i} style={styles.paragraph}>
                {p.replace(/\s+/g, " ").trim()}
              </Text>
            ))}
          </>
        ) : null}

        <Footer page="1" />
      </Page>

      {/* ===== VISUAL CONCEPT ===== */}
      {concept ? (
        <Page size="LETTER" style={styles.page}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionKicker}>02 · Vision</Text>
            <Text style={styles.sectionTitle}>Visual Concept</Text>
          </View>
          {concept.split(/\n\n+/).map((p, i) => (
            <Text key={i} style={styles.paragraph}>
              {p.replace(/\s+/g, " ").trim()}
            </Text>
          ))}
          <Footer page="2" />
        </Page>
      ) : null}

      {/* ===== CHARACTERS ===== */}
      {characters.length > 0 ? (
        <Page size="LETTER" style={styles.page}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionKicker}>03 · Who</Text>
            <Text style={styles.sectionTitle}>Characters</Text>
          </View>
          <View style={styles.characterGrid}>
            {characters.slice(0, 6).map((c, i) => (
              <View key={i} style={styles.characterCard}>
                {isUsableUrl(c.imageUrl) ? (
                  <Image src={c.imageUrl as string} style={styles.characterImage} />
                ) : (
                  <View style={styles.characterImage} />
                )}
                <Text style={styles.characterName}>{c.name || "Unnamed"}</Text>
                {c.role ? <Text style={styles.characterRole}>{c.role}</Text> : null}
                <Text style={styles.characterDesc}>
                  {truncate(c.description || c.visualDescription || "", 240)}
                </Text>
              </View>
            ))}
          </View>
          <Footer page="3" />
        </Page>
      ) : null}

      {/* ===== STORYBOARD ===== */}
      {featuredStoryboard.length > 0 ? (
        <Page size="LETTER" style={styles.page}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionKicker}>04 · Look</Text>
            <Text style={styles.sectionTitle}>Storyboard</Text>
          </View>
          <View style={styles.storyboardGrid}>
            {featuredStoryboard.map((f, i) => (
              <View key={i} style={styles.storyboardCard}>
                {isUsableUrl(f.imageUrl) ? (
                  <Image src={f.imageUrl as string} style={styles.storyboardImage} />
                ) : (
                  <View style={styles.storyboardImage} />
                )}
                <Text style={styles.storyboardLabel}>
                  {f.scene || "Scene"} · {f.shotSize || "—"}
                </Text>
                <Text style={styles.storyboardCaption}>
                  {truncate(f.description || "", 160)}
                </Text>
              </View>
            ))}
          </View>
          <Footer page="4" />
        </Page>
      ) : null}

      {/* ===== BUDGET ===== */}
      {budget.length > 0 ? (
        <Page size="LETTER" style={styles.page}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionKicker}>05 · Production</Text>
            <Text style={styles.sectionTitle}>Budget Summary</Text>
          </View>
          <View>
            {budget.map((cat, i) => (
              <View key={i} style={styles.budgetRow}>
                <Text style={styles.budgetCat}>{cat.name}</Text>
                <Text style={styles.budgetPct}>
                  {cat.percentage ? `${cat.percentage}%` : ""}
                </Text>
                <Text style={styles.budgetAmt}>{formatUsd(cat.amount)}</Text>
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Budget</Text>
              <Text style={styles.totalAmt}>{formatUsd(total)}</Text>
            </View>
          </View>
          <Footer page="5" />
        </Page>
      ) : null}

      {/* ===== DIRECTOR'S STATEMENT ===== */}
      {directorStatement?.statement ? (
        <Page size="LETTER" style={styles.page}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionKicker}>06 · Why</Text>
            <Text style={styles.sectionTitle}>Director's Statement</Text>
          </View>
          {directorStatement.tonalReference ? (
            <Text style={styles.pull}>{directorStatement.tonalReference}</Text>
          ) : null}
          {directorStatement.statement.split(/\n\n+/).map((p, i) => (
            <Text key={i} style={styles.paragraph}>
              {p.replace(/\s+/g, " ").trim()}
            </Text>
          ))}

          {directorStatement.visualApproach ? (
            <>
              <Text style={[styles.label, { marginTop: 14 }]}>Visual Approach</Text>
              <Text style={styles.paragraph}>{directorStatement.visualApproach}</Text>
            </>
          ) : null}

          {directorStatement.personalConnection ? (
            <>
              <Text style={styles.label}>Why This Filmmaker</Text>
              <Text style={styles.paragraph}>{directorStatement.personalConnection}</Text>
            </>
          ) : null}
          <Footer page="6" />
        </Page>
      ) : null}
    </Document>
  );
}

function Footer({ page }: { page: string }) {
  return (
    <View style={styles.footer} fixed>
      <Text>VIZIR · PITCH DECK</Text>
      <Text>{page}</Text>
    </View>
  );
}
