"use client";

import { TabItem, Tabs } from "@worldcoin/mini-apps-ui-kit-react";
import { Bank, Home, User } from "iconoir-react";
import { useState } from "react";

export const Navigation = () => {
  const [value, setValue] = useState("home");

  return (
    <div className="bg-[#141414] border-t border-[#2a2a2a] pb-[env(safe-area-inset-bottom)]">
      <Tabs value={value} onValueChange={setValue}>
        <TabItem value="home" icon={<Home />} label="Home" />
        <TabItem value="wallet" icon={<Bank />} label="Wallet" />
        <TabItem value="profile" icon={<User />} label="Profile" />
      </Tabs>
    </div>
  );
};
