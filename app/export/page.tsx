"use client";

import { useState } from "react";
import {
  Download,
  FileText,
  Film,
  Package,
  Share,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ExportOption {
  id: string;
  name: string;
  description: string;
  format: string;
  size: string;
}

const exportOptions: ExportOption[] = [
  {
    id: "script",
    name: "Script Export",
    description: "Export screenplay in industry-standard format",
    format: "PDF",
    size: "2-5 MB",
  },
  {
    id: "storyboard",
    name: "Storyboard Package",
    description: "Visual storyboard with shot lists and notes",
    format: "PDF",
    size: "15-30 MB",
  },
  {
    id: "budget",
    name: "Budget Report",
    description: "Detailed budget breakdown and analysis",
    format: "Excel",
    size: "1-2 MB",
  },
  {
    id: "schedule",
    name: "Production Schedule",
    description: "Complete shooting schedule with crew details",
    format: "PDF",
    size: "2-4 MB",
  },
  {
    id: "characters",
    name: "Character Profiles",
    description: "Character descriptions and development notes",
    format: "PDF",
    size: "5-10 MB",
  },
  {
    id: "locations",
    name: "Location Package",
    description: "Location details with types and filming considerations",
    format: "ZIP",
    size: "20-50 MB",
  },
  {
    id: "complete",
    name: "Complete Package",
    description: "Everything in one comprehensive export",
    format: "ZIP",
    size: "100-200 MB",
  },
];

export default function ExportPage() {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  const handleOptionToggle = (optionId: string) => {
    setSelectedOptions((prev) =>
      prev.includes(optionId)
        ? prev.filter((id) => id !== optionId)
        : [...prev, optionId]
    );
  };

  const handleExport = async () => {
    if (selectedOptions.length === 0) {
      alert("Please select at least one export option.");
      return;
    }

    setIsExporting(true);
    try {
      // Simulate an export request
      await new Promise((resolve) => setTimeout(resolve, 3000));
      alert("Export completed successfully!");
    } catch (error) {
      console.error("Export failed:", error);
      alert("Export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  // Estimate total size
  const estimatedSizeMB = selectedOptions.length
    ? selectedOptions.length * 25
    : 0;

  // Estimate time
  const estimatedMinutes = selectedOptions.length
    ? Math.max(1, Math.ceil(selectedOptions.length * 0.5))
    : 0;

  return (
    <div className="min-h-screen cinematic-gradient">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <Package className="w-16 h-16 text-[#FF6A00] mx-auto mb-4" />
            <h1 className="text-4xl font-bold text-white mb-4">
              Export Project
            </h1>
            <p className="text-xl text-[#B2C8C9] max-w-2xl mx-auto">
              Export your project data in various formats for sharing,
              backup, or handoff to other teams.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Export Options */}
            <div className="lg:col-span-2">
              <Card className="glass-effect border-[#FF6A00]/20 p-6 mb-8">
                <h2 className="text-xl font-semibold text-white mb-6">
                  Select Export Options
                </h2>

                <div className="space-y-4">
                  {exportOptions.map((option) => {
                    const isSelected = selectedOptions.includes(option.id);

                    return (
                      <div
                        key={option.id}
                        className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                          isSelected
                            ? "border-[#FF6A00] bg-[#FF6A00]/10"
                            : "border-[#FF6A00]/20 hover:border-[#FF6A00]/40"
                        }`}
                        onClick={() => handleOptionToggle(option.id)}
                      >
                        <div className="flex items-start space-x-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() =>
                              handleOptionToggle(option.id)
                            }
                            className="mt-1 text-[#FF6A00] focus:ring-[#FF6A00]"
                          />

                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-lg font-medium text-white">
                                {option.name}
                              </h3>
                              <Badge
                                variant="secondary"
                                className="text-xs bg-[#032f30] text-[#8da3a4]"
                              >
                                {option.format}
                              </Badge>
                              <Badge
                                variant="secondary"
                                className="text-xs bg-[#032f30] text-[#8da3a4]"
                              >
                                {option.size}
                              </Badge>
                            </div>

                            <p className="text-[#B2C8C9] text-sm">
                              {option.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>

            {/* Export Summary & Actions */}
            <div className="space-y-6">
              {/* Export Summary */}
              <Card className="glass-effect border-[#FF6A00]/20 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Export Summary
                </h3>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-[#8da3a4]">Selected Items:</span>
                    <span className="text-white font-medium">
                      {selectedOptions.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8da3a4]">Estimated Size:</span>
                    <span className="text-white font-medium">
                      {estimatedSizeMB} MB
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8da3a4]">Estimated Time:</span>
                    <span className="text-white font-medium">
                      {estimatedMinutes} min
                    </span>
                  </div>
                </div>

                <Button
                  onClick={handleExport}
                  disabled={
                    selectedOptions.length === 0 || isExporting
                  }
                  className="w-full mt-6 bg-[#FF6A00] hover:bg-[#E55A00] text-white disabled:opacity-50"
                >
                  {isExporting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Export Selected
                    </>
                  )}
                </Button>
              </Card>

              {/* Quick Export */}
              <Card className="glass-effect border-[#FF6A00]/20 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Quick Export
                </h3>

                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start border-[#FF6A00]/20 text-[#FF6A00] hover:bg-[#FF6A00] hover:text-white"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Script PDF
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start border-[#FF6A00]/20 text-[#FF6A00] hover:bg-[#FF6A00] hover:text-white"
                  >
                    <Film className="w-4 h-4 mr-2" />
                    Storyboard
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start border-[#FF6A00]/20 text-[#FF6A00] hover:bg-[#FF6A00] hover:text-white"
                  >
                    <Package className="w-4 h-4 mr-2" />
                    Complete Package
                  </Button>
                </div>
              </Card>

              {/* Share Options */}
              <Card className="glass-effect border-[#FF6A00]/20 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Share Project
                </h3>

                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start border-[#FF6A00]/20 text-[#FF6A00] hover:bg-[#FF6A00] hover:text-white"
                  >
                    <Share className="w-4 h-4 mr-2" />
                    Generate Share Link
                  </Button>
                  <p className="text-[#8da3a4] text-xs">
                    Create a shareable link for collaborators to view
                    your project.
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
