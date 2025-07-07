import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Clock, Plus, Edit, Trash2, Calendar, User, Save, X, Building2 } from 'lucide-react';

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

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Função para gerar slots de tempo (considerando intervalo de almoço/pausa)
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

        // Verificar se o slot não conflita com o intervalo
        let isInBreak = false;
        if (breakStart && breakEnd) {
          // Slot conflita se inicia antes do fim do intervalo E termina depois do início do intervalo
          isInBreak = slotStartTime < breakEnd && slotEndTime > breakStart;
        }

        if (!isInBreak) {
          slots.push({
            startTime: slotStart,
            endTime: slotEnd
          });
        }
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

  const resetForm = () => {
    setScheduleType("recurring");
    setFormData({
      professionalId: "",
      startTime: "09:00",
      endTime: "18:00",
      slotDuration: 60,
      isActive: true,
      dayOfWeek: 1,
      daysOfWeek: [1],
      breakStartTime: undefined, // Intervalo opcional
      breakEndTime: undefined, // Intervalo opcional
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

    if (!formData.professionalId) {
      toast({
        title: "Erro",
        description: "Selecione um profissional.",
        variant: "destructive",
      });
      return;
    }

    if (editingAvailability) {
      updateAvailabilityMutation.mutate({
        id: editingAvailability.id,
        data: formData,
      });
    } else {
      // Lógica para múltiplos dias
      if (scheduleType === "recurring" && formData.daysOfWeek && formData.daysOfWeek.length > 1) {
        // Criar horários para múltiplos dias
        const promises = formData.daysOfWeek.map(dayOfWeek => 
          createAvailabilityMutation.mutateAsync({
            ...formData,
            dayOfWeek,
            date: undefined,
          })
        );
        
        Promise.all(promises).then(() => {
          toast({
            title: "Sucesso!",
            description: `${formData.daysOfWeek!.length} horários criados para os dias selecionados.`,
          });
        }).catch(() => {
          toast({
            title: "Erro",
            description: "Erro ao criar alguns horários.",
            variant: "destructive",
          });
        });
      } else {
        createAvailabilityMutation.mutate(formData);
      }
    }
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
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">
                  Horários - {selectedProfessionalData?.name}
                </h3>
                <Button onClick={openNewModal} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Horário
                </Button>
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
                  onChange={(value) => {
                    setScheduleType(value as "recurring" | "specific");
                    if (value === "recurring") {
                      setFormData(prev => ({
                        ...prev,
                        date: undefined,
                        dayOfWeek: 1,
                        daysOfWeek: [1]
                      }));
                    } else {
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
                        const slotsPerDay = generateTimeSlots(
                          formData.startTime,
                          formData.endTime,
                          formData.slotDuration,
                          formData.breakStartTime,
                          formData.breakEndTime
                        ).length;
                        return slotsPerDay;
                      })()
                    } slots de {formData.slotDuration} min
                    {scheduleType === "recurring" && formData.daysOfWeek && formData.daysOfWeek.length > 1 &&
                      ` × ${formData.daysOfWeek.length} dias = ${
                        (() => {
                          const slotsPerDay = generateTimeSlots(
                            formData.startTime,
                            formData.endTime,
                            formData.slotDuration,
                            formData.breakStartTime,
                            formData.breakEndTime
                          ).length;
                          return slotsPerDay * formData.daysOfWeek.length;
                        })()
                      } slots total`
                    }
                    {formData.breakStartTime && formData.breakEndTime && (
                      <span className="block mt-1 text-orange-700">
                        ⚠️ Intervalo {formData.breakStartTime}-{formData.breakEndTime} excluído
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
    </div>
  );
};

export default ProfessionalScheduleConfigAdmin;
