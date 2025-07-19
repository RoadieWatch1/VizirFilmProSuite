"use client";

"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Film, 
  FileText, 
  Lightbulb, 
  Users, 
  Image, 
  DollarSign, 
  Calendar, 
  MapPin, 
  Music, 
  Download,
  Clapperboard
} from 'lucide-react';

const navItems = [
  { href: '/', label: 'Create', icon: Film },
  { href: '/script', label: 'Script', icon: FileText },
  { href: '/concept', label: 'Concept', icon: Lightbulb },
  { href: '/characters', label: 'Characters', icon: Users },
  { href: '/storyboard', label: 'Storyboard', icon: Image },
  { href: '/budget', label: 'Budget', icon: DollarSign },
  { href: '/schedule', label: 'Schedule', icon: Calendar },
  { href: '/locations', label: 'Locations', icon: MapPin },
  { href: '/sound', label: 'Sound', icon: Music },
  { href: '/export', label: 'Export', icon: Download },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="bg-[#072324] border-b border-[#FF6A00]/20 sticky top-0 z-50 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-3">
            </div>
          </div>

          {/* Navigation Items */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-[#FF6A00] text-white shadow-lg'
                      : 'text-[#8da3a4] hover:text-white hover:bg-[#14484a]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Clapperboard className="w-6 h-6 text-[#FF6A00]" />
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden pb-4">
          <div className="grid grid-cols-5 gap-2">
            {navItems.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex flex-col items-center space-y-1 p-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-[#FF6A00] text-white'
                      : 'text-[#8da3a4] hover:text-white hover:bg-[#14484a]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}