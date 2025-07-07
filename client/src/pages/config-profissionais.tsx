
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Clock, Plus, Edit, Trash2, Calendar, User, Save, X, Power, PowerOff, RefreshCw, CalendarDays, Building2, Search } from "lucide-react";

interface Professional {
  id: string;
  name: string;
  email: string;
  phone?: string;
  specialtyId?: string;
  isActive: boolean;
  clientId?: string;
}

interface ProfessionalAvailability {
  id: string;
  professionalId: string;
  date?: string;
  dayOfWeek?: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
  serviceId?: string;
  customPrice?: number;
  customDuration?: number;
}

interface AvailabilityForm {
  professionalId: string;
  date?: string;
  dayOfWeek?: number;
  daysOfWeek?: number[]; // Para seleção múltipla de dias
  startTime: string;
  endTime: string;
  isActive: boolean;
  serviceId?: string;
  customPrice?: number;
  customDuration?: number;
  slotDuration: number; // Duração do slot em minutos (30 ou 60)
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Segunda-feira" },
  { value: 2, label: "Terça-feira" },
  { value: 3, label: "Quarta-feira" },
  { value: 4, label: "Quinta-feira" },
  { value: 5, label: "Sexta-feira" },
  { value: 6, label: "Sábado" },
];

interface ConfigProfissionaisProps {
  isCompanyAdmin?: boolean;
  companyId?: string;
}

export default function ConfigProfissionais({ isCompanyAdmin = false, companyId }: ConfigProfissionaisProps = {}) {
  const [selectedProfessional, setSelectedProfessional] = useState<string>("");
  const [selectedClientId, setSelectedClientId] = useState<string>("all");
  const [showModal, setShowModal] = useState(false);
  const [editingAvailability, setEditingAvailability] = useState<ProfessionalAvailability | null>(null);
  const [formData, setFormData] = useState<AvailabilityForm>({
    professionalId: "",
    startTime: "09:00",
    endTime: "18:00",
    isActive: true,
    slotDuration: 60, // Padrão: 1 hora
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar clientes
  const { data: clientsData = [] } = useQuery({
    queryKey: ["/api/clients"],
    queryFn: async () => {
      const response = await fetch("/api/clients");
      if (!response.ok) throw new Error("Erro ao carregar clientes");
      return response.json();
    },
  });

  // Buscar profissionais
  const { data: professionals = [], isLoading: professionalsLoading, error: professionalsError } = useQuery({
    queryKey: ["/api/professionals", isCompanyAdmin ? companyId : "all"],
    queryFn: async () => {
      const url = isCompanyAdmin && companyId
        ? `/api/professionals?client_id=${companyId}`
        : "/api/professionals";
      console.log("🔍 Buscando profissionais:", url);
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) {
        console.error("❌ Erro ao buscar profissionais:", response.status, response.statusText);
        throw new Error("Erro ao carregar profissionais");
      }
      const data = await response.json();
      console.log("✅ Profissionais carregados:", data.length, data);
      return data;
    },
  });

  // Buscar serviços filtrados por empresa (incremental - só query)
  const { data: servicesData = [], isError: servicesError } = useQuery({
    queryKey: ["/api/services", selectedClientId],
    queryFn: async () => {
      try {
        let url = "/api/services";
        if (selectedClientId && selectedClientId !== "all") {
          url += `?client_id=${selectedClientId}`;
        }

        const response = await fetch(url);
        if (!response.ok) {
          console.warn("Serviços não disponíveis");
          return [];
        }

        const data = await response.json();
        console.log("✅ Serviços carregados:", data?.length || 0);
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.warn("Erro ao carregar serviços:", error);
        return [];
      }
    },
    enabled: !!selectedClientId && selectedClientId !== "all", // Só busca se tem empresa selecionada
    retry: false,
    refetchOnWindowFocus: false,
  });





  // Filtrar profissionais por empresa
  const filteredProfessionals = professionals.filter((prof: Professional) => {
    return !selectedClientId || selectedClientId === "all" || prof.clientId === selectedClientId;
  });

  // Buscar disponibilidades do profissional selecionado
  const { data: availabilities = [], isLoading: availabilitiesLoading } = useQuery({
    queryKey: ["/api/professional-availability", selectedProfessional],
    queryFn: async () => {
      if (!selectedProfessional) return [];
      const response = await fetch(`/api/professional-availability?professionalId=${selectedProfessional}`);
      if (!response.ok) throw new Error("Erro ao carregar horários");
      return response.json();
    },
    enabled: !!selectedProfessional,
  });

  // Mutation para criar horário
  const createAvailabilityMutation = useMutation({
    mutationFn: async (data: AvailabilityForm) => {
      const response = await fetch("/api/professional-availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Erro ao criar horário");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/professional-availability"] });
      setShowModal(false);
      resetForm();
      toast({
        title: "Sucesso!",
        description: "Horário criado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar horário.",
        variant: "destructive",
      });
    },
  });

  // Mutation para atualizar horário
  const updateAvailabilityMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AvailabilityForm> }) => {
      const response = await fetch(`/api/professional-availability/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Erro ao atualizar horário");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/professional-availability"] });
      setShowModal(false);
      setEditingAvailability(null);
      resetForm();
      toast({
        title: "Sucesso!",
        description: "Horário atualizado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar horário.",
        variant: "destructive",
      });
    },
  });

  // Mutation para deletar horário
  const deleteAvailabilityMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/professional-availability/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Erro ao deletar horário");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/professional-availability"] });
      toast({
        title: "Sucesso!",
        description: "Horário removido com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao remover horário.",
        variant: "destructive",
      });
    },
  });

  // Mutation para toggle de status (ativar/desativar)
  const toggleAvailabilityMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await fetch(`/api/professional-availability/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      if (!response.ok) throw new Error("Erro ao alterar status do horário");
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/professional-availability"] });
      toast({
        title: "Sucesso!",
        description: `Horário ${variables.isActive ? 'ativado' : 'desativado'} com sucesso.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao alterar status do horário.",
        variant: "destructive",
      });
    },
  });

  // Mutation para gerar horários do próximo mês
  const generateNextMonthMutation = useMutation({
    mutationFn: async (professionalId: string) => {
      const response = await fetch("/api/professional-availability/generate-next-month", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ professionalId }),
      });
      if (!response.ok) throw new Error("Erro ao gerar horários do próximo mês");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/professional-availability"] });
      toast({
        title: "Sucesso!",
        description: `${data.created} horários criados para ${data.month}/${data.year}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao gerar horários do próximo mês.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      professionalId: selectedProfessional,
      startTime: "09:00",
      endTime: "18:00",
      isActive: true,
      date: undefined,
      dayOfWeek: undefined,
      daysOfWeek: undefined,
      slotDuration: 60,
    });
  };

  // Função para gerar slots de tempo
  const generateTimeSlots = (startTime: string, endTime: string, slotDuration: number) => {
    const slots = [];
    const start = new Date(`2000-01-01T${startTime}:00`);
    const end = new Date(`2000-01-01T${endTime}:00`);

    let current = new Date(start);

    while (current < end) {
      const slotStart = current.toTimeString().slice(0, 5);
      current.setMinutes(current.getMinutes() + slotDuration);
      const slotEnd = current.toTimeString().slice(0, 5);

      if (current <= end) {
        slots.push({
          startTime: slotStart,
          endTime: slotEnd
        });
      }
    }

    return slots;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.professionalId) {
      toast({
        title: "Erro",
        description: "Selecione um profissional.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.serviceId) {
      toast({
        title: "Erro",
        description: "Selecione um serviço.",
        variant: "destructive",
      });
      return;
    }

    // Gerar slots de tempo
    const timeSlots = generateTimeSlots(formData.startTime, formData.endTime, formData.slotDuration);

    if (timeSlots.length === 0) {
      toast({
        title: "Erro",
        description: "Horário inválido. Verifique se o horário de fim é posterior ao de início.",
        variant: "destructive",
      });
      return;
    }

    // Preparar dados baseado no tipo de horário
    const baseData = {
      professionalId: formData.professionalId,
      date: formData.date || undefined,
      dayOfWeek: formData.dayOfWeek !== undefined ? formData.dayOfWeek : undefined,
      isActive: formData.isActive,
      serviceId: formData.serviceId,
      customPrice: formData.customPrice,
      customDuration: formData.slotDuration,
    };

    if (editingAvailability) {
      // Para edição, manter comportamento atual (um registro só)
      const submitData = {
        ...baseData,
        startTime: formData.startTime,
        endTime: formData.endTime,
      };

      updateAvailabilityMutation.mutate({
        id: editingAvailability.id,
        data: submitData,
      });
    } else {
      // Para criação, criar múltiplos slots considerando múltiplos dias
      const daysToCreate = formData.daysOfWeek && formData.daysOfWeek.length > 0
        ? formData.daysOfWeek
        : (formData.dayOfWeek !== undefined ? [formData.dayOfWeek] : []);

      const slotsToCreate = [];

      // Para cada dia selecionado, criar todos os slots de tempo
      daysToCreate.forEach(dayOfWeek => {
        timeSlots.forEach(slot => {
          slotsToCreate.push({
            ...baseData,
            dayOfWeek: dayOfWeek,
            startTime: slot.startTime,
            endTime: slot.endTime,
          });
        });
      });

      // Criar todos os slots
      Promise.all(
        slotsToCreate.map(slotData =>
          fetch("/api/professional-availability", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(slotData),
          })
        )
      ).then(responses => {
        const failedRequests = responses.filter(r => !r.ok);
        if (failedRequests.length > 0) {
          throw new Error(`${failedRequests.length} slots falharam ao ser criados`);
        }

        queryClient.invalidateQueries({ queryKey: ["/api/professional-availability"] });
        setShowModal(false);
        resetForm();

        const totalSlots = slotsToCreate.length;
        const daysCount = daysToCreate.length;
        const slotsPerDay = timeSlots.length;

        toast({
          title: "Sucesso!",
          description: `${totalSlots} slots criados para ${daysCount} dia(s) da semana (${slotsPerDay} slots por dia).`,
        });
      }).catch(error => {
        toast({
          title: "Erro",
          description: error.message || "Erro ao criar slots de horário.",
          variant: "destructive",
        });
      });
    }
  };

  const handleEdit = (availability: ProfessionalAvailability) => {
    setEditingAvailability(availability);
    setFormData({
      professionalId: availability.professionalId,
      date: availability.date,
      dayOfWeek: availability.dayOfWeek,
      startTime: availability.startTime,
      endTime: availability.endTime,
      isActive: availability.isActive,
      serviceId: availability.serviceId,
      customPrice: availability.customPrice,
      customDuration: availability.customDuration || 60,
      slotDuration: availability.customDuration || 60,
    });
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja remover este horário?")) {
      deleteAvailabilityMutation.mutate(id);
    }
  };

  const handleToggleStatus = (availability: ProfessionalAvailability) => {
    const newStatus = !availability.isActive;
    const action = newStatus ? "ativar" : "desativar";

    if (confirm(`Tem certeza que deseja ${action} este horário?`)) {
      toggleAvailabilityMutation.mutate({
        id: availability.id,
        isActive: newStatus,
      });
    }
  };

  const openNewModal = () => {
    setEditingAvailability(null);
    resetForm();
    setShowModal(true);
  };

  const handleGenerateNextMonth = () => {
    if (!selectedProfessional) {
      toast({
        title: "Erro",
        description: "Selecione um profissional primeiro.",
        variant: "destructive",
      });
      return;
    }

    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const monthName = nextMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

    if (confirm(`Deseja gerar os horários recorrentes para ${monthName}?\n\nIsso criará horários específicos baseados nos horários semanais configurados.`)) {
      generateNextMonthMutation.mutate(selectedProfessional);
    }
  };

  const getDayName = (dayOfWeek?: number) => {
    if (dayOfWeek === undefined || dayOfWeek === null) return null;
    return DAYS_OF_WEEK.find(day => day.value === dayOfWeek)?.label || "Desconhecido";
  };

  const formatAvailabilityType = (availability: ProfessionalAvailability) => {
    if (availability.dayOfWeek !== undefined && availability.dayOfWeek !== null) {
      return {
        type: "Recorrente",
        label: getDayName(availability.dayOfWeek),
        variant: "default" as const
      };
    } else if (availability.date) {
      return {
        type: "Data Específica",
        label: new Date(availability.date).toLocaleDateString('pt-BR'),
        variant: "secondary" as const
      };
    }
    return {
      type: "Indefinido",
      label: "Tipo não definido",
      variant: "destructive" as const
    };
  };

  const selectedProfessionalData = filteredProfessionals.find((p: Professional) => p.id === selectedProfessional);

  return (
    <div className="container-responsive py-6">
      <div className="mb-8">
        <h1 className="text-2xl xs:text-3xl font-bold text-gray-900 mb-2">Config. Profissionais</h1>
        <p className="text-gray-600 text-sm xs:text-base">
          Configure os horários de disponibilidade de cada profissional
        </p>
      </div>

      {/* Filtro por Empresa */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Building2 className="w-5 h-5" />
            <span>Filtrar por Empresa</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="client-select">Selecionar Empresa</Label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as empresas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as empresas</SelectItem>
                  {clientsData?.map((client: any) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name} ({client.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label htmlFor="email-search">Buscar por Email da Empresa</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="email-search"
                  placeholder="Digite o email da empresa..."
                  onChange={(e) => {
                    const email = e.target.value.toLowerCase();
                    const client = clientsData?.find((c: any) =>
                      c.email.toLowerCase().includes(email)
                    );
                    if (client && email.length > 2) {
                      setSelectedClientId(client.id);
                    } else if (email.length === 0) {
                      setSelectedClientId("all");
                    }
                  }}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seleção de Profissional */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="w-5 h-5" />
            <span>Selecionar Profissional</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {professionalsLoading ? (
            <div className="text-center py-4">
              <p className="text-gray-600">Carregando profissionais...</p>
            </div>
          ) : professionalsError ? (
            <div className="text-center py-4">
              <p className="text-red-600">❌ Erro ao carregar profissionais: {professionalsError.message}</p>
            </div>
          ) : filteredProfessionals.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-gray-600">⚠️ Nenhum profissional encontrado para a empresa selecionada.</p>
            </div>
          ) : (
            <Select value={selectedProfessional} onValueChange={setSelectedProfessional}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Escolha um profissional..." />
              </SelectTrigger>
              <SelectContent>
                {filteredProfessionals.map((professional: Professional) => {
                  const client = clientsData?.find((c: any) => c.id === professional.clientId);
                  return (
                    <SelectItem key={professional.id} value={professional.id}>
                      {professional.name} - {professional.email} ({client?.name || "Empresa não definida"})
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {/* Horários do Profissional */}
      {selectedProfessional && (
        <Card>
          <CardHeader>
            <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between space-y-2 xs:space-y-0">
              <CardTitle className="flex items-center space-x-2">
                <Clock className="w-5 h-5" />
                <span>Horários - {selectedProfessionalData?.name}</span>
              </CardTitle>
              <div className="flex flex-col xs:flex-row space-y-2 xs:space-y-0 xs:space-x-2">
                <Button
                  onClick={handleGenerateNextMonth}
                  variant="outline"
                  className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                  disabled={generateNextMonthMutation.isPending}
                >
                  {generateNextMonthMutation.isPending ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CalendarDays className="w-4 h-4 mr-2" />
                  )}
                  Gerar Próximo Mês
                </Button>
                <Button onClick={openNewModal} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Horário
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {availabilitiesLoading ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Carregando horários...</p>
              </div>
            ) : availabilities.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum horário configurado</h3>
                <p className="text-gray-600 mb-4">Configure os horários de disponibilidade deste profissional.</p>
                <Button onClick={openNewModal} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Primeiro Horário
                </Button>
              </div>
            ) : (
              <div className="grid gap-4">
                {availabilities.map((availability: ProfessionalAvailability) => (
                  <div
                    key={availability.id}
                    className="flex flex-col xs:flex-row xs:items-center xs:justify-between p-4 border border-gray-200 rounded-lg space-y-3 xs:space-y-0"
                  >
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        {(() => {
                          const typeInfo = formatAvailabilityType(availability);
                          return (
                            <>
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                {typeInfo.type}
                              </Badge>
                              <Badge variant={typeInfo.variant}>
                                {typeInfo.label}
                              </Badge>
                            </>
                          );
                        })()}
                        <Badge variant={availability.isActive ? "default" : "destructive"}>
                          {availability.isActive ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600">
                        <div className="flex items-center space-x-4">
                          <span>
                            <span className="font-medium">Slot:</span> {availability.startTime} às {availability.endTime}
                          </span>
                          {availability.customDuration && (
                            <span>
                              <span className="font-medium">Duração:</span> {availability.customDuration}min
                            </span>
                          )}
                          {availability.customPrice && (
                            <span>
                              <span className="font-medium">Preço:</span> R$ {(availability.customPrice / 100).toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleStatus(availability)}
                        className={availability.isActive
                          ? "text-orange-600 hover:text-orange-700"
                          : "text-green-600 hover:text-green-700"
                        }
                        title={availability.isActive ? "Desativar horário" : "Ativar horário"}
                      >
                        {availability.isActive ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(availability)}
                        title="Editar horário"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(availability.id)}
                        className="text-red-600 hover:text-red-700"
                        title="Remover horário"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modal de Criação/Edição */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingAvailability ? "Editar Horário" : "Novo Horário"}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Tipo de Horário */}
            <div className="space-y-2">
              <Label>Tipo de Horário</Label>
              <Select
                value={formData.dayOfWeek !== undefined ? "recurring" : "specific"}
                onValueChange={(value) => {
                  if (value === "recurring") {
                    setFormData(prev => ({
                      ...prev,
                      date: undefined,
                      dayOfWeek: 1,
                      daysOfWeek: [1] // Iniciar com segunda-feira selecionada
                    }));
                  } else {
                    // Para data específica, remover dayOfWeek e definir data
                    const today = new Date().toISOString().split('T')[0];
                    setFormData(prev => ({
                      ...prev,
                      dayOfWeek: undefined,
                      daysOfWeek: undefined,
                      date: today
                    }));
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recurring">Horário Semanal (Recorrente)</SelectItem>
                  <SelectItem value="specific">Data Específica</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Dia da Semana ou Data */}
            {formData.dayOfWeek !== undefined ? (
              <div className="space-y-2">
                <Label>Dias da Semana</Label>
                <div className="grid grid-cols-2 gap-3">
                  {DAYS_OF_WEEK.map(day => {
                    const isChecked = formData.daysOfWeek?.includes(day.value) || (formData.dayOfWeek === day.value);
                    return (
                      <div
                        key={day.value}
                        className={`flex items-center space-x-2 p-2 rounded border cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-blue-50 border-blue-300'
                            : 'bg-white border-gray-200 hover:bg-gray-50'
                        }`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();

                          if (isChecked) {
                            // Remover dia da seleção
                            const currentDays = formData.daysOfWeek || (formData.dayOfWeek !== undefined ? [formData.dayOfWeek] : []);
                            const newDays = currentDays.filter(d => d !== day.value);
                            setFormData(prev => ({
                              ...prev,
                              daysOfWeek: newDays.length > 0 ? newDays : undefined,
                              dayOfWeek: newDays.length === 1 ? newDays[0] : undefined
                            }));
                          } else {
                            // Adicionar dia à seleção
                            const currentDays = formData.daysOfWeek || (formData.dayOfWeek !== undefined ? [formData.dayOfWeek] : []);
                            const newDays = [...currentDays, day.value].filter((v, i, a) => a.indexOf(v) === i).sort();
                            setFormData(prev => ({
                              ...prev,
                              daysOfWeek: newDays,
                              dayOfWeek: newDays.length === 1 ? newDays[0] : undefined
                            }));
                          }
                        }}
                      >
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                          isChecked
                            ? 'bg-blue-600 border-blue-600'
                            : 'border-gray-300'
                        }`}>
                          {isChecked && (
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <span className="text-sm font-medium">{day.label}</span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-500">
                  Selecione um ou múltiplos dias para criar horários recorrentes. Evita cadastros repetitivos.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Data</Label>
                <Input
                  type="date"
                  value={formData.date || ""}
                  onChange={(e) => {
                    const selectedDate = e.target.value;
                    setFormData(prev => ({
                      ...prev,
                      date: selectedDate
                    }));
                  }}
                  required
                />
              </div>
            )}

            {/* Duração do Slot */}
            <div className="space-y-2">
              <Label>Duração dos Slots</Label>
              <Select
                value={formData.slotDuration.toString()}
                onValueChange={(value) => {
                  const duration = parseInt(value);
                  // Validação: deve ser múltiplo de 5 minutos
                  if (duration % 5 === 0) {
                    setFormData(prev => ({ ...prev, slotDuration: duration }));
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 minutos</SelectItem>
                  <SelectItem value="10">10 minutos</SelectItem>
                  <SelectItem value="15">15 minutos</SelectItem>
                  <SelectItem value="20">20 minutos</SelectItem>
                  <SelectItem value="30">30 minutos</SelectItem>
                  <SelectItem value="45">45 minutos</SelectItem>
                  <SelectItem value="60">1 hora</SelectItem>
                  <SelectItem value="90">1 hora e 30 minutos</SelectItem>
                  <SelectItem value="120">2 horas</SelectItem>
                  <SelectItem value="180">3 horas</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Define a duração de cada slot de atendimento. Slots menores permitem maior flexibilidade de agendamento.
              </p>
            </div>

            {/* Serviço Associado - Campo obrigatório */}
            <div className="space-y-2">
              <Label>Serviço Associado *</Label>
              <Select
                value={formData.serviceId || ""}
                onValueChange={(value) => setFormData(prev => ({ ...prev, serviceId: value }))}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um serviço" />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(servicesData) && servicesData.length > 0 ? (
                    servicesData.map((service: any) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="" disabled>
                      {servicesError ? "Erro ao carregar serviços" : "Nenhum serviço disponível"}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Selecione o serviço que será oferecido neste horário.
              </p>
            </div>



            {/* Horários */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Hora Início</Label>
                <Input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Hora Fim</Label>
                <Input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                  required
                />
              </div>
            </div>

            {/* Preview dos Slots */}
            {formData.startTime && formData.endTime && (
              <div className="space-y-2">
                <Label>Preview dos Slots que serão criados:</Label>
                <div className="p-3 bg-gray-50 rounded-lg max-h-32 overflow-y-auto">
                  <div className="flex flex-wrap gap-1">
                    {(() => {
                      const slots = generateTimeSlots(formData.startTime, formData.endTime, formData.slotDuration);
                      return slots.map((slot, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {slot.startTime}-{slot.endTime}
                        </Badge>
                      ));
                    })()}
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    {(() => {
                      const slotsPerDay = generateTimeSlots(formData.startTime, formData.endTime, formData.slotDuration).length;
                      const selectedDays = formData.daysOfWeek && formData.daysOfWeek.length > 0
                        ? formData.daysOfWeek.length
                        : (formData.dayOfWeek !== undefined ? 1 : 0);
                      const totalSlots = slotsPerDay * selectedDays;

                      if (selectedDays > 1) {
                        return `${slotsPerDay} slots por dia × ${selectedDays} dias = ${totalSlots} slots totais`;
                      } else {
                        return `Total: ${slotsPerDay} slots`;
                      }
                    })()}
                  </p>
                </div>
              </div>
            )}

            {/* Botões */}
            <div className="flex space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowModal(false)}
                className="flex-1"
              >
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createAvailabilityMutation.isPending || updateAvailabilityMutation.isPending}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                <Save className="w-4 h-4 mr-2" />
                {editingAvailability ? "Atualizar" : "Salvar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
