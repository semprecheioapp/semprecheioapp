import React, { useState, useEffect } from "react";
import { Calendar, Search, Plus, Filter, ChevronLeft, ChevronRight, Edit, Trash2, Mail, Phone, Clock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";

type ViewMode = "month" | "week" | "day";

interface AgendaEvent {
  id: string;
  date: number;
  time: string;
  customerName: string;
  professionalName: string;
  serviceName: string;
  color: string;
  status: string;
  month: number;
  year: number;
  hour: number;
}

interface CalendarViewProps {
  clientId: string;
}

export default function CalendarView({ clientId }: CalendarViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const [searchTerm, setSearchTerm] = useState("");
  const [professionalsState, setProfessionalsState] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<AgendaEvent | null>(null);
  const [showNewEventModal, setShowNewEventModal] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [newEventData, setNewEventData] = useState({ date: 0, hour: 0 });
  const [editingEvent, setEditingEvent] = useState<AgendaEvent | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);

  // Estados para o formulário de novo agendamento
  const [newAppointment, setNewAppointment] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    professionalId: '',
    serviceId: '',
    date: '',
    time: '',
    duration: 60,
    notes: ''
  });

  // Query para buscar profissionais
  const { data: professionalsData = [], isLoading: professionalsLoading } = useQuery({
    queryKey: ["/api/professionals", clientId],
    queryFn: async () => {
      console.log('DEBUG - Fetching professionals for clientId:', clientId);
      const response = await fetch(`/api/professionals?client_id=${clientId}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch professionals');
      const data = await response.json();
      console.log('DEBUG - Professionals response:', data);
      return data;
    },
  });

  // Query para buscar especialidades
  const { data: specialtiesData = [], isLoading: specialtiesLoading } = useQuery({
    queryKey: ["/api/specialties", clientId],
    queryFn: async () => {
      const response = await fetch(`/api/specialties?client_id=${clientId}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch specialties');
      return response.json();
    },
  });

  // Query para buscar serviços
  const { data: servicesData = [], isLoading: servicesLoading } = useQuery({
    queryKey: ["/api/services", clientId],
    queryFn: async () => {
      const response = await fetch(`/api/services?client_id=${clientId}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch services');
      return response.json();
    },
  });

  // Query para buscar customers
  const { data: customersData = [], isLoading: customersLoading } = useQuery({
    queryKey: ["/api/customers", clientId],
    queryFn: async () => {
      const response = await fetch(`/api/customers?client_id=${clientId}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch customers');
      return response.json();
    },
  });

  // Query para buscar appointments
  const { data: appointmentsData = [], isLoading: appointmentsLoading } = useQuery({
    queryKey: ["/api/appointments", clientId],
    queryFn: async () => {
      console.log('DEBUG - Fetching appointments for clientId:', clientId);
      const response = await fetch(`/api/appointments?client_id=${clientId}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch appointments');
      const data = await response.json();
      console.log('DEBUG - Appointments response:', data);
      return data;
    },
  });

  // Query para buscar availability
  const { data: availabilityData = [], isLoading: availabilityLoading } = useQuery({
    queryKey: ["/api/professional-availability", clientId],
    queryFn: async () => {
      const response = await fetch(`/api/professional-availability?client_id=${clientId}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch availability');
      return response.json();
    },
  });

  // Sincronizar filtros de profissionais
  useEffect(() => {
    if (professionalsData && professionalsData.length > 0) {
      const realProfessionals = (professionalsData as any[]).map((prof: any) => {
        return {
          id: prof.id,
          name: prof.name,
          specialtyName: prof.specialtyName || 'Sem especialidade',
          color: prof.color || '#A78BFA',
          selected: true // Todos selecionados por padrão
        };
      });
      setProfessionalsState(realProfessionals);
    }
  }, [professionalsData]);

  // Função para organizar eventos em colunas (evitar sobreposição)
  const organizeEventsInColumns = (events: any[]) => {
    if (!events || events.length === 0) return [];

    // Ordenar eventos por horário de início
    const sortedEvents = [...events].sort((a, b) => {
      const timeA = new Date(a.scheduledAt || a.appointment_time).getTime();
      const timeB = new Date(b.scheduledAt || b.appointment_time).getTime();
      return timeA - timeB;
    });

    const columns: any[][] = [];

    sortedEvents.forEach(event => {
      const eventStart = new Date(event.scheduledAt || event.appointment_time);
      const eventEnd = new Date(eventStart.getTime() + (event.duration || 60) * 60000);

      // Encontrar uma coluna onde o evento não se sobreponha
      let placed = false;
      for (let i = 0; i < columns.length; i++) {
        const column = columns[i];
        const canPlace = column.every(existingEvent => {
          const existingStart = new Date(existingEvent.scheduledAt || existingEvent.appointment_time);
          const existingEnd = new Date(existingStart.getTime() + (existingEvent.duration || 60) * 60000);

          return eventEnd <= existingStart || eventStart >= existingEnd;
        });

        if (canPlace) {
          column.push({ ...event, column: i, totalColumns: 0 }); // totalColumns será atualizado depois
          placed = true;
          break;
        }
      }

      // Se não encontrou uma coluna, criar uma nova
      if (!placed) {
        columns.push([{ ...event, column: columns.length, totalColumns: 0 }]);
      }
    });

    // Atualizar totalColumns para todos os eventos
    const totalColumns = columns.length;
    const organizedEvents = columns.flat().map(event => ({
      ...event,
      totalColumns
    }));

    return organizedEvents;
  };

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonth(currentMonth - 1);
      }
    } else {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonth(currentMonth + 1);
      }
    }
  };

  // Função para abrir modal de novo agendamento
  const openNewEventModal = (day: number, hour: number) => {
    const selectedDate = new Date(currentYear, currentMonth, day);
    const timeString = `${hour.toString().padStart(2, '0')}:00`;

    setNewEventData({ date: day, hour });
    setNewAppointment({
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      professionalId: '',
      serviceId: '',
      date: selectedDate.toISOString().split('T')[0],
      time: timeString,
      duration: 60,
      notes: ''
    });
    setShowNewEventModal(true);
  };

  // Função para resetar formulário
  const resetAppointmentForm = () => {
    setNewAppointment({
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      professionalId: '',
      serviceId: '',
      date: '',
      time: '',
      duration: 60,
      notes: ''
    });
    setEditingEvent(null);
  };

  // Função para criar novo agendamento
  const createAppointment = async () => {
    try {
      const appointmentData = {
        ...newAppointment,
        clientId: clientId, // Filtro automático para a empresa do admin
        scheduledAt: `${newAppointment.date}T${newAppointment.time}:00.000Z`,
        status: 'confirmed'
      };

      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(appointmentData),
      });

      if (response.ok) {
        setShowNewEventModal(false);
        resetAppointmentForm();
        // Refetch appointments to update the calendar
        window.location.reload(); // Temporary solution - ideally use query invalidation
      } else {
        console.error('Erro ao criar agendamento');
      }
    } catch (error) {
      console.error('Erro ao criar agendamento:', error);
    }
  };

  // Converter appointments reais para o formato do calendário (usado por todas as visualizações)
  const realCalendarEvents = appointmentsData ? (appointmentsData as any[]).map((appointment: any) => {
    // Usar appointment_time se scheduledAt não estiver disponível
    const appointmentDateStr = appointment.scheduledAt || appointment.appointment_time;
    const appointmentDate = new Date(appointmentDateStr);
    const appointmentDay = appointmentDate.getDate();
    const appointmentMonth = appointmentDate.getMonth();
    const appointmentYear = appointmentDate.getFullYear();
    const appointmentHour = appointmentDate.getHours();
    const appointmentMinutes = appointmentDate.getMinutes();

    // Buscar dados relacionados
    const professional = (professionalsData as any[]).find((p: any) => p.id === appointment.professionalId);
    const service = (servicesData as any[]).find((s: any) => s.id === appointment.serviceId);
    const customer = (customersData as any[]).find((c: any) => c.id === appointment.customerId);

    const event = {
      id: appointment.id,
      date: appointmentDay,
      month: appointmentMonth,
      year: appointmentYear,
      hour: appointmentHour,
      time: `${appointmentHour.toString().padStart(2, '0')}:${appointmentMinutes.toString().padStart(2, '0')}`,
      customerName: appointment.customerName || customer?.name || 'Cliente não encontrado',
      professionalName: professional?.name || 'Profissional não encontrado',
      serviceName: service?.name || 'Serviço não encontrado',
      color: professional?.color || '#A78BFA',
      status: appointment.status,
      duration: appointment.duration || 60,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      serviceId: appointment.serviceId,
      professionalId: appointment.professionalId
    };

    console.log('DEBUG - Processing appointment:', {
      original: appointmentDateStr,
      parsed: appointmentDate,
      day: appointmentDay,
      month: appointmentMonth,
      year: appointmentYear,
      hour: appointmentHour,
      customerName: event.customerName,
      professionalName: event.professionalName,
      isValidDate: !isNaN(appointmentDate.getTime())
    });

    return event;
  }) : [];

  // Debug: Log dos eventos para verificar se estão sendo carregados
  console.log('DEBUG - appointmentsData:', appointmentsData?.length, appointmentsData);
  console.log('DEBUG - realCalendarEvents:', realCalendarEvents.length, realCalendarEvents);
  console.log('DEBUG - professionalsData:', professionalsData?.length);
  console.log('DEBUG - currentMonth/Year/selectedDay:', currentMonth, currentYear, selectedDay);

  // Teste de data simples
  const testDate = new Date('2025-07-02T02:48:40.497Z');
  console.log('DEBUG - Test date parsing:', {
    original: '2025-07-02T02:48:40.497Z',
    parsed: testDate,
    day: testDate.getDate(),
    month: testDate.getMonth(),
    year: testDate.getFullYear(),
    hour: testDate.getHours()
  });

  // Filtrar eventos para o dia selecionado para debug
  const selectedDayEventsDebug = realCalendarEvents.filter((event: any) =>
    event.date === selectedDay &&
    event.month === currentMonth &&
    event.year === currentYear
  );
  console.log('DEBUG - Events for selected day:', selectedDayEventsDebug);

  // Filtrar eventos para o dia 2 especificamente
  const day2Events = realCalendarEvents.filter((event: any) =>
    event.date === 2 &&
    event.month === 6 && // Julho é mês 6 (0-based)
    event.year === 2025
  );
  console.log('DEBUG - Events for day 2 July 2025:', day2Events);

  const renderWeekView = () => {
    // Calcular a semana atual baseada no selectedDay, currentMonth e currentYear
    const currentDate = new Date(currentYear, currentMonth, selectedDay);
    const dayOfWeek = currentDate.getDay(); // 0 = domingo, 1 = segunda, etc.

    // Calcular o início da semana (domingo)
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - dayOfWeek);

    // Gerar os 7 dias da semana
    const currentWeek = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      return day.getDate();
    });

    const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const hours = Array.from({ length: 24 }, (_, i) => i); // 0h às 23h

    // Funções de navegação da semana
    const navigateWeek = (direction: 'prev' | 'next') => {
      const currentDate = new Date(currentYear, currentMonth, selectedDay);
      const newDate = new Date(currentDate);

      if (direction === 'prev') {
        newDate.setDate(currentDate.getDate() - 7);
      } else {
        newDate.setDate(currentDate.getDate() + 7);
      }

      setSelectedDay(newDate.getDate());
      setCurrentMonth(newDate.getMonth());
      setCurrentYear(newDate.getFullYear());
    };

    // Calcular período da semana para exibição
    const startOfWeekDate = new Date(currentYear, currentMonth, selectedDay);
    startOfWeekDate.setDate(startOfWeekDate.getDate() - startOfWeekDate.getDay());
    const endOfWeekDate = new Date(startOfWeekDate);
    endOfWeekDate.setDate(startOfWeekDate.getDate() + 6);

    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const weekPeriod = `${startOfWeekDate.getDate()} ${monthNames[startOfWeekDate.getMonth()].slice(0, 3)} - ${endOfWeekDate.getDate()} ${monthNames[endOfWeekDate.getMonth()].slice(0, 3)} ${endOfWeekDate.getFullYear()}`;

    return (
      <div className="bg-white overflow-x-auto">
        {/* Barra de navegação da semana */}
        <div className="border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateWeek('prev')}
              className="flex items-center space-x-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </Button>

            <h2 className="text-lg font-semibold text-gray-900">
              Semana de {weekPeriod}
            </h2>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateWeek('next')}
              className="flex items-center space-x-2"
            >
              Próximo
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="min-w-[800px]">
          {/* Cabeçalho da semana */}
          <div className="grid grid-cols-8 border-b border-gray-200">
            <div className="p-3 text-center text-sm font-medium text-gray-500"></div>
            {daysOfWeek.map((day, index) => (
              <div key={day} className="p-3 text-center border-l border-gray-200">
                <div className="text-sm font-medium text-gray-500">{day}</div>
                <div className={`text-2xl font-bold mt-1 ${currentWeek[index] === selectedDay ? 'text-blue-600' : 'text-gray-800'}`}>
                  {currentWeek[index]}
                </div>
              </div>
            ))}
          </div>

          {/* Grade horária */}
          <div className="grid grid-cols-8">
            {hours.map(hour => (
              <div key={hour} className="contents">
                <div className="p-2 text-right text-sm text-gray-500 border-b border-gray-100">
                  {hour}:00
                </div>
                {currentWeek.map((day, dayIndex) => {
                  // Filtrar eventos do dia e hora específicos
                  // Calcular o mês correto para este dia da semana
                  const dayDate = new Date(startOfWeek);
                  dayDate.setDate(startOfWeek.getDate() + dayIndex);
                  const dayMonth = dayDate.getMonth();
                  const dayYear = dayDate.getFullYear();

                  const dayEvents = realCalendarEvents.filter((event: any) => {
                    const matches = event.date === day &&
                      event.month === dayMonth &&
                      event.year === dayYear &&
                      event.hour === hour;

                    if (day === 2 && hour === 2) { // Debug para dia 2, hora 2
                      console.log('DEBUG - Week view filtering:', {
                        day, hour, dayMonth, dayYear,
                        event: { date: event.date, month: event.month, year: event.year, hour: event.hour },
                        matches
                      });
                    }

                    return matches;
                    // Temporariamente removendo filtro de profissionais para debug
                    // && professionalsState.find(p => p.name === event.professionalName)?.selected
                  });

                  return (
                    <div
                      key={`${day}-${hour}`}
                      className="h-20 border-l border-b border-gray-100 p-1 relative cursor-pointer hover:bg-gray-50 group"
                      onClick={() => openNewEventModal(day, hour)}
                    >
                      {/* Área dos eventos */}
                      <div className="h-full flex flex-col">
                        <div className="flex-1 space-y-1 overflow-hidden">
                          {(() => {
                            const organizedEvents = organizeEventsInColumns(dayEvents);
                            const visibleEvents = organizedEvents.slice(0, 2);

                            return visibleEvents.map((event: any, index: number) => (
                              <div
                                key={event.id}
                                className="p-1.5 rounded text-xs font-medium text-gray-800 cursor-pointer hover:opacity-80 transition-opacity"
                                style={{
                                  backgroundColor: `${event.color}25`,
                                  borderLeft: `3px solid ${event.color}`
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedEvent(event);
                                }}
                              >
                                <div className="font-semibold truncate">{event.time} - {event.customerName}</div>
                              </div>
                            ));
                          })()}
                        </div>

                        {/* Contador fixo no final */}
                        {dayEvents.length > 2 && (
                          <div className="mt-auto">
                            <div
                              className="text-xs text-blue-600 font-semibold bg-blue-50 px-1 py-0.5 rounded text-center cursor-pointer hover:bg-blue-100 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDay(day);
                                setViewMode("day");
                              }}
                            >
                              +{dayEvents.length - 2}
                            </div>
                          </div>
                        )}
                      </div>

                      {dayEvents.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Plus className="w-4 h-4 text-green-600" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i); // 0h às 23h

    // Funções de navegação do dia
    const navigateDay = (direction: 'prev' | 'next') => {
      const currentDate = new Date(currentYear, currentMonth, selectedDay);
      const newDate = new Date(currentDate);

      if (direction === 'prev') {
        newDate.setDate(currentDate.getDate() - 1);
      } else {
        newDate.setDate(currentDate.getDate() + 1);
      }

      setSelectedDay(newDate.getDate());
      setCurrentMonth(newDate.getMonth());
      setCurrentYear(newDate.getFullYear());
    };

    // Formatar data completa para exibição
    const currentDate = new Date(currentYear, currentMonth, selectedDay);
    const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const dayName = dayNames[currentDate.getDay()];
    const fullDate = `${dayName}, ${selectedDay} de ${monthNames[currentMonth]} ${currentYear}`;

    // Filtrar eventos do dia selecionado
    const selectedDayEvents = realCalendarEvents.filter((event: any) => {
      const matches = event.date === selectedDay &&
        event.month === currentMonth &&
        event.year === currentYear;

      console.log('DEBUG - Day view filtering:', {
        selectedDay, currentMonth, currentYear,
        event: { date: event.date, month: event.month, year: event.year },
        matches
      });

      return matches;
      // Temporariamente removendo filtro de profissionais para debug
      // && professionalsState.find(p => p.name === event.professionalName)?.selected
    });

    console.log('DEBUG - Selected day events:', selectedDayEvents.length, selectedDayEvents);

    return (
      <div className="bg-white">
        {/* Barra de navegação do dia */}
        <div className="border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateDay('prev')}
              className="flex items-center space-x-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </Button>

            <h2 className="text-lg font-semibold text-gray-900">
              {fullDate}
            </h2>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateDay('next')}
              className="flex items-center space-x-2"
            >
              Próximo
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="border-b border-gray-200 p-6 text-center">
          <h2 className="text-3xl font-bold text-gray-800">Dia {selectedDay}</h2>
          <p className="text-gray-500 mt-1">{monthNames[currentMonth]} {currentYear}</p>
        </div>

        <div className="max-w-2xl mx-auto">
          {hours.map(hour => {
            const hourEvents = selectedDayEvents.filter((event: any) =>
              event.hour === hour
            );

            return (
              <div key={hour} className="flex border-b border-gray-100">
                <div className="w-20 p-4 text-right text-sm text-gray-500 border-r border-gray-100">
                  {hour}:00
                </div>
                <div
                  className="flex-1 p-4 min-h-16 relative cursor-pointer hover:bg-gray-50 group"
                  onClick={() => openNewEventModal(selectedDay, hour)}
                >
                  <div className="space-y-3">
                    {hourEvents.map((event: any) => (
                      <div
                        key={event.id}
                        className="p-3 rounded-lg border-l-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                        style={{
                          backgroundColor: `${event.color}20`,
                          borderLeftColor: event.color
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvent(event);
                        }}
                      >
                        <div className="font-bold text-gray-800">{event.time} - {event.customerName}</div>
                        <div className="text-sm text-gray-600 mt-1">{event.professionalName}</div>
                        <div className="text-sm text-gray-500">{event.serviceName}</div>
                      </div>
                    ))}
                  </div>

                  {hourEvents.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="text-sm text-gray-400">Clique para agendar</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderCalendarGrid = () => {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
    const calendarDays = [];
    
    // Adicionar células vazias para os dias antes do primeiro dia do mês
    for (let i = 0; i < firstDayOfWeek; i++) {
      calendarDays.push(<div key={`empty-${i}`} className="h-32 border border-gray-200"></div>);
    }
    
    // Adicionar os dias do mês
    for (let day = 1; day <= daysInMonth; day++) {
      const dayEvents = realCalendarEvents.filter((event: any) =>
        event.date === day
        // Temporariamente removendo filtro de profissionais para debug
        // && professionalsState.find(p => p.name === event.professionalName)?.selected
      );
      
      const isSelected = day === selectedDay;
      
      calendarDays.push(
        <div
          key={day}
          className={`h-32 border border-gray-200 p-2 relative cursor-pointer hover:bg-gray-50 group ${
            isSelected ? 'border-blue-600 border-2' : ''
          }`}
          onClick={() => {
            setSelectedDay(day);
            if (dayEvents.length === 0) {
              openNewEventModal(day, 9);
            }
          }}
        >
          <div className="text-sm text-gray-600 font-medium mb-1">{day}</div>
          {/* Área dos eventos */}
          <div className="flex-1 space-y-1 overflow-hidden">
            {(() => {
              const organizedEvents = organizeEventsInColumns(dayEvents);
              const visibleEvents = organizedEvents.slice(0, 2);

              return (
                <>
                  {visibleEvents.map((event: any, index: number) => (
                    <div
                      key={event.id}
                      className="p-1.5 rounded text-xs font-medium text-gray-800 cursor-pointer hover:opacity-80 transition-opacity"
                      style={{
                        backgroundColor: `${event.color}25`,
                        borderLeft: `3px solid ${event.color}`
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEvent(event);
                      }}
                    >
                      <div className="font-semibold truncate">{event.time} - {event.customerName}</div>
                    </div>
                  ))}

                  {/* Contador como bloco igual ao super-admin */}
                  {dayEvents.length > 2 && (
                    <div
                      className="p-1 rounded text-xs font-medium text-blue-600 cursor-pointer hover:text-blue-800 transition-colors"
                      style={{
                        backgroundColor: '#dbeafe',
                        borderLeft: '3px solid #2563eb'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDay(day);
                        setViewMode("day"); // Mudar para visualização do dia
                      }}
                    >
                      +{dayEvents.length - 2} mais
                    </div>
                  )}
                </>
              );
            })()}
          </div>
          <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                openNewEventModal(day, 9);
              }}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>
      );
    }
    
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="grid grid-cols-7 gap-0">
          {weekDays.map(day => (
            <div key={day} className="p-3 text-center text-sm font-medium text-gray-500 border-b border-gray-200">
              {day}
            </div>
          ))}
          {calendarDays}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full">
      {/* Área Principal do Calendário */}
      <div className="flex-1 flex flex-col">
        {/* Barra de navegação da agenda */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex space-x-2">
              {(["month", "week", "day"] as ViewMode[]).map((mode) => (
                <Button
                  key={mode}
                  variant={viewMode === mode ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode(mode)}
                  className="rounded-md"
                >
                  {mode === "month" ? "Mês" : mode === "week" ? "Semana" : "Dia"}
                </Button>
              ))}
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateMonth('prev')}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <h2 className="text-lg font-semibold text-gray-900 min-w-[200px] text-center">
                  {monthNames[currentMonth]} {currentYear}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateMonth('next')}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              
              <Button
                onClick={() => openNewEventModal(selectedDay, 9)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Agendamento
              </Button>
            </div>
          </div>
        </div>

        {/* Grade do calendário */}
        <div className="flex-1 overflow-auto p-4">
          {viewMode === "month" && renderCalendarGrid()}
          {viewMode === "week" && renderWeekView()}
          {viewMode === "day" && renderDayView()}
        </div>
      </div>

      {/* Painel Direito - Profissionais & Filtros */}
      <div className="hidden lg:flex w-64 bg-white border-l border-gray-200 flex-col">
        {/* Campo de busca */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar profissional"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Lista de Profissionais */}
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Profissionais</h3>

          {professionalsLoading ? (
            <div className="text-center py-4">
              <div className="text-sm text-gray-500">Carregando profissionais...</div>
            </div>
          ) : professionalsState.length === 0 ? (
            <div className="text-center py-4">
              <div className="text-sm text-gray-500">Nenhum profissional encontrado</div>
            </div>
          ) : (
            <div className="space-y-2">
              {professionalsState
                .filter(prof => prof.name.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((professional) => (
                <div key={professional.id} className="flex items-center space-x-3">
                  <Checkbox
                    checked={professional.selected}
                    onCheckedChange={(checked) => {
                      setProfessionalsState(prev => 
                        prev.map(p => 
                          p.id === professional.id 
                            ? { ...p, selected: checked }
                            : p
                        )
                      );
                    }}
                  />
                  <div className="flex items-center space-x-2 flex-1">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: professional.color }}
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        {professional.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {professional.specialtyName}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Detalhes do Evento */}
      {selectedEvent && (
        <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Detalhes do Agendamento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <strong>Cliente:</strong> {selectedEvent.customerName}
              </div>
              <div>
                <strong>Profissional:</strong> {selectedEvent.professionalName}
              </div>
              <div>
                <strong>Serviço:</strong> {selectedEvent.serviceName}
              </div>
              <div>
                <strong>Data:</strong> {selectedEvent.date}/{currentMonth + 1}/{currentYear}
              </div>
              <div>
                <strong>Horário:</strong> {selectedEvent.time}
              </div>
              <div>
                <strong>Status:</strong> 
                <Badge variant={selectedEvent.status === 'confirmado' ? 'default' : 'secondary'}>
                  {selectedEvent.status}
                </Badge>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal de Novo Agendamento */}
      {showNewEventModal && (
        <Dialog open={showNewEventModal} onOpenChange={setShowNewEventModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Novo Agendamento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Informações do Cliente */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-900">Dados do Cliente</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome do Cliente *
                  </label>
                  <Input
                    value={newAppointment.customerName}
                    onChange={(e) => setNewAppointment(prev => ({ ...prev, customerName: e.target.value }))}
                    placeholder="Nome completo"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={newAppointment.customerEmail}
                    onChange={(e) => setNewAppointment(prev => ({ ...prev, customerEmail: e.target.value }))}
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefone
                  </label>
                  <Input
                    value={newAppointment.customerPhone}
                    onChange={(e) => setNewAppointment(prev => ({ ...prev, customerPhone: e.target.value }))}
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>

              {/* Informações do Agendamento */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-900">Agendamento</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Profissional *
                  </label>
                  <select
                    value={newAppointment.professionalId}
                    onChange={(e) => setNewAppointment(prev => ({ ...prev, professionalId: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Selecione um profissional</option>
                    {(professionalsData as any[]).map((prof: any) => (
                      <option key={prof.id} value={prof.id}>
                        {prof.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Serviço *
                  </label>
                  <select
                    value={newAppointment.serviceId}
                    onChange={(e) => setNewAppointment(prev => ({ ...prev, serviceId: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Selecione um serviço</option>
                    {(servicesData as any[]).map((service: any) => (
                      <option key={service.id} value={service.id}>
                        {service.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data *
                    </label>
                    <Input
                      type="date"
                      value={newAppointment.date}
                      onChange={(e) => setNewAppointment(prev => ({ ...prev, date: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Horário *
                    </label>
                    <Input
                      type="time"
                      value={newAppointment.time}
                      onChange={(e) => setNewAppointment(prev => ({ ...prev, time: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duração (minutos)
                  </label>
                  <Input
                    type="number"
                    value={newAppointment.duration}
                    onChange={(e) => setNewAppointment(prev => ({ ...prev, duration: parseInt(e.target.value) || 60 }))}
                    min="15"
                    step="15"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Observações
                  </label>
                  <textarea
                    value={newAppointment.notes}
                    onChange={(e) => setNewAppointment(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="Observações adicionais..."
                  />
                </div>
              </div>

              {/* Botões */}
              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowNewEventModal(false);
                    resetAppointmentForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={createAppointment}
                  disabled={!newAppointment.customerName || !newAppointment.professionalId || !newAppointment.serviceId}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Criar Agendamento
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
