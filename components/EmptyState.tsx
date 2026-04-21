"use client";

import Link from "next/link";
import { Loader2, Sparkles, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type EmptyStateProps = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  emptyTitle: string;
  emptyDescription: string;
  needsPrerequisite?: boolean;
  prerequisiteMessage?: string;
  prerequisiteCta?: string;
  prerequisiteHref?: string;
  actionLabel: string;
  actionLoadingLabel?: string;
  onAction: () => void;
  loading?: boolean;
  extra?: React.ReactNode;
};

export default function EmptyState({
  icon: Icon,
  title,
  subtitle,
  emptyTitle,
  emptyDescription,
  needsPrerequisite = false,
  prerequisiteMessage = "Start by creating your film idea on the Create tab.",
  prerequisiteCta = "Go to Create",
  prerequisiteHref = "/",
  actionLabel,
  actionLoadingLabel = "Generating...",
  onAction,
  loading = false,
  extra,
}: EmptyStateProps) {
  return (
    <div className="min-h-screen cinematic-gradient">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[#FF6A00]/10 border border-[#FF6A00]/30 mb-4">
              <Icon className="w-10 h-10 text-[#FF6A00]" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-[#B2C8C9] text-base md:text-lg">{subtitle}</p>
            )}
          </div>

          <Card className="glass-effect border-[#FF6A00]/20 p-8 md:p-12 text-center">
            {needsPrerequisite ? (
              <>
                <div className="flex items-center justify-center mb-4">
                  <Sparkles className="w-6 h-6 text-[#FF6A00] mr-2" />
                  <h3 className="text-2xl font-semibold text-white">
                    Start with your story
                  </h3>
                </div>
                <p className="text-[#B2C8C9] mb-8 max-w-xl mx-auto">
                  {prerequisiteMessage}
                </p>
                <Link href={prerequisiteHref}>
                  <Button className="bg-[#FF6A00] hover:bg-[#E55A00] text-white px-6 py-5 text-base">
                    {prerequisiteCta}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <h3 className="text-2xl font-semibold text-white mb-3">
                  {emptyTitle}
                </h3>
                <p className="text-[#B2C8C9] mb-6 max-w-xl mx-auto leading-relaxed">
                  {emptyDescription}
                </p>
                {extra && <div className="mb-6">{extra}</div>}
                <Button
                  onClick={onAction}
                  disabled={loading}
                  aria-busy={loading}
                  className="bg-[#FF6A00] hover:bg-[#E55A00] text-white px-6 py-5 text-base"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {actionLoadingLabel}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      {actionLabel}
                    </>
                  )}
                </Button>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
