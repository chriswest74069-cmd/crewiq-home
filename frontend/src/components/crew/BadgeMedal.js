import React from "react";
import { Award, Crown, Sparkles, Star, Trophy, Medal, Shield, Flame, HandHeart, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { BADGE_TIERS } from "@/lib/constants";

const ICONS = { award: Award, crown: Crown, sparkles: Sparkles, star: Star, trophy: Trophy, medal: Medal, shield: Shield, flame: Flame, "hand-heart": HandHeart, zap: Zap };

export function BadgeMedal({ badge, size = "md", locked = false }) {
  const Icon = ICONS[badge.icon] || Award;
  const tier = BADGE_TIERS[badge.tier] || BADGE_TIERS.Common;
  const dim = size === "lg" ? "h-20 w-20" : size === "sm" ? "h-12 w-12" : "h-16 w-16";
  return (
    <div className={cn("grid place-items-center rounded-2xl bg-gradient-to-br text-white shadow-lg", dim, tier.cls, locked && "grayscale opacity-50")}>
      <Icon className={size === "lg" ? "h-10 w-10" : size === "sm" ? "h-6 w-6" : "h-8 w-8"} />
    </div>
  );
}

export function TierPill({ tier }) {
  const t = BADGE_TIERS[tier] || BADGE_TIERS.Common;
  return <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold", t.text)}>{tier}</span>;
}
