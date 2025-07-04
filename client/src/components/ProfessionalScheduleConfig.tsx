import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Clock, Plus, Edit, Trash2, Calendar, User, Save, X, Search, Power, PowerOff, RefreshCw, CalendarDays, Settings, DollarSign } from "lucide-react";

interface Professional {
  id: string;
  name: string;
  email: string;
  phone?: string;
  specialtyId?: string;
  isActive: boolean;
  clientId: string;
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

interface ProfessionalScheduleConfigProps {
  clientId: string;
}

export default function ProfessionalScheduleConfig({ clientId }: ProfessionalScheduleConfigProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedProfessional, setSelectedProfessional] = useState<string>("");
  const [activeTab, setActiveTab] = useState("schedule");

  // Estado do formulário
  const [scheduleType, setScheduleType] = useState<"dayOfWeek" | "date">("dayOfWeek");
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [startTime, setStartTime] = useState<string>("09:00");
  const [endTime, setEndTime] = useState<string>("18:00");
  const [slotDuration, setSlotDuration] = useState<number>(60);
  const [isActive, setIsActive] = useState<boolean>(true);


  // Buscar profissionais da empresa
  const { data: professionals = [], isLoading: professionalsLoading } = useQuery({
    queryKey: ["/api/professionals", clientId],
    queryFn: async () => {
      const response = await fetch(`/api/professionals?client_id=${clientId}`, { credentials: 'include' });
      if (!response.ok) throw new Error("Erro ao carregar profissionais");
      return response.json();
    },
  });

  // Buscar disponibilidades do profissional selecionado
  const { data: availabilities = [], isLoading: availabilitiesLoading } = useQuery({
    queryKey: ["/api/professional-availability", selectedProfessional, clientId],
    queryFn: async () => {
      if (!selectedProfessional) return [];
      const response = await fetch(`/api/professional-availability?professionalId=${selectedProfessional}&client_id=${clientId}`, { credentials: 'include' });
      if (!response.ok) throw new Error("Erro ao carregar horários");
      return response.json();
    },
    enabled: !!selectedProfessional,
  });



  // Mutation para atualizar disponibilidade
  const updateAvailabilityMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: AvailabilityForm }) => {
      const response = await fetch(`/api/professional-availability/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({
          ...data,
          clientId: clientId, // Garantir que o client_id seja enviado
        }),
      });
      if (!response.ok) throw new Error("Erro ao atualizar horário");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/professional-availability"] });
      setShowModal(false);
      resetForm();
      toast({ title: "Horário atualizado com sucesso!" });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao atualizar horário", description: error.message, variant: "destructive" });
    },
  });

  // Mutation para deletar disponibilidade
  const deleteAvailabilityMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/professional-availability/${id}`, {
        method: "DELETE",
        credentials: 'include',
      });
      if (!response.ok) throw new Error("Erro ao deletar horário");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/professional-availability"] });
      toast({ title: "Horário removido com sucesso!" });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao remover horário", description: error.message, variant: "destructive" });
    },
  });

  // Mutation para toggle de status (ativar/desativar)
  const toggleAvailabilityMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await fetch(`/api/professional-availability/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
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



  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja remover este horário?")) {
      deleteAvailabilityMutation.mutate(id);
    }
  };

  const handleSubmitSchedule = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProfessional) {
      toast({
        title: "Erro",
        description: "Selecione um profissional primeiro.",
        variant: "destructive",
      });
      return;
    }

    if (scheduleType === "date" && !selectedDate) {
      toast({
        title: "Erro",
        description: "Selecione uma data específica.",
        variant: "destructive",
      });
      return;
    }

    if (startTime >= endTime) {
      toast({
        title: "Erro",
        description: "O horário de início deve ser anterior ao horário de fim.",
        variant: "destructive",
      });
      return;
    }

    // Gerar slots de tempo
    const timeSlots = generateTimeSlots(startTime, endTime, slotDuration);

    if (timeSlots.length === 0) {
      toast({
        title: "Erro",
        description: "Horário inválido. Verifique se o horário de fim é posterior ao de início.",
        variant: "destructive",
      });
      return;
    }

    // Preparar dados base
    let dayOfWeekValue = undefined;
    let dateValue = undefined;

    if (scheduleType === "dayOfWeek") {
      dayOfWeekValue = selectedDay;
    } else if (scheduleType === "date" && selectedDate) {
      dateValue = selectedDate;
      // Calcular automaticamente o day_of_week baseado na data selecionada
      const dateObj = new Date(selectedDate + 'T12:00:00'); // Usar meio-dia para evitar problemas de timezone
      dayOfWeekValue = dateObj.getDay(); // 0 = Domingo, 1 = Segunda, etc.
      console.log("📅 DEBUG ADMIN - Data:", selectedDate, "Day of week:", dayOfWeekValue, "Dia:", dateObj.toLocaleDateString('pt-BR', { weekday: 'long' }));
    }

    const baseData = {
      professionalId: selectedProfessional,
      dayOfWeek: dayOfWeekValue,
      date: dateValue,
      isActive,
      clientId: clientId,
    };

    // Criar múltiplos slots
    const slotsToCreate = timeSlots.map(slot => ({
      ...baseData,
      startTime: slot.startTime,
      endTime: slot.endTime,
    }));

    // Enviar todos os slots
    createMultipleSlotsFunction(slotsToCreate);
  };

  // Função para criar múltiplos slots
  const createMultipleSlotsFunction = async (slotsToCreate: any[]) => {
    try {
      const responses = await Promise.all(
        slotsToCreate.map(slotData =>
          fetch("/api/professional-availability", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: 'include',
            body: JSON.stringify(slotData),
          })
        )
      );

      const failedRequests = responses.filter(r => !r.ok);
      if (failedRequests.length > 0) {
        throw new Error(`${failedRequests.length} slots falharam ao ser criados`);
      }

      queryClient.invalidateQueries({ queryKey: ["/api/professional-availability"] });
      resetForm();
      toast({
        title: "Sucesso!",
        description: `${slotsToCreate.length} slots de horário criados com sucesso.`,
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar slots de horário.",
        variant: "destructive",
      });
    }
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

  const resetForm = () => {
    setScheduleType("dayOfWeek");
    setSelectedDay(1);
    setSelectedDate("");
    setStartTime("09:00");
    setEndTime("18:00");
    setSlotDuration(60);
    setIsActive(true);
  };





  // Usar todos os profissionais
  const filteredProfessionals = professionals;

  return (
    <div className="space-y-6">
      {/* Seleção de Profissional */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Selecionar Profissional</span>
          </CardTitle>
          <CardDescription>
            Escolha um profissional para configurar seus horários de disponibilidade
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedProfessional || ""} onValueChange={setSelectedProfessional}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione um profissional..." />
            </SelectTrigger>
            <SelectContent>
              {professionalsLoading ? (
                <div className="text-center py-4">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-sm text-gray-600 mt-2">Carregando profissionais...</p>
                </div>
              ) : filteredProfessionals.length === 0 ? (
                <div className="text-center py-8">
                  <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum profissional encontrado</h3>
                  <p className="text-gray-600">Cadastre profissionais para configurar horários.</p>
                </div>
              ) : (
                filteredProfessionals.map((professional: Professional) => (
                  <SelectItem key={professional.id} value={professional.id}>
                    {professional.name} - {professional.email}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Configuração de Horários */}
      {selectedProfessional && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="schedule" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Horários
            </TabsTrigger>
            <TabsTrigger value="services" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Serviços
            </TabsTrigger>
          </TabsList>

          {/* Aba de Horários */}
          <TabsContent value="schedule" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Formulário para adicionar horário */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Adicionar Horário
                  </CardTitle>
                  <CardDescription>
                    Configure a disponibilidade por dia da semana
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmitSchedule} className="space-y-4">
                    {/* Tipo de Horário */}
                    <div>
                      <Label htmlFor="scheduleType">Tipo de Horário</Label>
                      <Select value={scheduleType} onValueChange={(value: "dayOfWeek" | "date") => setScheduleType(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dayOfWeek">🔄 Dia da Semana (recorrente)</SelectItem>
                          <SelectItem value="date">📅 Data Específica</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Dia da Semana ou Data Específica */}
                    {scheduleType === "dayOfWeek" ? (
                      <div>
                        <Label htmlFor="dayOfWeek">Dia da Semana</Label>
                        <Select value={selectedDay.toString()} onValueChange={(value) => setSelectedDay(parseInt(value))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DAYS_OF_WEEK.map((day) => (
                              <SelectItem key={day.value} value={day.value.toString()}>
                                {day.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div>
                        <Label htmlFor="specificDate">Data Específica</Label>
                        <Input
                          id="specificDate"
                          type="date"
                          value={selectedDate}
                          onChange={(e) => setSelectedDate(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                        />
                        {/* Mostrar o dia da semana calculado */}
                        {selectedDate && (
                          <p className="text-sm text-gray-600 mt-1">
                            Dia da semana: <strong>
                              {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long' })}
                            </strong>
                          </p>
                        )}
                      </div>
                    )}

                    {/* Duração do Slot */}
                    <div>
                      <Label htmlFor="slotDuration">Duração dos Slots</Label>
                      <Select value={slotDuration.toString()} onValueChange={(value) => setSlotDuration(parseInt(value))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="30">30 minutos</SelectItem>
                          <SelectItem value="60">1 hora</SelectItem>
                          <SelectItem value="90">1 hora e 30 minutos</SelectItem>
                          <SelectItem value="120">2 horas</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="startTime">Horário Início</Label>
                        <Select value={startTime} onValueChange={setStartTime}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 24 }, (_, i) => {
                              const hour = i.toString().padStart(2, '0');
                              return `${hour}:00`;
                            }).map((time) => (
                              <SelectItem key={time} value={time}>
                                {time}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="endTime">Horário Fim</Label>
                        <Select value={endTime} onValueChange={setEndTime}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 24 }, (_, i) => {
                              const hour = i.toString().padStart(2, '0');
                              return `${hour}:00`;
                            }).map((time) => (
                              <SelectItem key={time} value={time}>
                                {time}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Preview dos Slots */}
                    {startTime && endTime && startTime < endTime && (
                      <div>
                        <Label className="text-base font-medium">Preview dos Slots que serão criados:</Label>
                        <div className="p-3 bg-gray-50 rounded-lg max-h-24 overflow-y-auto mt-2">
                          <div className="flex flex-wrap gap-1">
                            {(() => {
                              const slots = generateTimeSlots(startTime, endTime, slotDuration);
                              return slots.map((slot, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {slot.startTime}-{slot.endTime}
                                </Badge>
                              ));
                            })()}
                          </div>
                          <p className="text-xs text-gray-600 mt-2">
                            Total: {generateTimeSlots(startTime, endTime, slotDuration).length} slots
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isActive"
                        checked={isActive}
                        onCheckedChange={setIsActive}
                      />
                      <Label htmlFor="isActive">Ativo</Label>
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={startTime >= endTime}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {startTime && endTime && startTime < endTime
                        ? `Criar ${generateTimeSlots(startTime, endTime, slotDuration).length} Slots`
                        : "Salvar Horário"
                      }
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Lista de horários configurados */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Horários Configurados
                  </CardTitle>
                  <CardDescription>
                    Horários de disponibilidade do profissional
                  </CardDescription>
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
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Horários por Dia da Semana */}
                      {DAYS_OF_WEEK.map((day) => {
                        // Incluir tanto horários recorrentes quanto datas específicas deste dia
                        const daySchedules = availabilities.filter(
                          (av: ProfessionalAvailability) => av.dayOfWeek === day.value
                        );

                        if (daySchedules.length === 0) {
                          return null; // Não mostrar dias sem horários
                        }

                        return (
                          <div key={day.value} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <Badge variant="outline" className="font-medium">
                                {day.label.substring(0, 3).toUpperCase()}
                              </Badge>
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {day.label}
                              </span>
                            </div>

                            <div className="space-y-2">
                              {daySchedules.map((schedule) => (
                                <div
                                  key={schedule.id}
                                  className={`flex items-center justify-between rounded p-2 ${
                                    schedule.date
                                      ? "bg-green-50 dark:bg-green-900/20 border border-green-200"
                                      : "bg-gray-50 dark:bg-gray-800"
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">
                                      {schedule.startTime} - {schedule.endTime}
                                    </span>
                                    {schedule.date && (
                                      <Badge variant="outline" className="text-xs bg-green-100 text-green-800">
                                        📅 {new Date(schedule.date).toLocaleDateString('pt-BR')}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant={schedule.isActive ? "default" : "secondary"}>
                                      {schedule.isActive ? "Ativo" : "Inativo"}
                                    </Badge>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => handleDelete(schedule.id)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}



                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Aba de Serviços */}
          <TabsContent value="services" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Configurar Preços e Durações
                </CardTitle>
                <CardDescription>
                  Personalize preços e durações por serviço para este profissional
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Configuração de Serviços</h3>
                  <p className="text-gray-600">Esta funcionalidade será implementada em breve.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}


    </div>
  );
}
