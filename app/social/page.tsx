"use client";

import { useState } from "react";
import {
  Megaphone,
  Instagram,
  Twitter,
  Linkedin,
  Copy,
  Check,
  RefreshCw,
  Loader2,
  Video,
  Hash,
  CalendarDays,
  Quote,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import EmptyState from "@/components/EmptyState";
import { useFilmStore } from "@/lib/store";
import type { SocialPackage } from "@/lib/generators";

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Clipboard blocked");
    }
  };
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={copy}
      className="border-[#FF6A00]/20 text-[#FF6A00] hover:bg-[#FF6A00] hover:text-white"
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 mr-1.5" />
          Copied
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5 mr-1.5" />
          {label}
        </>
      )}
    </Button>
  );
}

function HashtagLine({ tags }: { tags: string[] }) {
  if (!tags || tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 pt-3 border-t border-[#FF6A00]/10">
      {tags.map((t, i) => (
        <span
          key={i}
          className="text-[11px] text-[#7AE2CF] font-mono"
        >
          {t.startsWith("#") ? t : `#${t}`}
        </span>
      ))}
    </div>
  );
}

export default function SocialPage() {
  const { filmPackage, updateFilmPackage } = useFilmStore();
  const [loading, setLoading] = useState(false);

  const hasMinimum = !!(filmPackage?.logline || filmPackage?.synopsis);
  const social = filmPackage?.socialPackage;

  const handleGenerate = async () => {
    if (!hasMinimum) {
      toast.error("Generate a logline or synopsis first.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/social", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: filmPackage?.idea,
          logline: filmPackage?.logline,
          synopsis: filmPackage?.synopsis,
          genre: filmPackage?.genre,
          themes: filmPackage?.themes,
        }),
      });
      const raw = await res.text();
      let data: any = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {}
      if (!res.ok || !data?.socialPackage) {
        toast.error(data?.error || "Social package generation failed.");
        return;
      }
      updateFilmPackage({ socialPackage: data.socialPackage as SocialPackage });
      toast.success("Social package ready");
    } catch (err: any) {
      toast.error(err?.message || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  if (!social) {
    return (
      <EmptyState
        icon={Megaphone}
        title="Social Package"
        subtitle="Launch-ready campaign copy for every platform"
        emptyTitle="No social package yet"
        emptyDescription="Generate 3 Instagram captions, 2 X/Twitter teaser threads, a TikTok hook script, a LinkedIn announcement, hashtag sets, and a 4-week rollout calendar. Written like a filmmaker, not a template."
        needsPrerequisite={!hasMinimum}
        prerequisiteMessage="Generate at least a logline and synopsis on the Create tab before building a social package."
        actionLabel="Generate Social Package"
        actionLoadingLabel="Drafting campaign..."
        onAction={handleGenerate}
        loading={loading}
      />
    );
  }

  return (
    <div className="min-h-screen cinematic-gradient">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                <Megaphone className="w-7 h-7 text-[#FF6A00]" />
                Social Package
              </h1>
              <p className="text-[#B2C8C9]">
                {filmPackage?.idea || "Untitled"}
                {filmPackage?.genre ? ` · ${filmPackage.genre}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-3 mt-4 md:mt-0">
              <Button
                onClick={handleGenerate}
                disabled={loading}
                className="bg-[#FF6A00] hover:bg-[#E55A00] text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Redrafting...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Regenerate
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Positioning */}
          <Card className="glass-effect border-[#FF6A00]/20 p-6 mb-6">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex items-center gap-2">
                <Quote className="w-4 h-4 text-[#FF6A00]" />
                <span className="text-xs uppercase tracking-wider text-[#FF6A00] font-semibold">
                  Positioning
                </span>
              </div>
              <CopyButton
                text={`${social.headline}\n\n${social.positioning}`}
                label="Copy"
              />
            </div>
            <h2 className="text-xl font-bold text-white mb-2 leading-tight">
              {social.headline}
            </h2>
            <p className="text-[#D4DEE0] text-sm leading-relaxed">
              {social.positioning}
            </p>
          </Card>

          {/* Instagram Captions */}
          <SectionTitle Icon={Instagram} title="Instagram" count={social.instagramCaptions.length} />
          <div className="grid md:grid-cols-2 gap-4 mb-8">
            {social.instagramCaptions.map((cap, i) => {
              const fullText = `${cap.caption}\n\n${cap.callToAction}\n\n${cap.hashtags
                .map((t) => (t.startsWith("#") ? t : `#${t}`))
                .join(" ")}`;
              return (
                <Card
                  key={i}
                  className="glass-effect border-[#FF6A00]/20 p-5"
                >
                  <div className="flex items-start justify-between mb-3">
                    <Badge className="bg-[#FF6A00]/15 text-[#FF6A00] border border-[#FF6A00]/30">
                      {cap.variant}
                    </Badge>
                    <CopyButton text={fullText} />
                  </div>
                  <p className="text-sm text-[#E8ECF0] leading-relaxed whitespace-pre-wrap mb-3">
                    {cap.caption}
                  </p>
                  {cap.callToAction && (
                    <p className="text-xs text-[#FF6A00] font-semibold mb-3">
                      → {cap.callToAction}
                    </p>
                  )}
                  <HashtagLine tags={cap.hashtags} />
                </Card>
              );
            })}
          </div>

          {/* Twitter Threads */}
          <SectionTitle Icon={Twitter} title="X / Twitter Threads" count={social.twitterThreads.length} />
          <div className="space-y-4 mb-8">
            {social.twitterThreads.map((thread, i) => {
              const full = [thread.hookTweet, ...thread.tweets, thread.callToAction]
                .filter(Boolean)
                .map((t, idx) =>
                  idx === 0 ? t : `${idx + 1}/ ${t}`,
                )
                .join("\n\n");
              return (
                <Card
                  key={i}
                  className="glass-effect border-[#FF6A00]/20 p-5"
                >
                  <div className="flex items-start justify-between mb-3">
                    <Badge className="bg-[#FF6A00]/15 text-[#FF6A00] border border-[#FF6A00]/30">
                      Thread {i + 1}
                    </Badge>
                    <CopyButton text={full} label="Copy Thread" />
                  </div>
                  <div className="space-y-2">
                    <div className="border-l-2 border-[#FF6A00] pl-3 py-1">
                      <div className="text-xs text-[#FF6A00] font-bold mb-1">HOOK</div>
                      <p className="text-sm text-[#E8ECF0] leading-relaxed">
                        {thread.hookTweet}
                      </p>
                    </div>
                    {thread.tweets.map((tw, tIdx) => (
                      <div
                        key={tIdx}
                        className="border-l-2 border-[#FF6A00]/30 pl-3 py-1"
                      >
                        <div className="text-[11px] text-[#6E8B8D] font-mono mb-1">
                          {tIdx + 2}/
                        </div>
                        <p className="text-sm text-[#D4DEE0] leading-relaxed">
                          {tw}
                        </p>
                      </div>
                    ))}
                    {thread.callToAction && (
                      <div className="border-l-2 border-[#7AE2CF] pl-3 py-1">
                        <div className="text-xs text-[#7AE2CF] font-bold mb-1">CTA</div>
                        <p className="text-sm text-[#E8ECF0] leading-relaxed">
                          {thread.callToAction}
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          {/* TikTok */}
          <SectionTitle Icon={Video} title="TikTok Hook (15-30s vertical)" />
          <Card className="glass-effect border-[#FF6A00]/20 p-5 mb-8">
            <div className="flex items-start justify-between mb-3">
              <Badge className="bg-[#FF6A00]/15 text-[#FF6A00] border border-[#FF6A00]/30">
                Script
              </Badge>
              <CopyButton
                text={[
                  `HOOK (0-3s): ${social.tiktokHook.hookLine}`,
                  "",
                  "BEATS:",
                  ...social.tiktokHook.beats.map((b, i) => `${i + 1}. ${b}`),
                  "",
                  `VO: ${social.tiktokHook.voiceOver}`,
                  `END TEXT: ${social.tiktokHook.onScreenText}`,
                  "",
                  `CAPTION: ${social.tiktokHook.caption}`,
                  "",
                  social.tiktokHook.hashtags
                    .map((t) => (t.startsWith("#") ? t : `#${t}`))
                    .join(" "),
                ].join("\n")}
                label="Copy Script"
              />
            </div>
            <div className="space-y-4">
              <div>
                <div className="text-xs text-[#FF6A00] uppercase tracking-wider font-semibold mb-1">
                  Hook (first 3s)
                </div>
                <p className="text-sm text-[#E8ECF0] border-l-2 border-[#FF6A00] pl-3 italic">
                  "{social.tiktokHook.hookLine}"
                </p>
              </div>
              <div>
                <div className="text-xs text-[#FF6A00] uppercase tracking-wider font-semibold mb-2">
                  Beats
                </div>
                <ol className="space-y-1.5 text-sm text-[#D4DEE0]">
                  {social.tiktokHook.beats.map((b, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-[#FF6A00] font-bold shrink-0">
                        {i + 1}.
                      </span>
                      <span className="leading-relaxed">{b}</span>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-[#FF6A00] uppercase tracking-wider font-semibold mb-1">
                    Voiceover
                  </div>
                  <p className="text-sm text-[#D4DEE0] leading-relaxed">
                    {social.tiktokHook.voiceOver}
                  </p>
                </div>
                <div>
                  <div className="text-xs text-[#FF6A00] uppercase tracking-wider font-semibold mb-1">
                    End-Frame Text
                  </div>
                  <p className="text-sm text-[#E8ECF0] font-semibold">
                    {social.tiktokHook.onScreenText}
                  </p>
                </div>
              </div>
              <Separator className="bg-[#FF6A00]/10" />
              <div>
                <div className="text-xs text-[#FF6A00] uppercase tracking-wider font-semibold mb-1">
                  Caption
                </div>
                <p className="text-sm text-[#D4DEE0] leading-relaxed">
                  {social.tiktokHook.caption}
                </p>
                <HashtagLine tags={social.tiktokHook.hashtags} />
              </div>
            </div>
          </Card>

          {/* LinkedIn */}
          <SectionTitle Icon={Linkedin} title="LinkedIn Announcement" />
          <Card className="glass-effect border-[#FF6A00]/20 p-5 mb-8">
            <div className="flex items-start justify-between mb-3">
              <Badge className="bg-[#FF6A00]/15 text-[#FF6A00] border border-[#FF6A00]/30">
                Post
              </Badge>
              <CopyButton text={social.linkedinAnnouncement} label="Copy Post" />
            </div>
            <p className="text-sm text-[#E8ECF0] leading-relaxed whitespace-pre-wrap">
              {social.linkedinAnnouncement}
            </p>
          </Card>

          {/* Hashtag Sets */}
          <SectionTitle Icon={Hash} title="Hashtag Sets" count={social.hashtagSets.length} />
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            {social.hashtagSets.map((set, i) => {
              const tagString = set.tags
                .map((t) => (t.startsWith("#") ? t : `#${t}`))
                .join(" ");
              return (
                <Card
                  key={i}
                  className="glass-effect border-[#FF6A00]/20 p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-xs uppercase tracking-wider text-[#FF6A00] font-semibold">
                      {set.label}
                    </div>
                    <CopyButton text={tagString} />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {set.tags.map((t, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] text-[#7AE2CF] font-mono"
                      >
                        {t.startsWith("#") ? t : `#${t}`}
                      </span>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Content Calendar */}
          <SectionTitle Icon={CalendarDays} title="4-Week Rollout Calendar" />
          <div className="space-y-3 mb-8">
            {social.contentCalendar.map((entry) => (
              <Card
                key={entry.week}
                className="glass-effect border-[#FF6A00]/20 p-4"
              >
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-14 h-14 rounded-lg bg-[#FF6A00]/10 border border-[#FF6A00]/30 flex flex-col items-center justify-center">
                    <div className="text-[10px] uppercase text-[#FF6A00] font-bold">
                      Week
                    </div>
                    <div className="text-xl font-bold text-[#FF6A00] leading-none">
                      {entry.week}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="font-semibold text-white">{entry.theme}</span>
                      {entry.platforms.map((p, i) => (
                        <Badge
                          key={i}
                          className="bg-[#091416] text-[#A8BFC1] border border-[#6E8B8D]/30 text-[10px]"
                        >
                          {p}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-sm text-[#D4DEE0] leading-relaxed mb-1.5">
                      {entry.contentIdea}
                    </p>
                    {entry.callToAction && (
                      <p className="text-xs text-[#FF6A00] italic">
                        → {entry.callToAction}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({
  Icon,
  title,
  count,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  count?: number;
}) {
  return (
    <div className="flex items-center gap-2 mb-3 mt-2">
      <Icon className="w-5 h-5 text-[#FF6A00]" />
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      {typeof count === "number" && (
        <span className="text-xs text-[#6E8B8D]">({count})</span>
      )}
    </div>
  );
}
