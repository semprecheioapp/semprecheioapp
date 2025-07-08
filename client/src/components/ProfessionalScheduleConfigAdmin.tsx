import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Clock, Plus, Edit, Trash2, Calendar, User, Save, X, Building2, RefreshCw, CalendarDays } from 'lucide-react';

interface Professional {
  id: string;
  name: string;
  email: string;
  specialtyName?: string;
  clientId: string;
}

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  clientId: string;
}

interface ProfessionalAvailability {
  id: string;
  professionalId: string;
  professionalName?: string;
  serviceId?: string;
  serviceName?: string;
  date?: string;
  dayOfWeek?: number;
  startTime: string;
  endTime: string;
  slotDuration: number;
  isActive: boolean;
  breakStartTime?: string; // Início do intervalo (almoço/pausa)
  breakEndTime?: string; // Fim do intervalo (almoço/pausa)
}

interface ProfessionalScheduleConfigAdminProps {
  clientId: string;
  clientName: string;
}

interface AvailabilityForm {
  professionalId: string;
  serviceId?: string;
  date?: string;
  dayOfWeek?: number;
  daysOfWeek?: number[];
  startTime: string;
  endTime: string;
  slotDuration: number;
  isActive: boolean;
  breakStartTime?: string; // Início do intervalo (almoço/pausa)
  breakEndTime?: string; // Fim do intervalo (almoço/pausa)
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Segunda' },
  { value: 2, label: 'Terça' },
  { value: 3, label: 'Quarta' },
  { value: 4, label: 'Quinta' },
  { value: 5, label: 'Sexta' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
];

const SLOT_DURATIONS = [
  { value: 5, label: '5 minutos' },
  { value: 10, label: '10 minutos' },
  { value: 15, label: '15 minutos' },
  { value: 20, label: '20 minutos' },
  { value: 30, label: '30 minutos' },
  { value: 45, label: '45 minutos' },
  { value: 60, label: '1 hora' },
  { value: 90, label: '1h 30min' },
  { value: 120, label: '2 horas' },
  { value: 180, label: '3 horas' },
];

const ProfessionalScheduleConfigAdmin: React.FC<ProfessionalScheduleConfigAdminProps> = ({ 
  clientId, 
  clientName 
}) => {
  const [selectedProfessional, setSelectedProfessional] = useState<string>("");
  const [showModal, setShowModal] = useState(false);
  const [editingAvailability, setEditingAvailability] = useState<ProfessionalAvailability | null>(null);
  const [scheduleType, setScheduleType] = useState<"recurring" | "specific">("recurring");
  const [formData, setFormData] = useState<AvailabilityForm>({
    professionalId: "",
    startTime: "09:00",
    endTime: "18:00",
    slotDuration: 60,
    isActive: true,
    dayOfWeek: 1,
    daysOfWeek: [1],
  });

  // Estados para geração de horários futuros
  const [showFutureScheduleModal, setShowFutureScheduleModal] = useState(false);
  const [futureSchedulePeriod, setFutureSchedulePeriod] = useState<"1" | "3" | "6" | "12">("1");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Função para limpar campos que não devem ir para o backend
  const cleanDataForBackend = (data: any) => {
    const { breakStartTime, breakEndTime, daysOfWeek, slotDuration, customDuration, ...cleanData } = data;

    // Converter slotDuration para custom_duration (snake_case) se existir
    if (slotDuration) {
      cleanData.custom_duration = slotDuration;
    } else if (customDuration) {
      cleanData.custom_duration = customDuration;
    }

    return cleanData;
  };

  // Função para gerar slots de tempo (incluindo slots de intervalo com is_active: false)
  const generateTimeSlots = (startTime: string, endTime: string, slotDuration: number, breakStartTime?: string, breakEndTime?: string) => {
    const slots = [];
    const start = new Date(`2000-01-01T${startTime}:00`);
    const end = new Date(`2000-01-01T${endTime}:00`);

    // Converter intervalo para Date se fornecido
    const breakStart = breakStartTime ? new Date(`2000-01-01T${breakStartTime}:00`) : null;
    const breakEnd = breakEndTime ? new Date(`2000-01-01T${breakEndTime}:00`) : null;

    let current = new Date(start);

    while (current < end) {
      const slotStart = current.toTimeString().slice(0, 5);
      current.setMinutes(current.getMinutes() + slotDuration);
      const slotEnd = current.toTimeString().slice(0, 5);

      if (current <= end) {
        const slotStartTime = new Date(`2000-01-01T${slotStart}:00`);
        const slotEndTime = new Date(`2000-01-01T${slotEnd}:00`);

        // Verificar se o slot está no intervalo de pausa
        let isInBreak = false;
        if (breakStart && breakEnd) {
          // Slot está no intervalo se inicia antes do fim do intervalo E termina depois do início do intervalo
          isInBreak = slotStartTime < breakEnd && slotEndTime > breakStart;
        }

        slots.push({
          startTime: slotStart,
          endTime: slotEnd,
          isActive: !isInBreak // false se estiver no intervalo, true caso contrário
        });
      }
    }

    return slots;
  };

  // Buscar profissionais da empresa
  const { data: professionals = [], isLoading: professionalsLoading } = useQuery({
    queryKey: ['/api/professionals', clientId],
    queryFn: async () => {
      const response = await fetch(`/api/professionals?client_id=${clientId}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Erro ao carregar profissionais');
      return response.json();
    },
  });

  // Buscar serviços da empresa
  const { data: services = [] } = useQuery({
    queryKey: ['/api/services', clientId],
    queryFn: async () => {
      const response = await fetch(`/api/services?client_id=${clientId}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Erro ao carregar serviços');
      return response.json();
    },
  });

  // Buscar disponibilidades do profissional selecionado
  const { data: availabilities = [], isLoading: availabilitiesLoading } = useQuery({
    queryKey: ['/api/professional-availability', selectedProfessional],
    queryFn: async () => {
      if (!selectedProfessional) return [];
      const response = await fetch(`/api/professional-availability?professionalId=${selectedProfessional}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Erro ao carregar horários');
      return response.json();
    },
    enabled: !!selectedProfessional,
  });

  // Mutation para criar horário
  const createAvailabilityMutation = useMutation({
    mutationFn: async (availabilityData: any) => {
      const response = await fetch('/api/professional-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(availabilityData),
      });
      if (!response.ok) throw new Error('Erro ao criar horário');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/professional-availability'] });
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
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await fetch(`/api/professional-availability/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Erro ao atualizar horário');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/professional-availability'] });
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
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Erro ao deletar horário');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/professional-availability'] });
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

  // Mutation para gerar horários do próximo mês
  const generateNextMonthMutation = useMutation({
    mutationFn: async (professionalId: string) => {
      const response = await fetch("/api/professional-availability/generate-next-month", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
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

  // Mutation para gerar horários futuros
  const generateFutureScheduleMutation = useMutation({
    mutationFn: async ({ professionalId, months }: { professionalId: string; months: number }) => {
      const response = await fetch("/api/professional-availability/generate-future", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({ professionalId, months }),
      });
      if (!response.ok) throw new Error("Erro ao gerar horários futuros");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/professional-availability"] });
      setShowFutureScheduleModal(false);
      toast({
        title: "Sucesso!",
        description: `${data.totalCreated} horários criados para ${data.months} mês(es) futuros`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao gerar horários futuros.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setScheduleType("recurring");
    setFormData({
      professionalId: "",
      startTime: "09:00",
      endTime: "16:00", // Teste: 09:00-16:00
      slotDuration: 60,
      isActive: true,
      dayOfWeek: 1,
      daysOfWeek: [1],
      breakStartTime: "11:00", // Teste: intervalo 11:00-13:00
      breakEndTime: "13:00",
    });
  };

  const openNewModal = () => {
    setEditingAvailability(null);
    resetForm();
    setShowModal(true);
  };

  const handleEdit = (availability: ProfessionalAvailability) => {
    setEditingAvailability(availability);
    setScheduleType(availability.dayOfWeek !== undefined ? "recurring" : "specific");
    setFormData({
      professionalId: availability.professionalId,
      serviceId: availability.serviceId,
      date: availability.date,
      dayOfWeek: availability.dayOfWeek,
      daysOfWeek: availability.dayOfWeek !== undefined ? [availability.dayOfWeek] : undefined,
      startTime: availability.startTime,
      endTime: availability.endTime,
      slotDuration: availability.slotDuration,
      isActive: availability.isActive,
      breakStartTime: availability.breakStartTime,
      breakEndTime: availability.breakEndTime,
    });
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja remover este horário?')) {
      deleteAvailabilityMutation.mutate(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    console.log("🔍 Admin - handleSubmit iniciado");
    console.log("🔍 Admin - FormData completo:", formData);
    console.log("🔍 Admin - ScheduleType:", scheduleType);

    if (!formData.professionalId) {
      console.log("🔍 Admin - Erro: Profissional não selecionado");
      toast({
        title: "Erro",
        description: "Selecione um profissional.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.serviceId) {
      console.log("🔍 Admin - Erro: Serviço não selecionado");
      toast({
        title: "Erro",
        description: "Selecione um serviço.",
        variant: "destructive",
      });
      return;
    }

    // Preparar dados (limpar campos que não devem ir para o backend)
    const dataToSubmit = cleanDataForBackend(formData);

    if (editingAvailability) {
      updateAvailabilityMutation.mutate({
        id: editingAvailability.id,
        data: dataToSubmit,
      });
    } else {
      // Gerar slots individuais baseado no intervalo
      console.log("🔍 Admin - Iniciando criação de slots");
      console.log("🔍 Admin - FormData:", formData);

      const timeSlots = generateTimeSlots(
        formData.startTime,
        formData.endTime,
        formData.slotDuration,
        formData.breakStartTime,
        formData.breakEndTime
      );

      console.log("🔍 Admin - TimeSlots gerados:", timeSlots);

      const daysToCreate = formData.daysOfWeek && formData.daysOfWeek.length > 0
        ? formData.daysOfWeek
        : (formData.dayOfWeek !== undefined ? [formData.dayOfWeek] : []);

      console.log("🔍 Admin - Dias para criar:", daysToCreate);

      const slotsToCreate = [];

      // Para cada dia selecionado, criar todos os slots de tempo como linhas individuais
      daysToCreate.forEach(dayOfWeek => {
        timeSlots.forEach(slot => {
          // Para horários recorrentes, usar data de hoje como referência
          // Para horários específicos, usar a data selecionada
          const dateToUse = scheduleType === "specific"
            ? formData.date
            : new Date().toISOString().split('T')[0];

          const slotData = {
            professionalId: formData.professionalId,
            dayOfWeek: scheduleType === "recurring" ? dayOfWeek : undefined,
            date: dateToUse, // Campo obrigatório sempre preenchido
            startTime: slot.startTime, // Hora inicial do slot individual
            endTime: slot.endTime,     // Hora final do slot individual
            isActive: slot.isActive,   // true ou false baseado no intervalo
            serviceId: formData.serviceId,
            slotDuration: formData.slotDuration, // Será convertido para customDuration na limpeza
          };

          // Limpar campos undefined
          console.log("🔍 Admin - Slot ANTES da limpeza:", slotData);
          const cleanSlotData = cleanDataForBackend(slotData);
          console.log("🔍 Admin - Slot DEPOIS da limpeza:", cleanSlotData);
          slotsToCreate.push(cleanSlotData);
        });
      });

      console.log("🔍 Admin - Total de slots a criar:", slotsToCreate.length);

      // Criar todos os slots individuais
      Promise.all(
        slotsToCreate.map(async (slotData) => {
          console.log("🔍 Admin - Enviando slot:", slotData);
          const response = await fetch("/api/professional-availability", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: 'include',
            body: JSON.stringify(slotData),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error("🔍 Admin - Erro na resposta:", errorText);
            throw new Error(`Erro ao criar slot: ${response.status} - ${errorText}`);
          }

          return response.json();
        })
      ).then(results => {
        console.log("🔍 Admin - Slots criados com sucesso:", results);

        queryClient.invalidateQueries({ queryKey: ["/api/professional-availability"] });
        setShowModal(false);
        resetForm();

        const totalSlots = slotsToCreate.length;
        const activeSlots = slotsToCreate.filter(slot => slot.isActive).length;
        const inactiveSlots = totalSlots - activeSlots;

        toast({
          title: "Sucesso!",
          description: `${totalSlots} slots criados (${activeSlots} ativos${inactiveSlots > 0 ? `, ${inactiveSlots} inativos no intervalo` : ''}).`,
        });
      }).catch(error => {
        console.error("🔍 Admin - Erro ao criar slots:", error);
        toast({
          title: "Erro",
          description: error.message || "Erro ao criar slots de horário.",
          variant: "destructive",
        });
      });
    }
  };

  // Função para gerar próximo mês
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

  // Função para abrir modal de geração futura
  const handleOpenFutureScheduleModal = () => {
    if (!selectedProfessional) {
      toast({
        title: "Erro",
        description: "Selecione um profissional primeiro.",
        variant: "destructive",
      });
      return;
    }

    setShowFutureScheduleModal(true);
  };

  // Função para confirmar geração futura
  const handleConfirmFutureSchedule = () => {
    const months = parseInt(futureSchedulePeriod);
    generateFutureScheduleMutation.mutate({
      professionalId: selectedProfessional,
      months
    });
  };

  const selectedProfessionalData = professionals.find((p: Professional) => p.id === selectedProfessional);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Building2 className="w-5 h-5" />
            <span>Config. Profissionais - {clientName}</span>
          </CardTitle>
          <CardDescription>
            Configure os horários de disponibilidade dos profissionais da sua empresa
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Seleção de Profissional */}
          <div className="mb-6">
            <Label className="text-base font-medium">Selecionar Profissional</Label>
            <Select value={selectedProfessional} onValueChange={setSelectedProfessional}>
              <SelectTrigger className="w-full mt-2">
                <SelectValue placeholder="Escolha um profissional..." />
              </SelectTrigger>
              <SelectContent>
                {professionals.map((professional: Professional) => (
                  <SelectItem key={professional.id} value={professional.id}>
                    {professional.name} - {professional.email}
                    {professional.specialtyName && ` (${professional.specialtyName})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Horários do Profissional */}
          {selectedProfessional && (
            <div className="space-y-4">
              <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between space-y-2 xs:space-y-0">
                <h3 className="text-lg font-medium">
                  Horários - {selectedProfessionalData?.name}
                </h3>
                <div className="flex flex-col xs:flex-row space-y-2 xs:space-y-0 xs:space-x-2">
                  <Button
                    onClick={handleOpenFutureScheduleModal}
                    variant="outline"
                    className="bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200"
                    disabled={generateFutureScheduleMutation.isPending}
                  >
                    {generateFutureScheduleMutation.isPending ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CalendarDays className="w-4 h-4 mr-2" />
                    )}
                    Gerar Horários Futuros
                  </Button>

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

              {availabilitiesLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-500">Carregando horários...</p>
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
                    <Card key={availability.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <Badge variant={availability.isActive ? "default" : "secondary"}>
                                {availability.isActive ? "Ativo" : "Inativo"}
                              </Badge>
                              {availability.dayOfWeek !== undefined ? (
                                <Badge variant="outline">
                                  {DAYS_OF_WEEK.find(d => d.value === availability.dayOfWeek)?.label}
                                </Badge>
                              ) : (
                                <Badge variant="outline">
                                  {new Date(availability.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                                </Badge>
                              )}
                              {availability.serviceName && (
                                <Badge variant="outline" className="bg-green-50 text-green-700">
                                  {availability.serviceName}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">
                              {availability.startTime} às {availability.endTime} 
                              ({availability.slotDuration} min por slot)
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(availability)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(availability.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Criação/Edição */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">
                {editingAvailability ? "Editar Horário" : "Novo Horário"}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Profissional */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Profissional *</label>
                <select
                  value={formData.professionalId}
                  onChange={(e) => setFormData(prev => ({ ...prev, professionalId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Selecione um profissional</option>
                  {professionals.map((professional: Professional) => (
                    <option key={professional.id} value={professional.id}>
                      {professional.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Serviço Associado */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Serviço Associado</label>
                <select
                  value={formData.serviceId || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, serviceId: e.target.value || undefined }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Nenhum serviço específico</option>
                  {services.map((service: Service) => (
                    <option key={service.id} value={service.id}>
                      {service.name} - R$ {(service.price / 100).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tipo de Horário */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo de Horário</label>
                <select
                  value={scheduleType}
                  onChange={(e) => {
                    const value = e.target.value as "recurring" | "specific";
                    console.log("🔍 Admin - Mudando scheduleType para:", value);
                    setScheduleType(value);
                    if (value === "recurring") {
                      console.log("🔍 Admin - Configurando para recorrente");
                      setFormData(prev => ({
                        ...prev,
                        date: undefined,
                        dayOfWeek: 1,
                        daysOfWeek: [1]
                      }));
                    } else {
                      console.log("🔍 Admin - Configurando para data específica");
                      const today = new Date().toISOString().split('T')[0];
                      setFormData(prev => ({
                        ...prev,
                        dayOfWeek: undefined,
                        daysOfWeek: undefined,
                        date: today
                      }));
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="recurring">Horário Semanal (Recorrente)</option>
                  <option value="specific">Data Específica</option>
                </select>
              </div>

              {/* Dia da Semana ou Data */}
              {scheduleType === "recurring" ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Dias da Semana</label>
                  <p className="text-xs text-gray-500 mb-2">
                    Selecione múltiplos dias para criar horários idênticos em vários dias da semana
                  </p>
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

                            setTimeout(() => {
                              if (isChecked) {
                                const currentDays = formData.daysOfWeek || [];
                                const newDays = currentDays.filter(d => d !== day.value);
                                setFormData(prev => ({
                                  ...prev,
                                  daysOfWeek: newDays,
                                  dayOfWeek: newDays.length === 1 ? newDays[0] : 1
                                }));
                              } else {
                                const currentDays = formData.daysOfWeek || [];
                                const newDays = [...currentDays, day.value].filter((v, i, a) => a.indexOf(v) === i).sort();
                                setFormData(prev => ({
                                  ...prev,
                                  daysOfWeek: newDays,
                                  dayOfWeek: newDays.length === 1 ? newDays[0] : 1
                                }));
                              }
                            }, 0);
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
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Data Específica *</label>
                  <input
                    type="date"
                    value={formData.date || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required={scheduleType === "specific"}
                  />
                </div>
              )}

              {/* Horários */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Hora Início *</label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Hora Fim *</label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Intervalo de Almoço/Pausa (Opcional) */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium">Intervalo de Almoço/Pausa</label>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">Opcional</span>
                </div>
                <p className="text-xs text-gray-600">
                  Define um período onde não serão gerados slots de agendamento (ex: horário de almoço)
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Início do Intervalo</label>
                    <input
                      type="time"
                      value={formData.breakStartTime || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, breakStartTime: e.target.value || undefined }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ex: 12:00"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Fim do Intervalo</label>
                    <input
                      type="time"
                      value={formData.breakEndTime || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, breakEndTime: e.target.value || undefined }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ex: 13:00"
                    />
                  </div>
                </div>
                {formData.breakStartTime && formData.breakEndTime && (
                  <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                    <p className="text-sm text-orange-800">
                      ⏰ <strong>Intervalo configurado:</strong> {formData.breakStartTime} às {formData.breakEndTime}
                      <br />
                      <span className="text-orange-600">Nenhum slot será gerado durante este período.</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Duração dos Slots */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Duração dos Slots *</label>
                <select
                  value={formData.slotDuration}
                  onChange={(e) => setFormData(prev => ({ ...prev, slotDuration: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {SLOT_DURATIONS.map(duration => (
                    <option key={duration.value} value={duration.value}>
                      {duration.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Preview */}
              {formData.startTime && formData.endTime && formData.slotDuration && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Preview:</strong> {
                      (() => {
                        const slots = generateTimeSlots(
                          formData.startTime,
                          formData.endTime,
                          formData.slotDuration,
                          formData.breakStartTime,
                          formData.breakEndTime
                        );
                        const activeSlots = slots.filter(slot => slot.isActive).length;
                        const inactiveSlots = slots.filter(slot => !slot.isActive).length;

                        let result = `${activeSlots} slots ativos`;
                        if (inactiveSlots > 0) {
                          result += ` + ${inactiveSlots} inativos (intervalo)`;
                        }
                        result += ` de ${formData.slotDuration} min`;

                        return result;
                      })()
                    }
                    {scheduleType === "recurring" && formData.daysOfWeek && formData.daysOfWeek.length > 1 &&
                      ` × ${formData.daysOfWeek.length} dias`
                    }
                    {formData.breakStartTime && formData.breakEndTime && (
                      <span className="block mt-1 text-orange-700">
                        🚫 Intervalo {formData.breakStartTime}-{formData.breakEndTime} será inativo
                      </span>
                    )}
                  </p>
                </div>
              )}

              <div className="flex space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  <X className="w-4 h-4 mr-2 inline" />
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createAvailabilityMutation.isPending || updateAvailabilityMutation.isPending}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save className="w-4 h-4 mr-2 inline" />
                  {editingAvailability ? "Atualizar" : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Geração de Horários Futuros */}
      {showFutureScheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center space-x-2 mb-4">
              <CalendarDays className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-semibold">Gerar Horários Futuros</h3>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Quer replicar esses horários para o futuro?</strong>
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Os horários serão criados com base na configuração atual do profissional.
                </p>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium">📆 Período para replicar:</label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="period-1"
                      name="period"
                      value="1"
                      checked={futureSchedulePeriod === "1"}
                      onChange={(e) => setFutureSchedulePeriod(e.target.value as "1" | "3" | "6" | "12")}
                      className="text-purple-600"
                    />
                    <label htmlFor="period-1" className="text-sm cursor-pointer">Próximo mês</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="period-3"
                      name="period"
                      value="3"
                      checked={futureSchedulePeriod === "3"}
                      onChange={(e) => setFutureSchedulePeriod(e.target.value as "1" | "3" | "6" | "12")}
                      className="text-purple-600"
                    />
                    <label htmlFor="period-3" className="text-sm cursor-pointer">Próximos 3 meses</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="period-6"
                      name="period"
                      value="6"
                      checked={futureSchedulePeriod === "6"}
                      onChange={(e) => setFutureSchedulePeriod(e.target.value as "1" | "3" | "6" | "12")}
                      className="text-purple-600"
                    />
                    <label htmlFor="period-6" className="text-sm cursor-pointer">Próximos 6 meses</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="period-12"
                      name="period"
                      value="12"
                      checked={futureSchedulePeriod === "12"}
                      onChange={(e) => setFutureSchedulePeriod(e.target.value as "1" | "3" | "6" | "12")}
                      className="text-purple-600"
                    />
                    <label htmlFor="period-12" className="text-sm cursor-pointer">Próximo ano (12 meses)</label>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex space-x-3 pt-4 border-t mt-4">
              <button
                type="button"
                onClick={() => setShowFutureScheduleModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmFutureSchedule}
                disabled={generateFutureScheduleMutation.isPending}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
              >
                {generateFutureScheduleMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin inline" />
                ) : (
                  <CalendarDays className="w-4 h-4 mr-2 inline" />
                )}
                🔄 Gerar Horários
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfessionalScheduleConfigAdmin;
