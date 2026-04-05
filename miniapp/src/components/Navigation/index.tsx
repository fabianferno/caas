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
      className="flex items-center justify-around px-4 pt-3 pb-4"
      style={{
        background: '#e0e5ec',
        boxShadow: '-4px -4px 10px #ffffff, 4px 0px 10px #a3b1c6',
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
                    boxShadow: 'inset 3px 3px 7px #a3b1c6, inset -3px -3px 7px #ffffff',
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
