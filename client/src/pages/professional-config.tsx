import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Professional, Service, ProfessionalAvailability } from "@shared/schema";
import { Clock, DollarSign, Calendar, Settings, Save, Plus, Trash2 } from "lucide-react";

const DAYS_OF_WEEK = [
  { value: 1, label: "Segunda-feira", short: "SEG" },
  { value: 2, label: "Terça-feira", short: "TER" },
  { value: 3, label: "Quarta-feira", short: "QUA" },
  { value: 4, label: "Quinta-feira", short: "QUI" },
  { value: 5, label: "Sexta-feira", short: "SEX" },
  { value: 6, label: "Sábado", short: "SAB" },
  { value: 0, label: "Domingo", short: "DOM" },
];

const timeSlots = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0');
  return `${hour}:00`;
});

const serviceConfigSchema = {
  serviceId: "",
  customPrice: "",
  customDuration: "",
};

export default function ProfessionalConfig() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedProfessional, setSelectedProfessional] = useState<string>("");
  const [activeTab, setActiveTab] = useState("schedule");

  // Estado do formulário (igual ao admin)
  const [scheduleType, setScheduleType] = useState<"dayOfWeek" | "date">("dayOfWeek");
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [startTime, setStartTime] = useState<string>("09:00");
  const [endTime, setEndTime] = useState<string>("18:00");
  const [slotDuration, setSlotDuration] = useState<number>(60);
  const [isActive, setIsActive] = useState<boolean>(true);

  // Buscar usuário logado
  const { data: user } = useQuery({
    queryKey: ["/api/auth/user"],
  });

  // Buscar profissionais
  const { data: professionals = [] } = useQuery<Professional[]>({
    queryKey: ["/api/professionals"],
  });

  // Buscar serviços
  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  // Buscar disponibilidade do profissional
  const { data: availability = [], refetch: refetchAvailability } = useQuery<ProfessionalAvailability[]>({
    queryKey: ["/api/professional-availability", selectedProfessional],
    enabled: !!selectedProfessional,
  });

  // Função para gerar slots de tempo (igual ao admin)
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

  // Formulário para configuração de serviços
  const serviceForm = useForm({
    resolver: zodResolver(serviceConfigSchema),
    defaultValues: {
      serviceId: "",
      customPrice: "",
      customDuration: "",
    },
  });

  // Função para criar múltiplos slots (igual ao admin)
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

  // Mutation para configurar serviço
  const configureServiceMutation = useMutation({
    mutationFn: async (data: z.infer<typeof serviceConfigSchema>) => {
      const response = await apiRequest("PUT", `/api/professional-service-config/${selectedProfessional}`, {
        serviceId: data.serviceId,
        customPrice: data.customPrice ? parseInt(data.customPrice) * 100 : undefined, // converter para centavos
        customDuration: data.customDuration ? parseInt(data.customDuration) : undefined,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Configuração de serviço salva!" });
      serviceForm.reset();
    },
    onError: () => {
      toast({ 
        title: "Erro ao configurar serviço", 
        variant: "destructive" 
      });
    },
  });

  // Mutation para deletar horário
  const deleteScheduleMutation = useMutation({
    mutationFn: async (availabilityId: string) => {
      const response = await apiRequest("DELETE", `/api/professional-availability/${availabilityId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Horário removido com sucesso!" });
      refetchAvailability();
    },
    onError: () => {
      toast({ 
        title: "Erro ao remover horário", 
        variant: "destructive" 
      });
    },
  });

  // Função resetForm (igual ao admin)
  const resetForm = () => {
    setScheduleType("dayOfWeek");
    setSelectedDay(1);
    setSelectedDate("");
    setStartTime("09:00");
    setEndTime("18:00");
    setSlotDuration(60);
    setIsActive(true);
  };

  // Função handleSubmitSchedule (igual ao admin)
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

    // Preparar dados base (igual ao admin)
    let dayOfWeekValue = null;
    let dateValue = null;

    if (scheduleType === "dayOfWeek") {
      dayOfWeekValue = selectedDay;
    } else if (scheduleType === "date" && selectedDate) {
      dateValue = selectedDate;
      // Calcular automaticamente o day_of_week baseado na data selecionada
      const dateObj = new Date(selectedDate + 'T12:00:00'); // Usar meio-dia para evitar problemas de timezone
      dayOfWeekValue = dateObj.getDay(); // 0 = Domingo, 1 = Segunda, etc.
    }

    const baseData = {
      professionalId: selectedProfessional,
      dayOfWeek: dayOfWeekValue,
      date: dateValue,
      isActive,
      clientId: user?.clientId, // Adicionar clientId como no admin
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

  const onConfigureService = (data: z.infer<typeof serviceConfigSchema>) => {
    if (!selectedProfessional) {
      toast({ title: "Selecione um profissional primeiro", variant: "destructive" });
      return;
    }
    configureServiceMutation.mutate(data);
  };

  const formatCurrency = (centavos: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(centavos / 100);
  };

  const getDaySchedules = () => {
    const schedules: { [key: number]: ProfessionalAvailability[] } = {};
    
    availability.forEach(avail => {
      if (avail.dayOfWeek !== null) {
        if (!schedules[avail.dayOfWeek]) {
          schedules[avail.dayOfWeek] = [];
        }
        schedules[avail.dayOfWeek].push(avail);
      }
    });
    
    return schedules;
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Configurações de Profissional
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Configure horários, preços e durações de serviços para cada profissional
        </p>
      </div>

      {/* Seleção de Profissional */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Selecionar Profissional
          </CardTitle>
          <CardDescription>
            Escolha o profissional para configurar horários e serviços
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedProfessional} onValueChange={setSelectedProfessional}>
            <SelectTrigger className="w-full md:w-80">
              <SelectValue placeholder="Selecione um profissional..." />
            </SelectTrigger>
            <SelectContent>
              {professionals.map((prof) => (
                <SelectItem key={prof.id} value={prof.id}>
                  {prof.name} - {prof.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

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
                      <Label>Tipo de Horário</Label>
                      <Select
                        value={scheduleType}
                        onValueChange={(value: "dayOfWeek" | "date") => {
                          setScheduleType(value);
                          if (value === "dayOfWeek") {
                            setSelectedDate("");
                            setSelectedDay(1);
                          } else {
                            setSelectedDay(1);
                            setSelectedDate(new Date().toISOString().split('T')[0]);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dayOfWeek">Horário Semanal (Recorrente)</SelectItem>
                          <SelectItem value="date">Data Específica</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Dia da Semana ou Data */}
                    {scheduleType === "dayOfWeek" ? (
                      <div>
                        <Label htmlFor="dayOfWeek">Dia da Semana</Label>
                        <Select
                          value={selectedDay.toString()}
                          onValueChange={(value) => setSelectedDay(parseInt(value))}
                        >
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
                        <Label htmlFor="date">Data</Label>
                        <Input
                          type="date"
                          value={selectedDate}
                          onChange={(e) => setSelectedDate(e.target.value)}
                          required
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

                    {/* Duração dos Slots */}
                    <div>
                      <Label>Duração dos Slots</Label>
                      <Select
                        value={slotDuration.toString()}
                        onValueChange={(value) => setSlotDuration(parseInt(value))}
                      >
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
                        <Input
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="endTime">Horário Fim</Label>
                        <Input
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    {/* Preview dos Slots */}
                    {startTime && endTime && startTime < endTime && (
                      <div className="space-y-2">
                        <Label>Preview dos Slots que serão criados:</Label>
                        <div className="p-3 bg-gray-50 rounded-lg max-h-24 overflow-y-auto">
                          <div className="flex flex-wrap gap-1">
                            {generateTimeSlots(startTime, endTime, slotDuration).map((slot, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {slot.startTime}-{slot.endTime}
                              </Badge>
                            ))}
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
                  <div className="space-y-4">
                    {DAYS_OF_WEEK.map((day) => {
                      const daySchedules = getDaySchedules()[day.value] || [];
                      return (
                        <div key={day.value} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline" className="font-medium">
                              {day.short}
                            </Badge>
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {day.label}
                            </span>
                          </div>
                          
                          {daySchedules.length === 0 ? (
                            <p className="text-sm text-gray-500 italic">
                              Nenhum horário configurado
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {daySchedules.map((schedule) => (
                                <div 
                                  key={schedule.id} 
                                  className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded p-2"
                                >
                                  <span className="text-sm font-medium">
                                    {schedule.startTime} - {schedule.endTime}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <Badge variant={schedule.isActive ? "default" : "secondary"}>
                                      {schedule.isActive ? "Ativo" : "Inativo"}
                                    </Badge>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => deleteScheduleMutation.mutate(schedule.id)}
                                      disabled={deleteScheduleMutation.isPending}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
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
                <form onSubmit={serviceForm.handleSubmit(onConfigureService)} className="space-y-4">
                  <div>
                    <Label htmlFor="serviceId">Serviço</Label>
                    <Select 
                      value={serviceForm.watch("serviceId")} 
                      onValueChange={(value) => serviceForm.setValue("serviceId", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um serviço..." />
                      </SelectTrigger>
                      <SelectContent>
                        {services.map((service) => (
                          <SelectItem key={service.id} value={service.id}>
                            {service.name} - {service.price ? formatCurrency(service.price) : "Sem preço"} - {service.duration}min
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="customPrice">Preço Personalizado (R$)</Label>
                      <Input
                        id="customPrice"
                        type="number"
                        step="0.01"
                        placeholder="Ex: 150.00"
                        {...serviceForm.register("customPrice")}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Deixe vazio para usar o preço padrão
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="customDuration">Duração Personalizada (min)</Label>
                      <Input
                        id="customDuration"
                        type="number"
                        placeholder="Ex: 60"
                        {...serviceForm.register("customDuration")}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Deixe vazio para usar a duração padrão
                      </p>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={configureServiceMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {configureServiceMutation.isPending ? "Salvando..." : "Salvar Configuração"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Lista de serviços configurados */}
            <Card>
              <CardHeader>
                <CardTitle>Serviços Disponíveis</CardTitle>
                <CardDescription>
                  Lista de todos os serviços disponíveis no sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {services.map((service) => (
                    <div key={service.id} className="border rounded-lg p-4">
                      <h4 className="font-medium mb-2">{service.name}</h4>
                      <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                        <p>Preço: {service.price ? formatCurrency(service.price) : "Não definido"}</p>
                        <p>Duração: {service.duration} minutos</p>
                        {service.description && (
                          <p className="text-xs mt-2">{service.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {!selectedProfessional && (
        <Card>
          <CardContent className="text-center py-12">
            <Settings className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Selecione um Profissional
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Escolha um profissional acima para começar a configurar horários e serviços
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}