import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Navigation } from '@/components/Navigation';
import { Page } from '@/components/PageLayout';

export default async function TabsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect('/');
  }

  return (
    <Page>
      {children}
      <Page.Footer className="px-0 shrink-0 bg-background">
        <Navigation />
      </Page.Footer>
    </Page>
  );
}
