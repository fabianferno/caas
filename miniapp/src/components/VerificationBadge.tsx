'use client';

import { BadgeCheck, Users } from 'lucide-react';
import type { VerificationStatus } from '@/lib/worldtars-data';

interface VerificationBadgeProps {
  status: VerificationStatus;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const sizes = {
  sm: { icon: 12, text: 'text-[10px]' },
  md: { icon: 14, text: 'text-xs' },
  lg: { icon: 16, text: 'text-sm' },
};

export function VerificationBadge({
  status,
  size = 'md',
  showLabel = false,
  className = '',
}: VerificationBadgeProps) {
  const s = sizes[size];

  if (status === 'self') {
    return (
      <span
        className={`inline-flex items-center gap-1 ${className}`}
        title="Verified Creator — created by the actual person using their World ID"
      >
        <BadgeCheck size={s.icon} className="text-accent flex-shrink-0" />
        {showLabel && (
          <span className={`${s.text} font-medium text-accent`}>
            Verified Creator
          </span>
        )}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 ${className}`}
      title="Community Interpretation — trained on public content, not created by the person"
    >
      <Users size={s.icon} className="text-muted-foreground/60 flex-shrink-0" />
      {showLabel && (
        <span className={`${s.text} font-medium text-muted-foreground/60 italic`}>
          Community
        </span>
      )}
    </span>
  );
}
