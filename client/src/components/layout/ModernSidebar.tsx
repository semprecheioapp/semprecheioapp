import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ModernBadge } from './ModernLayout';
import { 
  Menu, 
  X, 
  LogOut, 
  Building2, 
  ChevronDown,
  ChevronRight
} from 'lucide-react';

interface SidebarItem {
  name: string;
  icon: React.ComponentType<any>;
  active?: boolean;
  onClick?: () => void;
  badge?: string | number;
  disabled?: boolean;
}

interface SidebarSection {
  section: string;
  items: SidebarItem[];
}

interface ModernSidebarProps {
  sections: SidebarSection[];
  onLogout?: () => void;
  userInfo?: {
    name: string;
    email: string;
    role?: string;
  };
  logo?: {
    icon?: React.ReactNode;
    text: string;
  };
  className?: string;
}

export function ModernSidebar({
  sections,
  onLogout,
  userInfo,
  logo = { text: 'SempreCheio' },
  className
}: ModernSidebarProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  const toggleSection = (sectionName: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionName)
        ? prev.filter(s => s !== sectionName)
        : [...prev, sectionName]
    );
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-center h-16 px-4 border-b border-border bg-card">
        <div className="flex items-center space-x-3">
          {logo.icon || (
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-600 rounded-xl flex items-center justify-center shadow-sm">
              <Building2 className="w-5 h-5 text-white" />
            </div>
          )}
          <span className="text-lg font-bold text-foreground">
            {logo.text}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-6 overflow-y-auto">
        {sections.map((section) => {
          const isExpanded = expandedSections.includes(section.section);
          
          return (
            <div key={section.section} className="space-y-2">
              {/* Section Header */}
              <button
                onClick={() => toggleSection(section.section)}
                className="flex items-center justify-between w-full px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
              >
                <span>{section.section}</span>
                {section.items.length > 3 && (
                  isExpanded ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )
                )}
              </button>

              {/* Section Items */}
              <div className={cn(
                'space-y-1 transition-all duration-200',
                !isExpanded && section.items.length > 3 && 'max-h-32 overflow-hidden'
              )}>
                {section.items.map((item) => (
                  <button
                    key={item.name}
                    onClick={item.onClick}
                    disabled={item.disabled}
                    className={cn(
                      'flex items-center justify-between w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 group',
                      item.active
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                      item.disabled && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <div className="flex items-center space-x-3">
                      <item.icon className={cn(
                        'w-4 h-4 transition-colors',
                        item.active ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground'
                      )} />
                      <span>{item.name}</span>
                    </div>
                    {item.badge && (
                      <ModernBadge 
                        variant={item.active ? 'default' : 'info'} 
                        size="sm"
                        className={item.active ? 'bg-primary-foreground/20 text-primary-foreground' : ''}
                      >
                        {item.badge}
                      </ModernBadge>
                    )}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User Info & Logout */}
      <div className="border-t border-border p-4 space-y-3">
        {userInfo && (
          <div className="px-3 py-2 bg-accent rounded-lg">
            <p className="text-sm font-medium text-foreground truncate">
              {userInfo.name}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {userInfo.email}
            </p>
            {userInfo.role && (
              <ModernBadge variant="info" size="sm" className="mt-1">
                {userInfo.role}
              </ModernBadge>
            )}
          </div>
        )}
        
        {onLogout && (
          <Button
            variant="ghost"
            onClick={onLogout}
            className="w-full justify-start text-muted-foreground hover:text-foreground"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsMobileOpen(true)}
          className="bg-background/80 backdrop-blur-sm shadow-md"
        >
          <Menu className="w-4 h-4" />
        </Button>
      </div>

      {/* Desktop Sidebar */}
      <div className={cn(
        'hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-background border-r border-border z-40',
        className
      )}>
        <SidebarContent />
      </div>

      {/* Mobile Sidebar */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsMobileOpen(false)}
          />
          
          {/* Sidebar */}
          <div className="relative flex flex-col w-64 bg-background border-r border-border animate-slide-up">
            {/* Close Button */}
            <div className="absolute top-4 right-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  );
}

interface ModernLayoutWithSidebarProps {
  children: React.ReactNode;
  sidebar: ModernSidebarProps;
  className?: string;
}

export function ModernLayoutWithSidebar({
  children,
  sidebar,
  className
}: ModernLayoutWithSidebarProps) {
  return (
    <div className="min-h-screen bg-background">
      <ModernSidebar {...sidebar} />
      
      {/* Main Content */}
      <div className="lg:ml-64">
        <main className={cn('min-h-screen safe-area', className)}>
          {children}
        </main>
      </div>
    </div>
  );
}
