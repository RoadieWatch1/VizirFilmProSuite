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
    <nav className="bg-[#091416]/90 border-b border-[rgba(255,255,255,0.05)] sticky top-0 z-50 backdrop-blur-xl backdrop-saturate-150">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-2.5 group">
              <Clapperboard className="w-5 h-5 text-[#FF6A00] transition-transform duration-200 group-hover:scale-110" />
              <span className="text-sm font-bold tracking-tight text-[#E8ECF0] hidden lg:inline">VIZIR</span>
            </Link>
          </div>

          {/* Navigation Items */}
          <div className="hidden md:flex items-center space-x-0.5">
            {navItems.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-[#FF6A00]/15 text-[#FF6A00] shadow-[inset_0_0_0_1px_rgba(255,106,0,0.2)]'
                      : 'text-[#6E8B8D] hover:text-[#A8BFC1] hover:bg-[rgba(255,255,255,0.04)]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Clapperboard className="w-5 h-5 text-[#FF6A00]" />
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden pb-3">
          <div className="grid grid-cols-5 gap-1.5">
            {navItems.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex flex-col items-center space-y-0.5 p-2 rounded-lg text-[10px] font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-[#FF6A00]/15 text-[#FF6A00]'
                      : 'text-[#6E8B8D] hover:text-[#A8BFC1] hover:bg-[rgba(255,255,255,0.04)]'
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
