"use client";

import { useState } from "react";
import { Calendar, Plus, Clock, MapPin, Users, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useFilmStore } from "@/lib/store";

export default function SchedulePage() {
  const { filmPackage, updateFilmPackage } = useFilmStore();
  const [loading, setLoading] = useState(false);

  const handleGenerateSchedule = async () => {
    if (!filmPackage?.script || !filmPackage?.length) {
      alert("Please generate a script first from the Create tab.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          script: filmPackage.script,
          scriptLength: filmPackage.length,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error(errorData);
        alert("Failed to generate schedule.");
        return;
      }

      const data = await res.json();
      console.log("Schedule result:", data);

      updateFilmPackage({
        schedule: data.schedule || [],
      });

      alert("Schedule generated successfully!");
    } catch (error) {
      console.error("Failed to generate schedule:", error);
      alert("An error occurred while generating schedule. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const schedule = filmPackage?.schedule || [];

  const totalDays = schedule.length;
  const totalHours = schedule.reduce(
    (sum, day) => sum + (parseInt(day.duration) || 0),
    0
  );

  if (schedule.length === 0) {
    return (
      <div className="min-h-screen cinematic-gradient">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <Calendar className="w-16 h-16 text-[#FF6A00] mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-white mb-2">
                Production Schedule
              </h1>
              <p className="text-[#B2C8C9]">
                Plan your shooting schedule and timeline
              </p>
            </div>

            <Card className="glass-effect border-[#FF6A00]/20 p-8 text-center">
              <h3 className="text-xl font-semibold text-white mb-4">
                No Schedule Yet
              </h3>
              <p className="text-[#B2C8C9] mb-6">
                Generate a professional production schedule based on your script.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  onClick={handleGenerateSchedule}
                  disabled={loading}
                  className="bg-[#FF6A00] hover:bg-[#E55A00] text-white"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    "Generate Schedule"
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="border-[#FF6A00] text-[#FF6A00] hover:bg-[#FF6A00] hover:text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Day
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
                Production Schedule
              </h1>
              <p className="text-[#B2C8C9]">
                Shooting timeline and crew management
              </p>
            </div>
            <div className="flex items-center space-x-6 mt-4 md:mt-0">
              <div className="text-center">
                <div className="text-2xl font-bold text-[#FF6A00]">
                  {totalDays}
                </div>
                <div className="text-sm text-[#B2C8C9]">Days</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[#FF6A00]">
                  {totalHours}
                </div>
                <div className="text-sm text-[#B2C8C9]">Hours</div>
              </div>
            </div>
          </div>

          {/* Schedule Timeline */}
          <div className="space-y-6">
            {schedule.map((day, index) => (
              <Card
                key={index}
                className="glass-effect border-[#FF6A00]/20 p-6 hover-lift"
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:space-x-6">
                  {/* Day Info */}
                  <div className="lg:w-1/4 mb-4 lg:mb-0">
                    <h3 className="text-xl font-semibold text-white mb-2">
                      {day.day}
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-sm">
                        <Clock className="w-4 h-4 text-[#FF6A00]" />
                        <span className="text-[#B2C8C9]">{day.duration}</span>
                      </div>
                      {day.location && (
                        <div className="flex items-center space-x-2 text-sm">
                          <MapPin className="w-4 h-4 text-[#FF6A00]" />
                          <span className="text-[#B2C8C9]">{day.location}</span>
                        </div>
                      )}
                      {day.crew && (
                        <div className="flex items-center space-x-2 text-sm">
                          <Users className="w-4 h-4 text-[#FF6A00]" />
                          <span className="text-[#B2C8C9]">
                            {day.crew.length} crew
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Activities */}
                  <div className="lg:w-1/2">
                    <h4 className="text-lg font-medium text-white mb-3">
                      Activities
                    </h4>
                    <div className="space-y-2">
                      {day.activities.map((activity, i) => (
                        <div
                          key={i}
                          className="flex items-center space-x-2"
                        >
                          <div className="w-2 h-2 bg-[#FF6A00] rounded-full" />
                          <span className="text-[#B2C8C9]">{activity}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Crew */}
                  {day.crew && (
                    <div className="lg:w-1/4 mt-4 lg:mt-0">
                      <h4 className="text-lg font-medium text-white mb-3">
                        Crew
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {day.crew.map((member, i) => (
                          <Badge
                            key={i}
                            variant="secondary"
                            className="text-xs bg-[#032f30] text-[#B2C8C9]"
                          >
                            {member}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {/* Add Day Button */}
          <div className="mt-8 text-center">
            <Button className="bg-[#FF6A00] hover:bg-[#E55A00] text-white">
              <Plus className="w-4 h-4 mr-2" />
              Add Another Day
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
