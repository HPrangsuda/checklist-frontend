import React from 'react';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { PermissionsProvider } from '@/core/hooks/permission.provider';

interface TemplateProps {
  children: React.ReactNode;
  pathname: string;
  activeModule: string;
  navItems: any[];
  handleNavigate: (path: string) => void;
}

const Template: React.FC<TemplateProps> = ({
  children,
  pathname,
  activeModule,
  navItems,
  handleNavigate,
}) => {
  return (
    <PermissionsProvider>
      <SidebarProvider>
        <div className="flex h-screen w-full">
          <AppSidebar
            navItems={navItems}
            pathname={pathname}
            activeModule={activeModule}
            onNavigate={handleNavigate}
          />
          <SidebarInset className="flex flex-col flex-1">
            <Header
              activeModule={activeModule}
              pathname={pathname}
              onNavigate={handleNavigate}
            />
            <main className="flex-1 overflow-auto">
              {children}
            </main>
            <Footer />
          </SidebarInset>
        </div>
      </SidebarProvider>
    </PermissionsProvider>
  );
};
export default Template;
