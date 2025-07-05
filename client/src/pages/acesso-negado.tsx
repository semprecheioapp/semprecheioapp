import React from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';

const AcessoNegado: React.FC = () => {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
        <h1 className="text-3xl font-bold text-red-600 mb-4">Acesso Negado</h1>
        <p className="text-gray-600 mb-6">
          Desculpe, você não tem permissão para acessar esta página.
        </p>
        <Button onClick={() => setLocation('/')} className="w-full">
          Voltar para a página inicial
        </Button>
      </div>
    </div>
  );
};

export default AcessoNegado;
