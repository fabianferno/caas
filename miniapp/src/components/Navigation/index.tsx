'use client';

import { Home, PlusCircle, User } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

const tabs = [
  { value: 'home', icon: Home, label: 'Home' },
  { value: 'create', icon: PlusCircle, label: 'Create' },
  { value: 'profile', icon: User, label: 'Profile' },
];

export const Navigation = () => {
  const pathname = usePathname();
  const router = useRouter();

  const currentTab = pathname.startsWith('/create')
    ? 'create'
    : pathname.startsWith('/profile')
      ? 'profile'
      : 'home';

  return (
    <nav
      className="flex items-center justify-around px-4 pt-3 pb-[max(env(safe-area-inset-bottom),16px)]"
      style={{
        background: '#e0e5ec',
        boxShadow: '-4px -4px 10px rgba(255,255,255,0.5), 4px 0px 10px #b3b7bd',
      }}
    >
      {tabs.map(({ value, icon: Icon, label }) => {
        const active = currentTab === value;
        return (
          <button
            key={value}
            onClick={() => router.push(`/${value}`)}
            className="flex flex-col items-center gap-1 px-5 py-2 rounded-2xl transition-all"
            style={
              active
                ? {
                    background: '#e0e5ec',
                    boxShadow: 'inset 3px 3px 7px #b3b7bd, inset -3px -3px 7px rgba(255,255,255,0.85)',
                  }
                : {
                    background: 'transparent',
                    boxShadow: 'none',
                  }
            }
          >
            <Icon
              size={20}
              style={{
                color: active ? '#7b96f5' : '#8a9bb0',
                transition: 'color 200ms ease',
              }}
            />
            <span
              className="text-[10px] font-semibold uppercase tracking-[0.08em]"
              style={{
                color: active ? '#7b96f5' : '#8a9bb0',
                transition: 'color 200ms ease',
              }}
            >
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
