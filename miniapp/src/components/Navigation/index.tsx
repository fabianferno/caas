'use client';

import { TabItem, Tabs } from '@worldcoin/mini-apps-ui-kit-react';
import { Home, Search, PlusCircle, User } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

export const Navigation = () => {
  const pathname = usePathname();
  const router = useRouter();

  const currentTab = pathname.startsWith('/explore')
    ? 'explore'
    : pathname.startsWith('/create')
      ? 'create'
      : pathname.startsWith('/profile')
        ? 'profile'
        : 'home';

  const handleChange = (value: string) => {
    router.push(`/${value}`);
  };

  return (
    <Tabs value={currentTab} onValueChange={handleChange}>
      <TabItem value="home" icon={<Home size={20} />} label="Home" />
      <TabItem value="explore" icon={<Search size={20} />} label="Explore" />
      <TabItem value="create" icon={<PlusCircle size={20} />} label="Create" />
      <TabItem value="profile" icon={<User size={20} />} label="Profile" />
    </Tabs>
  );
};
