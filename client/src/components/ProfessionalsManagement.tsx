import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Users, Search, Mail, Phone, User, Building2 } from "lucide-react";

interface Professional {
  id: string;
  name: string;
  email: string;
  phone?: string;
  specialtyId?: string;
  specialtyName?: string;
  clientId: string;
  isActive: boolean;
  createdAt: string;
}

interface ProfessionalsManagementProps {
  clientId: string;
  clientName: string;
}

export default function ProfessionalsManagement({ clientId, clientName }: ProfessionalsManagementProps) {
  const [searchTerm, setSearchTerm] = useState("");

  // Buscar profissionais da empresa
  const { data: professionals = [], isLoading: professionalsLoading } = useQuery({
    queryKey: ["/api/professionals", clientId],
    queryFn: async () => {
      const response = await fetch(`/api/professionals?client_id=${clientId}`, { credentials: 'include' });
      if (!response.ok) throw new Error("Erro ao carregar profissionais");
      return response.json();
    },
  });





  // Filtrar profissionais por termo de busca
  const filteredProfessionals = professionals.filter((prof: Professional) =>
    prof.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prof.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (prof.specialtyName && prof.specialtyName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header com busca */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar profissionais..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Título da seção */}
      <div className="space-y-2">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Users className="h-5 w-5" />
          Profissionais de {clientName}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Visualize os profissionais da sua empresa
        </p>
      </div>

      {/* Grid de profissionais */}
      {professionalsLoading ? (
        <div className="text-center py-8">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando profissionais...</p>
        </div>
      ) : filteredProfessionals.length === 0 ? (
        <div className="text-center py-8">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? "Nenhum profissional encontrado" : "Nenhum profissional cadastrado"}
          </h3>
          <p className="text-gray-600 mb-4">
            {searchTerm
              ? "Tente ajustar os termos de busca."
              : "Nenhum profissional foi cadastrado ainda. Entre em contato com o suporte para adicionar profissionais."
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProfessionals.map((professional: Professional) => (
            <Card key={professional.id} className="relative border border-gray-200 hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                {/* Status Badge no canto superior direito */}
                <div className="absolute top-4 right-4">
                  <Badge
                    variant="outline"
                    className={professional.isActive
                      ? "bg-green-50 text-green-700 border-green-200"
                      : "bg-gray-50 text-gray-600 border-gray-200"
                    }
                  >
                    {professional.isActive ? "Ativo" : "Inativo"}
                  </Badge>
                </div>

                {/* Nome do profissional */}
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 pr-20 text-base">
                  {professional.name}
                </h4>

                {/* Informações do profissional */}
                <div className="space-y-3">
                  {/* Email */}
                  <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span>{professional.email}</span>
                  </div>

                  {/* Telefone */}
                  {professional.phone && (
                    <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span>{professional.phone}</span>
                    </div>
                  )}

                  {/* Especialidade */}
                  <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                    <User className="w-4 h-4 text-gray-400" />
                    <span>{professional.specialtyName || "Sem especialidade"}</span>
                  </div>

                  {/* Empresa */}
                  <div className="flex items-center gap-3 text-sm text-blue-600 dark:text-blue-400">
                    <Building2 className="w-4 h-4 text-blue-500" />
                    <span>Admin/Empresa</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
