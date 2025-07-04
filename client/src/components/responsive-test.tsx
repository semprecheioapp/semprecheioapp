import React from 'react';
import { useResponsive, useTouch, useOrientation } from '@/hooks/use-responsive';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Monitor, Smartphone, Tablet, Rotate3D, Hand } from 'lucide-react';

export function ResponsiveTest() {
  const responsive = useResponsive();
  const isTouch = useTouch();
  const orientation = useOrientation();

  const getDeviceIcon = () => {
    switch (responsive.deviceType) {
      case 'mobile':
        return <Smartphone className="w-5 h-5" />;
      case 'tablet':
        return <Tablet className="w-5 h-5" />;
      case 'desktop':
        return <Monitor className="w-5 h-5" />;
      default:
        return <Monitor className="w-5 h-5" />;
    }
  };

  const getBreakpointColor = (isActive: boolean) => {
    return isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <Card className="bg-white/95 backdrop-blur-sm shadow-lg border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center space-x-2">
            {getDeviceIcon()}
            <span>Teste Responsivo</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          {/* Dimensões */}
          <div>
            <p className="font-medium mb-1">Dimensões:</p>
            <p className="text-gray-600">
              {responsive.width} × {responsive.height}px
            </p>
          </div>

          {/* Tipo de Dispositivo */}
          <div>
            <p className="font-medium mb-1">Dispositivo:</p>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className={getBreakpointColor(true)}>
                {responsive.deviceType}
              </Badge>
              {isTouch && (
                <Badge variant="outline" className="bg-blue-100 text-blue-800">
                  <Hand className="w-3 h-3 mr-1" />
                  Touch
                </Badge>
              )}
            </div>
          </div>

          {/* Orientação */}
          <div>
            <p className="font-medium mb-1">Orientação:</p>
            <Badge variant="outline" className="bg-purple-100 text-purple-800">
              <Rotate3D className="w-3 h-3 mr-1" />
              {orientation}
            </Badge>
          </div>

          {/* Breakpoints */}
          <div>
            <p className="font-medium mb-2">Breakpoints:</p>
            <div className="grid grid-cols-2 gap-1">
              <Badge variant="outline" className={getBreakpointColor(responsive.isXs)}>
                XS (475px+)
              </Badge>
              <Badge variant="outline" className={getBreakpointColor(responsive.isSm)}>
                SM (640px+)
              </Badge>
              <Badge variant="outline" className={getBreakpointColor(responsive.isMd)}>
                MD (768px+)
              </Badge>
              <Badge variant="outline" className={getBreakpointColor(responsive.isLg)}>
                LG (1024px+)
              </Badge>
              <Badge variant="outline" className={getBreakpointColor(responsive.isXl)}>
                XL (1280px+)
              </Badge>
              <Badge variant="outline" className={getBreakpointColor(responsive.is2xl)}>
                2XL (1536px+)
              </Badge>
            </div>
          </div>

          {/* Estados */}
          <div>
            <p className="font-medium mb-2">Estados:</p>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Mobile:</span>
                <Badge variant="outline" className={getBreakpointColor(responsive.isMobile)}>
                  {responsive.isMobile ? 'Sim' : 'Não'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Tablet:</span>
                <Badge variant="outline" className={getBreakpointColor(responsive.isTablet)}>
                  {responsive.isTablet ? 'Sim' : 'Não'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Desktop:</span>
                <Badge variant="outline" className={getBreakpointColor(responsive.isDesktop)}>
                  {responsive.isDesktop ? 'Sim' : 'Não'}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Componente para testar grid responsivo
export function ResponsiveGridTest() {
  return (
    <div className="container-responsive py-8">
      <h2 className="text-2xl font-bold mb-6 text-center">Teste de Grid Responsivo</h2>
      
      <div className="grid-responsive mb-8">
        {Array.from({ length: 8 }, (_, i) => (
          <Card key={i} className="h-32">
            <CardContent className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-8 h-8 bg-blue-500 rounded-full mx-auto mb-2"></div>
                <p className="text-sm font-medium">Card {i + 1}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Teste de Texto Responsivo</h3>
        <p className="text-responsive">
          Este texto se adapta automaticamente ao tamanho da tela. 
          Em dispositivos móveis fica menor, em tablets médio, e em desktops maior.
        </p>
        
        <div className="bg-gray-100 p-4 rounded-lg">
          <p className="text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl">
            Texto com breakpoints específicos: XS → SM → MD → LG → XL
          </p>
        </div>
      </div>
    </div>
  );
}
