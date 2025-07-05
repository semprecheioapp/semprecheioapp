import React from "react";
import { useResponsive } from "@/hooks/use-responsive";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Column {
  key: string;
  label: string;
  render?: (value: any, row: any) => React.ReactNode;
  className?: string;
  mobileHidden?: boolean;
}

interface ResponsiveTableProps {
  columns: Column[];
  data: any[];
  keyField?: string;
  emptyMessage?: string;
  className?: string;
  onRowClick?: (row: any) => void;
}

export function ResponsiveTable({
  columns,
  data,
  keyField = "id",
  emptyMessage = "Nenhum item encontrado",
  className = "",
  onRowClick
}: ResponsiveTableProps) {
  const { isMobile } = useResponsive();

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  if (isMobile) {
    // Mobile: Render as cards
    return (
      <div className={`space-y-3 ${className}`}>
        {data.map((row, index) => (
          <Card 
            key={row[keyField] || index}
            className={`${onRowClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
            onClick={() => onRowClick?.(row)}
          >
            <CardContent className="p-4">
              <div className="space-y-2">
                {columns
                  .filter(col => !col.mobileHidden)
                  .map((column) => {
                    const value = row[column.key];
                    const displayValue = column.render ? column.render(value, row) : value;
                    
                    return (
                      <div key={column.key} className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-600">
                          {column.label}:
                        </span>
                        <span className={`text-sm ${column.className || ''}`}>
                          {displayValue}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Desktop: Render as table
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="min-w-full bg-white border border-gray-200 rounded-lg">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${column.className || ''}`}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((row, index) => (
            <tr
              key={row[keyField] || index}
              className={`${onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}`}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((column) => {
                const value = row[column.key];
                const displayValue = column.render ? column.render(value, row) : value;
                
                return (
                  <td
                    key={column.key}
                    className={`px-6 py-4 whitespace-nowrap text-sm ${column.className || ''}`}
                  >
                    {displayValue}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Componente para status badges responsivos
export function ResponsiveStatusBadge({ 
  status, 
  variant = "default" 
}: { 
  status: string; 
  variant?: "default" | "secondary" | "destructive" | "outline" 
}) {
  const { isMobile } = useResponsive();
  
  return (
    <Badge 
      variant={variant}
      className={`${isMobile ? 'text-xs px-2 py-1' : 'text-sm px-3 py-1'}`}
    >
      {status}
    </Badge>
  );
}

// Componente para botões de ação responsivos
export function ResponsiveActionButton({
  onClick,
  icon: Icon,
  label,
  variant = "outline",
  size = "sm"
}: {
  onClick: () => void;
  icon: React.ComponentType<any>;
  label: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}) {
  const { isMobile } = useResponsive();
  
  return (
    <Button
      variant={variant}
      size={isMobile ? "sm" : size}
      onClick={onClick}
      className={`${isMobile ? 'px-2 py-1' : ''}`}
    >
      <Icon className={`${isMobile ? 'w-4 h-4' : 'w-4 h-4 mr-2'}`} />
      {!isMobile && label}
    </Button>
  );
}
