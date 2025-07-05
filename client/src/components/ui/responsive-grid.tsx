import React from "react";
import { useResponsive } from "@/hooks/use-responsive";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ResponsiveGridProps {
  children: React.ReactNode;
  cols?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: number;
  className?: string;
}

export function ResponsiveGrid({
  children,
  cols = { default: 1, sm: 2, md: 2, lg: 3, xl: 4 },
  gap = 4,
  className = ""
}: ResponsiveGridProps) {
  const { isMobile, isTablet, isDesktop } = useResponsive();

  const getGridCols = () => {
    if (isMobile) return cols.default || 1;
    if (isTablet) return cols.md || cols.sm || 2;
    return cols.xl || cols.lg || 3;
  };

  const gridCols = getGridCols();
  const gapClass = `gap-${gap}`;

  return (
    <div 
      className={`grid grid-cols-${gridCols} ${gapClass} ${className}`}
      style={{
        gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`
      }}
    >
      {children}
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ComponentType<any>;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: "blue" | "green" | "red" | "yellow" | "purple" | "gray";
  className?: string;
}

export function ResponsiveMetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = "blue",
  className = ""
}: MetricCardProps) {
  const { isMobile } = useResponsive();

  const colorClasses = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    red: "bg-red-100 text-red-600",
    yellow: "bg-yellow-100 text-yellow-600",
    purple: "bg-purple-100 text-purple-600",
    gray: "bg-gray-100 text-gray-600"
  };

  const textColorClasses = {
    blue: "text-blue-600",
    green: "text-green-600",
    red: "text-red-600",
    yellow: "text-yellow-600",
    purple: "text-purple-600",
    gray: "text-gray-600"
  };

  return (
    <Card className={`${className}`}>
      <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className={`text-sm font-medium text-gray-600 ${isMobile ? 'text-xs' : ''}`}>
              {title}
            </p>
            <p className={`font-bold ${textColorClasses[color]} ${isMobile ? 'text-lg' : 'text-2xl'}`}>
              {value}
            </p>
            {subtitle && (
              <p className={`text-gray-500 ${isMobile ? 'text-xs' : 'text-xs'}`}>
                {subtitle}
              </p>
            )}
            {trend && (
              <div className={`flex items-center mt-1 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                <span className={trend.isPositive ? 'text-green-600' : 'text-red-600'}>
                  {trend.isPositive ? '↗' : '↘'} {Math.abs(trend.value)}%
                </span>
              </div>
            )}
          </div>
          {Icon && (
            <div className={`${colorClasses[color]} rounded-lg flex items-center justify-center ${isMobile ? 'w-10 h-10' : 'w-12 h-12'}`}>
              <Icon className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'}`} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface ResponsiveChartCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
}

export function ResponsiveChartCard({
  title,
  children,
  className = "",
  actions
}: ResponsiveChartCardProps) {
  const { isMobile } = useResponsive();

  return (
    <Card className={className}>
      <CardHeader className={`${isMobile ? 'p-4 pb-2' : 'p-6 pb-4'}`}>
        <div className="flex items-center justify-between">
          <CardTitle className={`${isMobile ? 'text-base' : 'text-lg'}`}>
            {title}
          </CardTitle>
          {actions && (
            <div className="flex items-center space-x-2">
              {actions}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className={`${isMobile ? 'p-4 pt-0' : 'p-6 pt-0'}`}>
        <div className={`${isMobile ? 'h-48' : 'h-64'}`}>
          {children}
        </div>
      </CardContent>
    </Card>
  );
}

// Hook para detectar orientação do dispositivo
export function useDeviceOrientation() {
  const [orientation, setOrientation] = React.useState<'portrait' | 'landscape'>('portrait');

  React.useEffect(() => {
    const updateOrientation = () => {
      setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape');
    };

    updateOrientation();
    window.addEventListener('resize', updateOrientation);
    window.addEventListener('orientationchange', updateOrientation);

    return () => {
      window.removeEventListener('resize', updateOrientation);
      window.removeEventListener('orientationchange', updateOrientation);
    };
  }, []);

  return orientation;
}

// Componente para container responsivo
export function ResponsiveContainer({
  children,
  className = "",
  maxWidth = "7xl"
}: {
  children: React.ReactNode;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "6xl" | "7xl";
}) {
  const { isMobile } = useResponsive();

  return (
    <div className={`w-full mx-auto ${isMobile ? 'px-4' : 'px-6'} max-w-${maxWidth} ${className}`}>
      {children}
    </div>
  );
}
