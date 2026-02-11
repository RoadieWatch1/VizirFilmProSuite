"use client";

import { useState } from "react";
import {
  DollarSign,
  TrendingUp,
  Calculator,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useFilmStore } from "@/lib/store";
import type { BudgetCategory, BudgetItem } from "@/lib/store";

export default function BudgetPage() {
  const { filmPackage, updateFilmPackage } = useFilmStore();
  const [loading, setLoading] = useState(false);
  const [lowBudgetMode, setLowBudgetMode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const budget: BudgetCategory[] = filmPackage?.budget || [];

  const handleGenerateBudget = async () => {
    if (!filmPackage?.genre || !filmPackage?.length) {
      alert("Please generate a script first from the Create tab.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/budget", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          movieGenre: filmPackage.genre,
          scriptLength: filmPackage.length,
          lowBudgetMode,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData?.error || "Failed to generate budget.");
      }

      const data = await res.json();

      if (data.categories && Array.isArray(data.categories)) {
        updateFilmPackage({ budget: data.categories });
      } else {
        throw new Error("No budget data returned from API.");
      }
    } catch (err: any) {
      console.error("Failed to generate budget:", err);
      setError(err?.message || "An error occurred while generating the budget.");
    } finally {
      setLoading(false);
    }
  };

  const totalBudget = budget.reduce(
    (sum, category) => sum + category.amount,
    0
  );

  const largestCategory = budget.reduce(
    (max, cat) => (cat.amount > max.amount ? cat : max),
    { name: "-", amount: 0, percentage: 0 }
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (budget.length === 0) {
    return (
      <div className="min-h-screen cinematic-gradient">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <DollarSign className="w-16 h-16 text-[#FF6A00] mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-white mb-2">
                Budget Management
              </h1>
              <p className="text-[#B2C8C9]">
                Track production costs and discover ways to save
              </p>
            </div>

            {error && (
              <div className="text-red-400 text-center p-3 bg-red-400/10 rounded-lg mb-4">
                {error}
              </div>
            )}

            <Card className="glass-effect border-[#FF6A00]/20 p-8 text-center">
              <h3 className="text-xl font-semibold text-white mb-4">
                No Budget Yet
              </h3>
              <p className="text-[#B2C8C9] mb-4">
                Generate a professional film budget based on your script
              </p>
              <div className="flex items-center justify-center space-x-2 mb-6">
                <Sparkles className="w-4 h-4 text-[#FF6A00]" />
                <span className="text-[#B2C8C9] text-sm">Low Budget Mode:</span>
                <Switch
                  checked={lowBudgetMode}
                  onCheckedChange={setLowBudgetMode}
                />
              </div>
              <Button
                onClick={handleGenerateBudget}
                disabled={loading}
                className="bg-[#FF6A00] hover:bg-[#E55A00] text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate Budget"
                )}
              </Button>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen cinematic-gradient">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Budget Breakdown
              </h1>
              <p className="text-[#B2C8C9]">
                Professional budgeting for indie to studio-level productions.
              </p>
            </div>
            <div className="flex items-center space-x-4 mt-4 md:mt-0">
              <div className="text-right">
                <div className="text-2xl font-bold text-[#FF6A00]">
                  {formatCurrency(totalBudget)}
                </div>
                <div className="text-sm text-[#B2C8C9]">Total Budget</div>
              </div>
            </div>
          </div>

          {error && (
            <div className="text-red-400 text-center p-3 bg-red-400/10 rounded-lg mb-4">
              {error}
            </div>
          )}

          {/* Budget Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="glass-effect border-[#FF6A00]/20 p-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-blue-500/20 rounded-lg">
                  <DollarSign className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-[#8da3a4] text-sm">Total Budget</p>
                  <p className="text-white text-xl font-bold">
                    {formatCurrency(totalBudget)}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="glass-effect border-[#FF6A00]/20 p-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-green-500/20 rounded-lg">
                  <Calculator className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <p className="text-[#8da3a4] text-sm">Categories</p>
                  <p className="text-white text-xl font-bold">
                    {budget.length}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="glass-effect border-[#FF6A00]/20 p-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-[#FF6A00]/20 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-[#FF6A00]" />
                </div>
                <div>
                  <p className="text-[#8da3a4] text-sm">Largest Category</p>
                  <p className="text-white text-xl font-bold">
                    {largestCategory.name} ({largestCategory.percentage}%)
                  </p>
                </div>
              </div>
            </Card>

            <Card className="glass-effect border-[#FF6A00]/20 p-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-purple-500/20 rounded-lg">
                  <DollarSign className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-[#8da3a4] text-sm">Genre / Length</p>
                  <p className="text-white text-sm font-bold">
                    {filmPackage?.genre || "—"} / {filmPackage?.length || "—"}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Budget Categories */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {budget.map((category, index) => (
              <Card
                key={index}
                className="glass-effect border-[#FF6A00]/20 p-6 hover-lift"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">
                    {category.name}
                  </h3>
                  <div className="text-right">
                    <div className="text-xl font-bold text-[#FF6A00]">
                      {formatCurrency(category.amount)}
                    </div>
                    <div className="text-sm text-[#8da3a4]">
                      {category.percentage}% of total
                    </div>
                  </div>
                </div>

                <div className="w-full bg-[#032f30] rounded-full h-3 mb-4">
                  <div
                    className="bg-[#FF6A00] h-3 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(category.percentage, 100)}%` }}
                  />
                </div>

                {category.items && category.items.length > 0 && (
                  <div className="mb-3">
                    <p className="text-sm text-[#8da3a4] mb-2">Line Items:</p>
                    <div className="space-y-1">
                      {category.items.map((item, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between text-xs bg-[#032f30] text-[#B2C8C9] px-2 py-1.5 rounded"
                        >
                          <span>{typeof item === "object" ? item.name : String(item)}</span>
                          {typeof item === "object" && typeof item.cost === "number" && (
                            <span className="text-[#FF6A00] font-mono ml-2">
                              {formatCurrency(item.cost)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {category.tips && category.tips.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-[#FF6A00] font-bold text-sm mb-2">
                      Cost-Saving Tips:
                    </h4>
                    <ul className="list-disc list-inside text-[#B2C8C9] text-sm">
                      {category.tips.map((tip, i) => (
                        <li key={i}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {category.alternatives && category.alternatives.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-[#FF6A00] font-bold text-sm mb-2">
                      Low-Cost Alternatives:
                    </h4>
                    <ul className="list-disc list-inside text-[#B2C8C9] text-sm">
                      {category.alternatives.map((alt, i) => (
                        <li key={i}>{alt}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
