import { auth } from "@/auth";
import { Navigation } from "@/components/Navigation";

export default async function TabsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    console.log("Not authenticated");
  }

  return (
    <div className="flex flex-col min-h-dvh bg-background">
      <main className="grow overflow-y-auto">{children}</main>
      <footer className="px-0 fixed bottom-0 w-full bg-surface border-t border-border">
        <Navigation />
      </footer>
    </div>
  );
}
