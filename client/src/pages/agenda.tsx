import React, { useState, useMemo, useEffect } from "react";
import { Calendar, Search, Plus, Settings, Users, Briefcase, Building2, Bot, UserCog, X, Menu, LogOut, Clock, Phone, Mail, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLogout } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO, isToday, isTomorrow, addDays, startOfWeek, endOfWeek, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

type ViewMode = "month" | "week" | "day" | "list";

interface Professional {
  id: string;
  name: string;
  specialtyName?: string;
  color: string;
  selected: boolean;
}

interface Appointment {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  professionalName: string;
  serviceName: string;
  specialtyName: string;
  scheduledAt: string;
  duration: number;
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed';
  notes?: string;
}

interface AgendaEvent {
  id: string;
  time: string;
  customerName: string;
  professionalName: string;
  serviceName: string;
  color: string;
  date: number;
  status: string;
  duration: number;
}

export default function Agenda() {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProfessionals, setSelectedProfessionals] = useState<Set<string>>(new Set());
  const [selectedEvent, setSelectedEvent] = useState<Appointment | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedProfessional, setSelectedProfessional] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const logout = useLogout();

  // Fetch real data from API
  const { data: professionalsData = [], isLoading: professionalsLoading } = useQuery({
    queryKey: ['/api/professionals'],
  });

  const { data: specialtiesData = [] } = useQuery({
    queryKey: ['/api/specialties'],
  });

  const { data: appointmentsData = [], isLoading: appointmentsLoading, refetch: refetchAppointments } = useQuery({
    queryKey: ['/api/appointments'],
  });

  const { data: servicesData = [] } = useQuery({
    queryKey: ['/api/services'],
  });

  const { data: customersData = [] } = useQuery({
    queryKey: ['/api/customers'],
  });

  // Transform data for the agenda with proper typing
  const professionals: Professional[] = useMemo(() => {
    const profs = professionalsData as any[];
    const specs = specialtiesData as any[];

    if (!profs?.length) return [];

    return profs.map((prof: any, index: number) => {
      const specialty = specs.find((s: any) => s.id === prof.specialtyId);
      const colors = ['#A78BFA', '#86EFAC', '#FB7185', '#60A5FA', '#FBBF24', '#F87171'];

      return {
        id: prof.id,
        name: prof.name,
        specialtyName: specialty?.name || 'Profissional',
        color: specialty?.color || colors[index % colors.length],
        selected: index < 3 // Select first 3 by default
      };
    });
  }, [professionalsData, specialtiesData]);

  // Transform appointments data
  const appointments: Appointment[] = useMemo(() => {
    const apts = appointmentsData as any[];
    const profs = professionalsData as any[];
    const services = servicesData as any[];
    const customers = customersData as any[];
    const specs = specialtiesData as any[];

    if (!apts?.length) return [];

    return apts.map((apt: any) => {
      const professional = profs.find((p: any) => p.id === apt.professionalId);
      const service = services.find((s: any) => s.id === apt.serviceId);
      const customer = customers.find((c: any) => c.id === apt.customerId);
      const specialty = specs.find((s: any) => s.id === professional?.specialtyId);

      return {
        id: apt.id,
        customerName: customer?.name || 'Cliente',
        customerEmail: customer?.email || '',
        customerPhone: customer?.phone || '',
        professionalName: professional?.name || 'Profissional',
        serviceName: service?.name || 'Serviço',
        specialtyName: specialty?.name || 'Especialidade',
        scheduledAt: apt.scheduledAt,
        duration: apt.duration || 60,
        status: apt.status || 'pending',
        notes: apt.notes
      };
    });
  }, [appointmentsData, professionalsData, servicesData, customersData, specialtiesData]);

  // Update appointment status
  const updateAppointmentStatus = async (appointmentId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        refetchAppointments();
      }
    } catch (error) {
      console.error('Erro ao atualizar agendamento:', error);
    }
  };

  // Initialize selected professionals when data loads
  React.useEffect(() => {
    if (professionals.length > 0 && selectedProfessionals.size === 0) {
      const initialSelection = new Set(professionals.filter((p: Professional) => p.selected).map((p: Professional) => p.id));
      setSelectedProfessionals(initialSelection);
    }
  }, [professionals, selectedProfessionals.size]);

  // Filter appointments by date and filters
  const filteredAppointments = useMemo(() => {
    let filtered = appointments;

    // Filter by professional
    if (selectedProfessional !== 'all') {
      filtered = filtered.filter(apt => {
        const professional = professionalsData.find((p: any) => p.id === apt.professionalName);
        return professional?.id === selectedProfessional;
      });
    }

    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(apt => apt.status === selectedStatus);
    }

    // Filter by date for list view
    if (viewMode === 'list') {
      const today = startOfDay(selectedDate);
      const tomorrow = endOfDay(selectedDate);

      filtered = filtered.filter(apt => {
        const aptDate = parseISO(apt.scheduledAt);
        return aptDate >= today && aptDate <= tomorrow;
      });
    }

    return filtered.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  }, [appointments, selectedProfessional, selectedStatus, selectedDate, viewMode, professionalsData]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Confirmado';
      case 'pending': return 'Pendente';
      case 'cancelled': return 'Cancelado';
      case 'completed': return 'Concluído';
      default: return status;
    }
  };

  const getDateLabel = (date: Date) => {
    if (isToday(date)) return 'Hoje';
    if (isTomorrow(date)) return 'Amanhã';
    return format(date, "dd 'de' MMMM", { locale: ptBR });
  };

  const sidebarItems = [
    { section: "PRINCIPAL", items: [{ name: "Agenda", icon: Calendar, active: true }] },
    {
      section: "GERENCIAMENTO",
      items: [
        { name: "Profissionais", icon: Users, active: false },
        { name: "Serviços", icon: Briefcase, active: false },
        { name: "Clientes", icon: UserCog, active: false }
      ]
    },
    { section: "SISTEMA", items: [{ name: "Configurações", icon: Settings, active: false }] }
  ];

  // Render list view for appointments
  const renderListView = () => {
    if (appointmentsLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando agendamentos...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Agenda da Empresa</h1>
            <p className="text-gray-600">Visualize e gerencie os agendamentos da sua empresa</p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">Filtros:</span>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 flex-1">
                <Select value={selectedProfessional} onValueChange={setSelectedProfessional}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Profissional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os profissionais</SelectItem>
                    {professionals.map((prof) => (
                      <SelectItem key={prof.id} value={prof.id}>
                        {prof.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="confirmed">Confirmado</SelectItem>
                    <SelectItem value="completed">Concluído</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Date Navigation */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => setSelectedDate(addDays(selectedDate, -1))}
              >
                ← Anterior
              </Button>

              <div className="text-center">
                <h2 className="text-xl font-semibold">
                  {getDateLabel(selectedDate)}
                </h2>
                <p className="text-sm text-gray-600">
                  {format(selectedDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              </div>

              <Button
                variant="outline"
                onClick={() => setSelectedDate(addDays(selectedDate, 1))}
              >
                Próximo →
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Appointments List */}
        <div className="grid gap-4">
          {filteredAppointments.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nenhum agendamento encontrado
                </h3>
                <p className="text-gray-600">
                  Não há agendamentos para {getDateLabel(selectedDate).toLowerCase()}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredAppointments.map((appointment) => (
              <Card key={appointment.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div className="flex-1 space-y-3">
                      {/* Time and Status */}
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 text-blue-600">
                          <Clock className="h-4 w-4" />
                          <span className="font-medium">
                            {format(parseISO(appointment.scheduledAt), 'HH:mm')} - {format(addDays(parseISO(appointment.scheduledAt), 0), 'HH:mm')}
                          </span>
                        </div>
                        <Badge className={getStatusColor(appointment.status)}>
                          {getStatusText(appointment.status)}
                        </Badge>
                      </div>

                      {/* Customer Info */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <UserCog className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">{appointment.customerName}</span>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-sm text-gray-600">
                          {appointment.customerPhone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              <span>{appointment.customerPhone}</span>
                            </div>
                          )}
                          {appointment.customerEmail && (
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              <span>{appointment.customerEmail}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Service Info */}
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-500">Serviço:</span>
                            <span className="ml-2 font-medium">{appointment.serviceName}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Especialidade:</span>
                            <span className="ml-2 font-medium">{appointment.specialtyName}</span>
                          </div>
                          <div className="sm:col-span-2">
                            <span className="text-gray-500">Profissional:</span>
                            <span className="ml-2 font-medium">{appointment.professionalName}</span>
                          </div>
                        </div>
                      </div>

                      {/* Notes */}
                      {appointment.notes && (
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Observações:</span>
                          <p className="mt-1">{appointment.notes}</p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      {appointment.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            className="w-full sm:w-auto"
                            onClick={() => updateAppointmentStatus(appointment.id, 'confirmed')}
                          >
                            Confirmar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full sm:w-auto"
                            onClick={() => updateAppointmentStatus(appointment.id, 'cancelled')}
                          >
                            Cancelar
                          </Button>
                        </>
                      )}
                      {appointment.status === 'confirmed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full sm:w-auto"
                          onClick={() => updateAppointmentStatus(appointment.id, 'completed')}
                        >
                          Concluir
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Summary */}
        {filteredAppointments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Resumo do Dia</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {filteredAppointments.length}
                  </div>
                  <div className="text-sm text-gray-600">Total</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {filteredAppointments.filter(a => a.status === 'confirmed').length}
                  </div>
                  <div className="text-sm text-gray-600">Confirmados</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-600">
                    {filteredAppointments.filter(a => a.status === 'pending').length}
                  </div>
                  <div className="text-sm text-gray-600">Pendentes</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-600">
                    {filteredAppointments.filter(a => a.status === 'completed').length}
                  </div>
                  <div className="text-sm text-gray-600">Concluídos</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const toggleProfessional = (id: string) => {
    setSelectedProfessionals(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const renderWeekView = () => {
    const currentWeek = [13, 14, 15, 16, 17, 18, 19]; // Example week
    const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8:00 to 19:00

    return (
      <div className="bg-white">
        {/* Week header */}
        <div className="grid grid-cols-8 border-b border-gray-200 overflow-x-auto min-w-[600px]">
          <div className="p-2 lg:p-3 text-center text-xs lg:text-sm font-medium text-gray-500"></div>
          {daysOfWeek.map((day, index) => (
            <div key={day} className="p-2 lg:p-3 text-center border-l border-gray-200">
              <div className="text-xs lg:text-sm font-medium text-gray-500">
                <span className="hidden sm:inline">{day}</span>
                <span className="sm:hidden">{day.charAt(0)}</span>
              </div>
              <div className={`text-lg lg:text-2xl font-bold mt-1 ${currentWeek[index] === selectedDay ? 'text-blue-600' : 'text-gray-800'}`}>
                {currentWeek[index]}
              </div>
            </div>
          ))}
        </div>

        {/* Week grid */}
        <div className="grid grid-cols-8 min-w-[600px] overflow-x-auto">
          {hours.map(hour => (
            <div key={hour} className="contents">
              <div className="p-1 lg:p-2 text-right text-xs lg:text-sm text-gray-500 border-b border-gray-100">
                {hour}:00
              </div>
              {currentWeek.map((day, dayIndex) => {
                const dayEvents = agendaEvents.filter((event: AgendaEvent) => 
                  event.date === day && 
                  parseInt(event.time.split(':')[0]) === hour &&
                  selectedProfessionals.has(professionals.find((p: Professional) => p.name === event.professionalName)?.id || '')
                );
                
                return (
                  <div 
                    key={`${day}-${hour}`}
                    className="h-16 border-l border-b border-gray-100 p-1 relative cursor-pointer hover:bg-gray-50 group"
                    onClick={() => setSelectedDay(day)}
                  >
                    {dayEvents.map(event => (
                      <div 
                        key={event.id}
                        className="w-full p-1 rounded text-xs font-bold text-gray-800 border-l-4 h-full"
                        style={{ 
                          backgroundColor: `${event.color}40`,
                          borderLeftColor: event.color 
                        }}
                      >
                        {event.customerName}
                      </div>
                    ))}
                    
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
    );
  };

  const renderDayView = () => {
    const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8:00 to 19:00
    const selectedDayEvents = agendaEvents.filter((event: AgendaEvent) => 
      event.date === selectedDay && 
      selectedProfessionals.has(professionals.find((p: Professional) => p.name === event.professionalName)?.id || '')
    );

    return (
      <div className="bg-white">
        {/* Day header */}
        <div className="border-b border-gray-200 p-4 lg:p-6 text-center">
          <h2 className="text-xl lg:text-3xl font-bold text-gray-800">Dia {selectedDay}</h2>
          <p className="text-gray-500 mt-1">Janeiro 2025</p>
        </div>

        {/* Day schedule */}
        <div className="max-w-2xl mx-auto px-2 lg:px-0">
          {hours.map(hour => {
            const hourEvents = selectedDayEvents.filter(event => 
              parseInt(event.time.split(':')[0]) === hour
            );

            return (
              <div key={hour} className="flex border-b border-gray-100">
                <div className="w-16 lg:w-20 p-2 lg:p-4 text-right text-xs lg:text-sm text-gray-500 border-r border-gray-100">
                  {hour}:00
                </div>
                <div className="flex-1 p-2 lg:p-4 min-h-12 lg:min-h-16 relative cursor-pointer hover:bg-gray-50 group">
                  {hourEvents.map(event => (
                    <div 
                      key={event.id}
                      className="mb-2 p-2 lg:p-3 rounded-lg border-l-2 lg:border-l-4 shadow-sm"
                      style={{ 
                        backgroundColor: `${event.color}20`,
                        borderLeftColor: event.color 
                      }}
                    >
                      <div className="font-bold text-gray-800 text-sm lg:text-base">{event.time} - {event.customerName}</div>
                      <div className="text-xs lg:text-sm text-gray-600 mt-1">{event.professionalName}</div>
                    </div>
                  ))}
                  
                  {hourEvents.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Plus className="w-6 h-6 text-green-600" />
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
    const daysInMonth = 31;
    const firstDayOfWeek = 6; // Assuming first day starts on Saturday for this example
    const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    
    const calendarDays = [];
    
    // Add empty cells for days before the first day of month
    for (let i = 0; i < firstDayOfWeek; i++) {
      calendarDays.push(<div key={`empty-${i}`} className="h-32 border border-gray-200"></div>);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayEvents = agendaEvents.filter((event: AgendaEvent) => 
        event.date === day && selectedProfessionals.has(professionals.find((p: Professional) => p.name === event.professionalName)?.id || '')
      );
      
      const isSelected = day === selectedDay;
      
      calendarDays.push(
        <div 
          key={day}
          className={`h-20 sm:h-24 lg:h-32 border border-gray-200 p-1 sm:p-2 relative cursor-pointer hover:bg-gray-50 group ${
            isSelected ? 'border-purple-600 border-2' : ''
          }`}
          onClick={() => setSelectedDay(day)}
        >
          <div className="text-xs sm:text-sm text-gray-600 font-medium mb-1">{day}</div>
          
          {dayEvents.map(event => (
            <div 
              key={event.id}
              className="mb-1 p-0.5 sm:p-1 rounded text-xs font-bold text-gray-800 border-l-2 sm:border-l-4 cursor-pointer hover:opacity-80 transition-opacity truncate"
              style={{ 
                backgroundColor: `${event.color}40`,
                borderLeftColor: event.color 
              }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedEvent(event);
              }}
            >
              <span className="hidden sm:inline">{event.time} - {event.customerName}</span>
              <span className="sm:hidden">{event.time}</span>
            </div>
          ))}
          
          {dayEvents.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Plus className="w-6 h-6 text-green-600" />
            </div>
          )}
        </div>
      );
    }
    
    return (
      <div className="bg-white">
        {/* Calendar header */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {daysOfWeek.map(day => (
            <div key={day} className="p-1 sm:p-2 lg:p-3 text-center text-xs sm:text-sm font-medium text-gray-500 border-r border-gray-200 last:border-r-0">
              <span className="hidden sm:inline">{day}</span>
              <span className="sm:hidden">{day.charAt(0)}</span>
            </div>
          ))}
        </div>
        
        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {calendarDays}
        </div>
      </div>
    );
  };

  const filteredProfessionals = professionals.filter((prof: Professional) =>
    prof.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prof.specialtyName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Componente Sidebar reutilizável
  const SidebarContent = ({ onClose }: { onClose?: () => void }) => (
    <div className="flex flex-col h-full">
      <div className="p-4 flex-1">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-800">SempreCheioApp</h1>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose} className="lg:hidden">
              <X className="w-5 h-5" />
            </Button>
          )}
        </div>
        
        {sidebarItems.map((section, sectionIndex) => (
          <div key={section.section} className={sectionIndex > 0 ? "mt-6 pt-4 border-t border-gray-300" : ""}>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">
              {section.section}
            </h3>
            
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.name}
                  className={`flex items-center px-3 py-2 mb-1 rounded-md cursor-pointer transition-colors ${
                    (item as any).active 
                      ? 'bg-white text-gray-800 font-bold shadow-sm' 
                      : 'text-gray-600 hover:bg-gray-200 hover:text-gray-800'
                  }`}
                  onClick={onClose}
                >
                  <Icon className="w-4 h-4 mr-3" />
                  <span className="text-sm">{item.name}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      
      {/* Botão de Logout */}
      <div className="p-4 border-t border-gray-300">
        <Button
          variant="ghost"
          className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={() => {
            logout.mutate();
            if (onClose) onClose();
          }}
          disabled={logout.isPending}
        >
          <LogOut className="w-4 h-4 mr-3" />
          <span className="text-sm">
            {logout.isPending ? "Saindo..." : "Sair"}
          </span>
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar Desktop */}
      <div className="hidden lg:block w-60 bg-gray-100 border-r border-gray-200 overflow-y-auto">
        <SidebarContent />
      </div>

      {/* Mobile Sidebar Sheet */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-60 bg-gray-100 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Menu de Navegação</SheetTitle>
          </SheetHeader>
          <SidebarContent onClose={() => setMobileMenuOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Área Central - Agenda */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header Mobile com título e menu */}
        <div className="lg:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setMobileMenuOpen(true)}
              className="p-1"
            >
              <Menu className="w-6 h-6" />
            </Button>
            <h1 className="text-lg font-bold text-gray-800">SempreCheioApp</h1>
          </div>
          <Button variant="ghost" size="sm">
            <Search className="w-5 h-5" />
          </Button>
        </div>

        {/* Barra de navegação da agenda */}
        <div className="bg-white border-b border-gray-200 p-3 lg:p-4">
          <div className="flex space-x-1 lg:space-x-2 overflow-x-auto">
            {(["list", "month", "week", "day"] as ViewMode[]).map((mode) => (
              <Button
                key={mode}
                variant={viewMode === mode ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode(mode)}
                className={`rounded-md whitespace-nowrap ${
                  viewMode === mode
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {mode === "list" && "Lista"}
                {mode === "month" && "Mês"}
                {mode === "week" && "Semana"}
                {mode === "day" && "Dia"}
              </Button>
            ))}
          </div>
        </div>

        {/* Grade do calendário */}
        <div className="flex-1 overflow-auto">
          {viewMode === "list" && renderListView()}
          {viewMode === "month" && renderCalendarGrid()}
          {viewMode === "week" && renderWeekView()}
          {viewMode === "day" && renderDayView()}
        </div>
      </div>

      {/* Painel Direito - Profissionais & Filtros */}
      <div className="hidden xl:flex w-64 bg-white border-l border-gray-200 flex-col">
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

        {/* Lista de profissionais */}
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-sm font-bold text-gray-800 mb-4">Profissionais</h3>
          
          <div className="space-y-3">
            {filteredProfessionals.map((professional: Professional) => (
              <div key={professional.id} className="flex items-center space-x-3">
                <Checkbox
                  checked={selectedProfessionals.has(professional.id)}
                  onCheckedChange={() => toggleProfessional(professional.id)}
                />
                
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                  style={{ backgroundColor: professional.color }}
                >
                  {professional.name.charAt(0)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium truncate ${
                    selectedProfessionals.has(professional.id) ? 'text-blue-600' : 'text-gray-800'
                  }`}>
                    {professional.name}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {professional.specialtyName}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Área de filtros */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-800">Filtros</h3>
            <button className="text-xs text-blue-600 hover:text-blue-800">
              Limpar todos
            </button>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox />
              <span className="text-sm text-gray-600">Corte de cabelo</span>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox />
              <span className="text-sm text-gray-600">Manicure</span>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox />
              <span className="text-sm text-gray-600">Massagem</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de detalhes do agendamento */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-md mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">Detalhes do Agendamento</DialogTitle>
            <DialogDescription className="text-sm">
              Visualize e gerencie as informações do agendamento selecionado.
            </DialogDescription>
          </DialogHeader>

          {selectedEvent && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <UserCog className="h-5 w-5 text-blue-600" />
                  <span className="font-medium">{selectedEvent.customerName}</span>
                </div>
                <Badge className={getStatusColor(selectedEvent.status)}>
                  {getStatusText(selectedEvent.status)}
                </Badge>
              </div>

              <div className="grid grid-cols-1 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Data e Horário:</span>
                  <p className="font-medium">
                    {format(parseISO(selectedEvent.scheduledAt), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>

                <div>
                  <span className="text-gray-500">Profissional:</span>
                  <p className="font-medium">{selectedEvent.professionalName}</p>
                </div>

                <div>
                  <span className="text-gray-500">Serviço:</span>
                  <p className="font-medium">{selectedEvent.serviceName}</p>
                </div>

                <div>
                  <span className="text-gray-500">Especialidade:</span>
                  <p className="font-medium">{selectedEvent.specialtyName}</p>
                </div>

                {selectedEvent.customerPhone && (
                  <div>
                    <span className="text-gray-500">Telefone:</span>
                    <p className="font-medium">{selectedEvent.customerPhone}</p>
                  </div>
                )}

                {selectedEvent.customerEmail && (
                  <div>
                    <span className="text-gray-500">Email:</span>
                    <p className="font-medium">{selectedEvent.customerEmail}</p>
                  </div>
                )}

                {selectedEvent.notes && (
                  <div>
                    <span className="text-gray-500">Observações:</span>
                    <p className="font-medium">{selectedEvent.notes}</p>
                  </div>
                )}
              </div>

              <div className="flex space-x-2 pt-4">
                {selectedEvent.status === 'pending' && (
                  <>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        updateAppointmentStatus(selectedEvent.id, 'confirmed');
                        setSelectedEvent(null);
                      }}
                    >
                      Confirmar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        updateAppointmentStatus(selectedEvent.id, 'cancelled');
                        setSelectedEvent(null);
                      }}
                    >
                      Cancelar
                    </Button>
                  </>
                )}
                {selectedEvent.status === 'confirmed' && (
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      updateAppointmentStatus(selectedEvent.id, 'completed');
                      setSelectedEvent(null);
                    }}
                  >
                    Marcar como Concluído
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}