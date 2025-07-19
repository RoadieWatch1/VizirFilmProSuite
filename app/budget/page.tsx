"use client";

import { useState, useMemo } from "react";
import {
  DollarSign,
  Plus,
  TrendingUp,
  Calculator,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

interface BudgetCategory {
  name: string;
  amount: number;
  percentage: number;
  items?: string[];
  tips?: string[];
  alternatives?: string[];
}

export default function BudgetPage() {
  const [budget, setBudget] = useState<BudgetCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [lowBudgetMode, setLowBudgetMode] = useState(false);
  const [days, setDays] = useState(5);

  const handleGenerateBudget = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/budget", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          movieGenre: "Psychological Thriller",
          scriptLength: "10 min",
          lowBudgetMode, // optionally send low-budget preference
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error(errorData);
        alert("Failed to generate budget.");
        return;
      }

      const data = await res.json();
      console.log("Budget result:", data);

      if (data.categories) {
        setBudget(data.categories);
      } else {
        alert("No budget data returned from API.");
      }
    } catch (error) {
      console.error("Failed to generate budget:", error);
      alert("An error occurred while generating the budget.");
    } finally {
      setLoading(false);
    }
  };

  // Optionally reduce budget amounts in low-budget mode
  const adjustedBudget = useMemo(() => {
    if (!lowBudgetMode) return budget;
    return budget.map((cat) => ({
      ...cat,
      amount: Math.round(cat.amount * 0.5),
    }));
  }, [budget, lowBudgetMode]);

  const totalBudget = adjustedBudget.reduce(
    (sum, category) => sum + category.amount,
    0
  );

  const largestCategory = adjustedBudget.reduce(
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

            <Card className="glass-effect border-[#FF6A00]/20 p-8 text-center">
              <h3 className="text-xl font-semibold text-white mb-4">
                No Budget Yet
              </h3>
              <p className="text-[#B2C8C9] mb-6">
                Generate a professional film budget or create a custom plan
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
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
                <Button
                  variant="outline"
                  className="border-[#FF6A00] text-[#FF6A00] hover:bg-[#FF6A00] hover:text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Custom
                </Button>
              </div>
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
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-[#FF6A00]" />
                <span className="text-[#B2C8C9] text-sm">Low Budget Mode:</span>
                <Switch
                  checked={lowBudgetMode}
                  onCheckedChange={setLowBudgetMode}
                />
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-[#FF6A00]">
                  {formatCurrency(totalBudget)}
                </div>
                <div className="text-sm text-[#B2C8C9]">Total Budget</div>
              </div>
            </div>
          </div>

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
                    {adjustedBudget.length}
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
                    {largestCategory.name} (
                    {largestCategory.percentage}%)
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
                  <p className="text-[#8da3a4] text-sm">Per Day Estimate</p>
                  <p className="text-white text-xl font-bold">
                    {formatCurrency(totalBudget / days)}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Budget Categories */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {adjustedBudget.map((category, index) => (
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
                    style={{ width: `${category.percentage}%` }}
                  />
                </div>

                {category.items && (
                  <div>
                    <p className="text-sm text-[#8da3a4] mb-2">Includes:</p>
                    <div className="flex flex-wrap gap-1">
                      {category.items.map((item, i) => (
                        <span
                          key={i}
                          className="text-xs bg-[#032f30] text-[#B2C8C9] px-2 py-1 rounded"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

   {category.tips && category.tips.length > 0 && (
  <div className="mt-4">
    <h4 className="text-[#FF6A00] font-bold mb-2">
      Cost-Saving Tips:
    </h4>
    <ul className="list-disc list-inside text-[#B2C8C9] text-sm">
      {category.tips?.map((tip, i) => (
        <li key={i}>{tip}</li>
      ))}
    </ul>
  </div>
)}

{category.alternatives && category.alternatives.length > 0 && (
  <div className="mt-4">
    <h4 className="text-[#FF6A00] font-bold mb-2">
      Low-Cost Alternatives:
    </h4>
    <ul className="list-disc list-inside text-[#B2C8C9] text-sm">
      {category.alternatives?.map((alt, i) => (
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
