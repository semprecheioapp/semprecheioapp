import React, { useState, useEffect } from "react";
import { Calendar, Search, Plus, Settings, Users, Briefcase, Building2, Bot, UserCog, Filter, Menu, X, LogOut, Edit, Trash2, Mail, Phone, ChevronLeft, ChevronRight, MessageSquare, Tag, Clock, User, Key, Shield, BarChart3, CreditCard } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import WhatsAppChannels from "./whatsapp-channels";
import AIAgent from "./ai-agent";
import Configuracoes from "./configuracoes";
import ConfigProfissionais from "./config-profissionais";
import { CompaniesManagement } from "@/components/CompaniesManagement";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResponsiveGrid, ResponsiveMetricCard, ResponsiveChartCard, ResponsiveContainer } from "@/components/ui/responsive-grid";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { useResponsive } from "@/hooks/use-responsive";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLogout } from "@/lib/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";

type ViewMode = "month" | "week" | "day";

interface Professional {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  color: string;
  selected: boolean;
}

interface AgendaEvent {
  id: string;
  time: string;
  customerName: string;
  customerPhone: string;
  professionalName: string;
  professionalId: string;
  serviceName: string;
  serviceId: string;
  color: string;
  date: number;
  status: string;
  duration: number;
  startTime?: string;
  endTime?: string;
  scheduledAt?: Date;
  client?: string;
  professional?: string;
  service?: string;
}

const professionals: Professional[] = [
  { id: "1", name: "Ana Silva", role: "Esteticista", color: "#A78BFA", selected: true },
  { id: "2", name: "Carlos Santos", role: "Barbeiro", color: "#86EFAC", selected: true },
  { id: "3", name: "Marina Costa", role: "Designer de Sobrancelhas", color: "#FBBF24", selected: true },
  { id: "4", name: "João Oliveira", role: "Massagista", color: "#F87171", selected: false },
  { id: "5", name: "Lucia Ferreira", role: "Manicure", color: "#60A5FA", selected: true },
];

// Eventos reais vêm dos appointments confirmados via useMemo

// Filtros dinâmicos serão criados baseados nas especialidades reais

interface SuperAdminAgendaProps {
  isCompanyAdmin?: boolean;
  companyId?: string;
}

export default function SuperAdminAgenda({ isCompanyAdmin = false, companyId }: SuperAdminAgendaProps = {}) {
  const [activeSection, setActiveSection] = useState("Agenda");
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [selectedDay, setSelectedDay] = useState(new Date().getDate()); // Dia atual do sistema
  const [searchTerm, setSearchTerm] = useState("");
  const [professionalsState, setProfessionalsState] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<AgendaEvent | null>(null);
  const [showNewEventModal, setShowNewEventModal] = useState(false);
  const [filters, setFilters] = useState<any[]>([]);
  const [newEventData, setNewEventData] = useState({ date: 0, hour: 0 });
  const [appointmentForm, setAppointmentForm] = useState({
    client_id: "",
    professional_id: "",
    service_id: "",
    specialty_id: "",
    customer_id: "",
    availability_id: "",
    appointment_time: "",
    status: "confirmado",
    customer_name: "",
    customer_phone: ""
  });
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth()); // Mês atual do sistema
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear()); // Ano atual do sistema
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showProfessionalModal, setShowProfessionalModal] = useState(false);
  const [editingProfessional, setEditingProfessional] = useState<any>(null);
  const [selectedClientId, setSelectedClientId] = useState<string>("all");
  const [selectedClientIdServices, setSelectedClientIdServices] = useState<string>("all");
  const [selectedClientIdSpecialties, setSelectedClientIdSpecialties] = useState<string>("all");
  const [selectedClientIdCustomers, setSelectedClientIdCustomers] = useState<string>("all");
  const [selectedClientIdConfig, setSelectedClientIdConfig] = useState<string>("all");
  const [professionalForm, setProfessionalForm] = useState({
    name: "",
    email: "",
    phone: "",
    specialtyId: "",
    clientId: ""
  });
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [serviceForm, setServiceForm] = useState({
    name: "",
    category: "",
    description: "",
    duration: "",
    price: "",
    specialtyId: "",
    clientId: ""
  });
  const [showClientModal, setShowClientModal] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [clientForm, setClientForm] = useState({
    name: "",
    email: "",
    phone: "",
    serviceType: "",
    customServiceType: "",
    whatsappInstanceUrl: "",
    password: ""
  });
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [customerForm, setCustomerForm] = useState({
    name: "",
    email: "",
    phone: "",
    cpfCnpj: "",
    notes: "",
    clientId: ""
  });
  const [editingEvent, setEditingEvent] = useState<AgendaEvent | null>(null);
  const [showEditEventModal, setShowEditEventModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState<AgendaEvent | null>(null);
  
  // Estados para modal de confirmação de exclusão
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [professionalToDelete, setProfessionalToDelete] = useState<any>(null);
  const [showDeleteServiceConfirm, setShowDeleteServiceConfirm] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<any>(null);
  const [showSpecialtyModal, setShowSpecialtyModal] = useState(false);
  const [editingSpecialty, setEditingSpecialty] = useState<any>(null);
  const [specialtyForm, setSpecialtyForm] = useState({
    name: "",
    description: "",
    color: "#3B82F6",
    serviceId: ""
  });
  const [showDeleteSpecialtyConfirm, setShowDeleteSpecialtyConfirm] = useState(false);
  const [specialtyToDelete, setSpecialtyToDelete] = useState<any>(null);
  const [showDeleteClientConfirm, setShowDeleteClientConfirm] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<any>(null);
  
  const queryClientInstance = useQueryClient();
  const logout = useLogout();
  const { toast } = useToast();

  // Query para buscar profissionais reais
  const { data: professionalsData = [], isLoading: professionalsLoading } = useQuery({
    queryKey: ["/api/professionals", isCompanyAdmin ? companyId : "all"],
    queryFn: async () => {
      const url = isCompanyAdmin && companyId
        ? `/api/professionals?client_id=${companyId}`
        : "/api/professionals";
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch professionals');
      return response.json();
    },
    enabled: activeSection === "Profissionais" || activeSection === "Agenda"
  });

  // Query para buscar especialidades
  const { data: specialtiesData = [], isLoading: specialtiesLoading } = useQuery({
    queryKey: ["/api/specialties", isCompanyAdmin ? companyId : "all"],
    queryFn: async () => {
      const url = isCompanyAdmin && companyId
        ? `/api/specialties?client_id=${companyId}`
        : "/api/specialties";
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch specialties');
      return response.json();
    },
    enabled: activeSection === "Profissionais" || activeSection === "Especialidades" || activeSection === "Serviços" || activeSection === "Agenda"
  });

  // Query para buscar serviços reais
  const { data: servicesData = [], isLoading: servicesLoading } = useQuery({
    queryKey: ["/api/services", isCompanyAdmin ? companyId : "all"],
    queryFn: async () => {
      const url = isCompanyAdmin && companyId
        ? `/api/services?client_id=${companyId}`
        : "/api/services";
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch services');
      return response.json();
    },
    enabled: activeSection === "Serviços" || activeSection === "Agenda"
  });

  // Query para buscar clientes reais (apenas para super_admin)
  const { data: clientsData = [], isLoading: clientsLoading } = useQuery({
    queryKey: ["/api/clients"],
    enabled: !isCompanyAdmin && (activeSection === "Empresa" || activeSection === "Profissionais" || activeSection === "Serviços" || activeSection === "Clientes" || activeSection === "Agenda")
  });

  // Query para buscar customers reais
  const { data: customersData = [], isLoading: customersLoading } = useQuery({
    queryKey: ["/api/customers", isCompanyAdmin ? companyId : "all"],
    queryFn: async () => {
      const url = isCompanyAdmin && companyId
        ? `/api/customers?client_id=${companyId}`
        : "/api/customers";
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch customers');
      return response.json();
    },
    enabled: activeSection === "Clientes" || activeSection === "Agenda"
  });

  // Query para buscar appointments reais
  const { data: appointmentsData = [], isLoading: appointmentsLoading } = useQuery({
    queryKey: ["/api/appointments", isCompanyAdmin ? companyId : "all"],
    queryFn: async () => {
      const url = isCompanyAdmin && companyId
        ? `/api/appointments?client_id=${companyId}`
        : "/api/appointments";
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch appointments');
      return response.json();
    },
    enabled: activeSection === "Agenda"
  });

  // Query para buscar availability (horários disponíveis)
  const { data: availabilityData = [], isLoading: availabilityLoading } = useQuery({
    queryKey: ["/api/professional-availability", isCompanyAdmin ? companyId : "all"],
    queryFn: async () => {
      const url = isCompanyAdmin && companyId
        ? `/api/professional-availability?client_id=${companyId}`
        : "/api/professional-availability";
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch availability');
      return response.json();
    },
    enabled: activeSection === "Agenda" || showNewEventModal
  });

  // Sincronizar filtros de profissionais e especialidades com dados reais
  useEffect(() => {
    if (professionalsData && specialtiesData && professionalsData.length > 0 && specialtiesData.length > 0) {
      const realProfessionals = (professionalsData as any[]).map((prof: any) => {
        const specialty = (specialtiesData as any[]).find((s: any) => s.id === prof.specialtyId);
        return {
          id: prof.id,
          name: prof.name,
          specialtyName: specialty?.name || 'Sem especialidade',
          color: prof.color || '#A78BFA',
          selected: true
        };
      });
      
      // Só atualiza se os dados mudaram
      if (JSON.stringify(realProfessionals) !== JSON.stringify(professionalsState)) {
        setProfessionalsState(realProfessionals);
      }

      // Criar filtros de especialidades baseados nos dados reais
      const realSpecialties = (specialtiesData as any[]).map((specialty: any) => ({
        id: specialty.id,
        label: specialty.name,
        checked: true
      }));
      
      // Só atualiza se os dados mudaram
      if (JSON.stringify(realSpecialties) !== JSON.stringify(filters)) {
        setFilters(realSpecialties);
      }
    }
  }, [professionalsData, specialtiesData]);

  // Converter appointments confirmados em eventos da agenda
  const agendaEvents = React.useMemo(() => {
    if (!appointmentsData || !professionalsData || !servicesData || !customersData) {
      return [];
    }

    const filteredAppointments = (appointmentsData as any[]).filter((appointment: any) => {
      return appointment.status === 'confirmado' || appointment.status === 'confirmed' || appointment.status === 'scheduled';
    });

    return filteredAppointments
      .map((appointment: any) => {
        const professional = (professionalsData as any[]).find((p: any) => p.id === appointment.professionalId);
        const service = (servicesData as any[]).find((s: any) => s.id === appointment.serviceId);
        if (!professional || !service) {
          return null;
        }

        const scheduledDate = new Date(appointment.scheduledAt);
        const day = scheduledDate.getDate();
        
        // NUNCA criar Date() em cima de 'time' - usar string diretamente
        const time = appointment.startTime?.slice(0, 5) || '00:00';

        // Buscar nome do cliente diretamente dos dados do appointment
        const customerName = appointment.customerName || 
                           `Cliente ${appointment.customerId ? appointment.customerId.slice(-4) : 'N/A'}`;
        
        const customerPhone = appointment.customerPhone || '';

        return {
          id: appointment.id,
          time,
          customerName,
          customerPhone,
          professionalName: professional.name,
          professionalId: appointment.professionalId,
          serviceName: service.name,
          serviceId: appointment.serviceId,
          color: professional.color || '#A78BFA',
          date: day,
          status: appointment.status,
          duration: appointment.duration || service.duration || 60,
          startTime: appointment.startTime,
          endTime: appointment.endTime,
          scheduledAt: appointment.scheduledAt
        };
      })
      .filter((event): event is AgendaEvent => event !== null);
  }, [appointmentsData, professionalsData, servicesData]);

  // Mutation para criar profissional
  const createProfessionalMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/professionals", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/professionals"] });
      setShowProfessionalModal(false);
      resetProfessionalForm();
    }
  });

  // Mutation para atualizar profissional
  const updateProfessionalMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => apiRequest(`/api/professionals/${id}`, "PATCH", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/professionals"] });
      setShowProfessionalModal(false);
      setEditingProfessional(null);
      resetProfessionalForm();
    }
  });

  // Mutation para deletar profissional
  const deleteProfessionalMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/professionals/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/professionals"] });
      toast({
        title: "Profissional excluído",
        description: `${professionalToDelete?.name || 'Profissional'} foi removido com sucesso.`,
      });
      setShowDeleteConfirm(false);
      setProfessionalToDelete(null);
    },
    onError: (error: any) => {
      console.error("Error deleting professional:", error);
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir o profissional. Tente novamente.",
        variant: "destructive",
      });
    }
  });

  // Mutation para criar serviço
  const createServiceMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/services", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setShowServiceModal(false);
      resetServiceForm();
    }
  });

  // Mutation para atualizar serviço
  const updateServiceMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => apiRequest(`/api/services/${id}`, "PATCH", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setShowServiceModal(false);
      setEditingService(null);
      resetServiceForm();
    }
  });

  // Mutation para deletar serviço
  const deleteServiceMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/services/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      toast({
        title: "Serviço excluído",
        description: `${serviceToDelete?.name || 'Serviço'} foi removido com sucesso.`,
      });
      setShowDeleteServiceConfirm(false);
      setServiceToDelete(null);
    },
    onError: (error: any) => {
      console.error("Error deleting service:", error);
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir o serviço. Tente novamente.",
        variant: "destructive",
      });
    }
  });



  // Mutation para criar cliente
  const createClientMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/clients", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setShowClientModal(false);
      resetClientForm();
    }
  });

  // Mutation para atualizar cliente
  const updateClientMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => apiRequest(`/api/clients/${id}`, "PATCH", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setShowClientModal(false);
      setEditingClient(null);
      resetClientForm();
    }
  });

  // Mutation para deletar cliente
  const deleteClientMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/clients/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
    }
  });

  // Mutation para criar customer
  const createCustomerMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/customers", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setShowCustomerModal(false);
      resetCustomerForm();
      toast({
        title: "Cliente criado",
        description: "Cliente adicionado com sucesso ao sistema.",
      });
    },
    onError: (error: any) => {
      console.error("Error creating customer:", error);
      toast({
        title: "Erro ao criar cliente",
        description: "Não foi possível criar o cliente. Verifique os dados e tente novamente.",
        variant: "destructive",
      });
    }
  });

  // Mutation para atualizar customer
  const updateCustomerMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => apiRequest(`/api/customers/${id}`, "PATCH", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setShowCustomerModal(false);
      setEditingCustomer(null);
      resetCustomerForm();
    }
  });

  // Mutation para deletar customer
  const deleteCustomerMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/customers/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
    }
  });

  // Mutations para especialidades
  const createSpecialtyMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/specialties", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/specialties"] });
      setShowSpecialtyModal(false);
      resetSpecialtyForm();
    }
  });

  const updateSpecialtyMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => apiRequest(`/api/specialties/${id}`, "PATCH", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/specialties"] });
      setShowSpecialtyModal(false);
      setEditingSpecialty(null);
      resetSpecialtyForm();
    }
  });

  const deleteSpecialtyMutation = useMutation({
    mutationFn: async (specialtyData: any) => {
      // Enviar para webhook externo primeiro
      const response = await fetch("https://wb.semprecheioapp.com.br/webhook/acoes_no_super_admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          metodo: "delete",
          id: specialtyData.id,
          nome_da_aba: "specialties"
        })
      });
      
      if (!response.ok) {
        throw new Error("Falha ao deletar especialidade via webhook");
      }
      
      // Se webhook sucedeu, deletar localmente também
      await apiRequest(`/api/specialties/${specialtyData.id}`, "DELETE");
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/specialties"] });
      toast({
        title: "Especialidade excluída",
        description: `${specialtyToDelete?.name || 'Especialidade'} foi removida com sucesso.`,
      });
      setShowDeleteSpecialtyConfirm(false);
      setSpecialtyToDelete(null);
    },
    onError: (error: any) => {
      console.error("Error deleting specialty:", error);
      toast({
        title: "Erro ao excluir",
        description: error.message || "Não foi possível excluir a especialidade. Tente novamente.",
        variant: "destructive",
      });
    }
  });

  // Mutation para cancelar agendamento via webhook externo
  const cancelAppointmentMutation = useMutation({
    mutationFn: async ({ appointmentId, customerPhone }: { appointmentId: string, customerPhone: string }) => {
      const response = await fetch("https://wb.semprecheioapp.com.br/webhook/cancel_appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionid: customerPhone,
          agendamento_id: appointmentId
        })
      });
      
      if (!response.ok) {
        throw new Error("Falha ao cancelar agendamento via webhook");
      }
      
      return await response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/professionals"] }); // Refresh availability
      setShowCancelConfirm(false);
      setAppointmentToCancel(null);
      toast({
        title: "Agendamento Cancelado",
        description: `Agendamento cancelado com sucesso! Cliente: ${data.customerName || 'N/A'}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao Cancelar",
        description: error.message || "Não foi possível cancelar o agendamento via webhook.",
        variant: "destructive",
      });
    }
  });

  const resetProfessionalForm = () => {
    setProfessionalForm({
      name: "",
      email: "",
      phone: "",
      specialtyId: "",
      clientId: ""
    });
  };

  const resetServiceForm = () => {
    setServiceForm({
      name: "",
      category: "",
      description: "",
      duration: "",
      price: "",
      specialtyId: "",
      clientId: ""
    });
  };

  const resetClientForm = () => {
    setClientForm({
      name: "",
      email: "",
      phone: "",
      serviceType: "",
      customServiceType: "",
      whatsappInstanceUrl: "",
      password: ""
    });
  };

  const resetCustomerForm = () => {
    setCustomerForm({
      name: "",
      email: "",
      phone: "",
      cpfCnpj: "",
      notes: "",
      clientId: ""
    });
  };

  const resetSpecialtyForm = () => {
    setSpecialtyForm({
      name: "",
      description: "",
      color: "#3B82F6",
      serviceId: ""
    });
  };

  // Schema para validação do formulário de edição
  const editAppointmentSchema = z.object({
    scheduledAt: z.string().optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    serviceId: z.string().optional(),
    professionalId: z.string().optional(),
    status: z.string().optional(),
  });

  // Form para edição de agendamento
  const editForm = useForm({
    resolver: zodResolver(editAppointmentSchema),
    defaultValues: {
      scheduledAt: '',
      startTime: '',
      endTime: '',
      serviceId: '',
      professionalId: '',
    }
  });

  // Mutation para editar agendamentos

  const updateAppointmentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest(`/api/appointments/${id}`, 'PATCH', data);
    },
    onSuccess: () => {
      queryClientInstance.invalidateQueries({ queryKey: ['/api/appointments'] });
      setEditingEvent(null);
      setShowEditEventModal(false);
      setSelectedEvent(null);
      editForm.reset();
    }
  });

  // Mutation para criar agendamentos
  const createAppointmentMutation = useMutation({
    mutationFn: async (appointmentData: any) => {
      return await apiRequest('/api/appointments', 'POST', appointmentData);
    },
    onSuccess: () => {
      queryClientInstance.invalidateQueries({ queryKey: ['/api/appointments'] });
      setShowNewEventModal(false);
      resetAppointmentForm();
      toast({
        title: "Sucesso!",
        description: "Agendamento criado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar agendamento.",
        variant: "destructive",
      });
    }
  });

  // Função para resetar formulário de agendamento
  const resetAppointmentForm = () => {
    setAppointmentForm({
      client_id: "",
      professional_id: "",
      service_id: "",
      specialty_id: "",
      customer_id: "",
      availability_id: "",
      appointment_time: "",
      status: "confirmado",
      customer_name: "",
      customer_phone: ""
    });
  };

  // Função para submeter novo agendamento
  const handleSubmitAppointment = (e: React.FormEvent) => {
    e.preventDefault();

    // Validar campos obrigatórios (customer_id removido da lista)
    const requiredFields = ['client_id', 'professional_id', 'service_id', 'availability_id'];
    for (const field of requiredFields) {
      if (!appointmentForm[field as keyof typeof appointmentForm]) {
        toast({
          title: "Erro",
          description: `Campo ${field.replace('_', ' ')} é obrigatório.`,
          variant: "destructive",
        });
        return;
      }
    }

    createAppointmentMutation.mutate(appointmentForm);
  };

  // Função para abrir modal de novo agendamento a partir do calendário
  const openNewEventModal = (day: number, hour: number) => {
    // Resetar formulário
    resetAppointmentForm();

    // Configurar data e hora baseado no clique
    const currentDate = new Date(currentYear, currentMonth, day, hour, 0);
    const appointmentTime = currentDate.toISOString().slice(0, 16); // formato para datetime-local

    setAppointmentForm(prev => ({
      ...prev,
      appointment_time: appointmentTime
    }));

    // Configurar dados do modal (para exibição)
    setNewEventData({ date: day, hour });

    // Abrir modal
    setShowNewEventModal(true);
  };

  // Função para abrir modal de confirmação de cancelamento
  const handleCancelAppointment = (event: AgendaEvent) => {
    setAppointmentToCancel(event);
    setShowCancelConfirm(true);
  };

  // Função para abrir modal de edição
  const handleEditAppointment = (event: AgendaEvent) => {
    setEditingEvent(event);
    
    // Pré-preencher o formulário com dados do evento
    editForm.reset({
      scheduledAt: new Date(event.date || Date.now()).toISOString().split('T')[0],
      startTime: event.startTime || event.time || '09:00',
      endTime: event.endTime || '10:00',
      serviceId: event.serviceId || '',
      professionalId: event.professionalId || '',
    });
    
    setShowEditEventModal(true);
  };

  // Função para submeter edição do agendamento
  const handleSubmitEditAppointment = (data: any) => {
    if (!editingEvent) return;
    
    const updateData = {
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt).toISOString() : undefined,
      startTime: data.startTime,
      endTime: data.endTime,
      serviceId: data.serviceId,
      professionalId: data.professionalId,
    };
    
    // Remover campos vazios
    Object.keys(updateData).forEach(key => {
      if (!(updateData as any)[key]) delete (updateData as any)[key];
    });
    
    updateAppointmentMutation.mutate({ 
      id: editingEvent.id, 
      data: updateData 
    });
  };

  const sidebarItems = [
    { section: "PRINCIPAL", items: [
      { name: "Dashboard", icon: BarChart3, active: activeSection === "Dashboard" },
      { name: "Empresas", icon: Building2, active: activeSection === "Empresas" },
      { name: "Agenda", icon: Calendar, active: activeSection === "Agenda" },
      { name: "Pagamentos", icon: CreditCard, active: activeSection === "Pagamentos" }
    ]},
    {
      section: "GERENCIAMENTO",
      items: [
        { name: "Profissionais", icon: Users, active: activeSection === "Profissionais" },
        { name: "Config. Profissionais", icon: Clock, active: activeSection === "Config. Profissionais" },
        { name: "Especialidades", icon: Tag, active: activeSection === "Especialidades" },
        { name: "Serviços", icon: Briefcase, active: activeSection === "Serviços" },
        { name: "Clientes", icon: UserCog, active: activeSection === "Clientes" }
      ]
    },
    // Seção SUPER ADMIN apenas para super_admin
    ...(isCompanyAdmin ? [] : [{
      section: "SUPER ADMIN",
      items: [
        { name: "Empresa", icon: Building2, active: activeSection === "Empresa" },
        { name: "Canais", icon: MessageSquare, active: activeSection === "Canais" },
        { name: "Agente IA", icon: Bot, active: activeSection === "Agente IA" }
      ]
    }]),
    { section: "SISTEMA", items: [{ name: "Configurações", icon: Settings, active: activeSection === "Configurações" }] }
  ];

  // Query para buscar dados do dashboard
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ["/api/dashboard"],
    queryFn: async () => {
      const response = await fetch("/api/dashboard", { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch dashboard data');
      return response.json();
    },
    enabled: activeSection === "Dashboard"
  });

  const handleSidebarClick = (itemName: string) => {
    setActiveSection(itemName);
    setMobileMenuOpen(false);
  };

  const handleEditProfessional = (professional: any) => {
    setEditingProfessional(professional);
    setProfessionalForm({
      name: professional.name,
      email: professional.email,
      phone: professional.phone,
      specialtyId: professional.specialtyId,
      clientId: professional.clientId || ""
    });
    setShowProfessionalModal(true);
  };

  const handleSubmitProfessional = (e: React.FormEvent) => {
    e.preventDefault();
    
    const professionalData = {
      name: professionalForm.name,
      email: professionalForm.email,
      phone: professionalForm.phone,
      specialtyId: professionalForm.specialtyId,
      clientId: professionalForm.clientId,
      isActive: true
    };

    if (editingProfessional) {
      updateProfessionalMutation.mutate({ 
        id: editingProfessional.id, 
        data: professionalData 
      });
    } else {
      createProfessionalMutation.mutate(professionalData);
    }
  };

  const handleDeleteProfessional = (professional: any) => {
    setProfessionalToDelete(professional);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteProfessional = async () => {
    if (professionalToDelete) {
      try {
        const webhookData = {
          metodo: "delete",
          id: professionalToDelete.id,
          nome_da_aba: "professionals"
        };

        const response = await fetch("https://wb.semprecheioapp.com.br/webhook/acoes_no_super_admin", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(webhookData)
        });

        if (response.ok) {
          // Invalida o cache para atualizar a lista
          queryClient.invalidateQueries({ queryKey: ["/api/professionals"] });
          toast({
            title: "Sucesso",
            description: "Profissional excluído com sucesso!",
          });
          setShowDeleteConfirm(false);
          setProfessionalToDelete(null);
        } else {
          throw new Error("Erro na resposta do webhook");
        }
      } catch (error) {
        toast({
          title: "Erro",
          description: "Erro ao excluir profissional. Tente novamente.",
          variant: "destructive",
        });
      }
    }
  };

  const handleEditService = (service: any) => {
    setEditingService(service);
    setServiceForm({
      name: service.name,
      category: service.category || "",
      description: service.description,
      duration: service.duration.toString(),
      price: service.price.toString(),
      specialtyId: service.specialtyId || "",
      clientId: service.clientId || ""
    });
    setShowServiceModal(true);
  };

  const handleSubmitService = (e: React.FormEvent) => {
    e.preventDefault();
    
    const serviceData = {
      name: serviceForm.name,
      category: serviceForm.category,
      description: serviceForm.description,
      duration: parseInt(serviceForm.duration),
      price: parseFloat(serviceForm.price),
      specialtyId: serviceForm.specialtyId || null,
      clientId: serviceForm.clientId || null,
      isActive: true
    };

    if (editingService) {
      updateServiceMutation.mutate({ 
        id: editingService.id, 
        data: serviceData 
      });
    } else {
      createServiceMutation.mutate(serviceData);
    }
  };

  const handleDeleteService = (service: any) => {
    setServiceToDelete(service);
    setShowDeleteServiceConfirm(true);
  };

  const confirmDeleteService = () => {
    if (serviceToDelete) {
      deleteServiceMutation.mutate(serviceToDelete.id);
    }
  };

  const handleEditClient = (client: any) => {
    setEditingClient(client);
    setClientForm({
      name: client.name,
      email: client.email,
      phone: client.phone,
      serviceType: client.serviceType,
      customServiceType: client.customServiceType || "",
      whatsappInstanceUrl: client.whatsappInstanceUrl || "",
      password: "" // Não preencher senha por segurança
    });
    setShowClientModal(true);
  };

  const handleSubmitClient = (e: React.FormEvent) => {
    e.preventDefault();

    const clientData: any = {
      name: clientForm.name,
      email: clientForm.email,
      phone: clientForm.phone,
      serviceType: clientForm.serviceType === "outros" && clientForm.customServiceType
        ? clientForm.customServiceType
        : clientForm.serviceType,
      whatsappInstanceUrl: clientForm.whatsappInstanceUrl,
      isActive: true
    };

    // Só incluir senha se foi preenchida
    if (clientForm.password && clientForm.password.trim() !== "") {
      clientData.password = clientForm.password;
    }

    if (editingClient) {
      updateClientMutation.mutate({
        id: editingClient.id,
        data: clientData
      });
    } else {
      createClientMutation.mutate(clientData);
    }
  };

  const handleDeleteClient = (client: any) => {
    setClientToDelete(client);
    setShowDeleteClientConfirm(true);
  };

  const confirmDeleteClient = () => {
    if (clientToDelete) {
      deleteClientMutation.mutate(clientToDelete.id);
    }
  };

  const handleEditCustomer = (customer: any) => {
    setEditingCustomer(customer);
    setCustomerForm({
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      cpfCnpj: customer.cpfCnpj || "",
      notes: customer.notes || "",
      clientId: customer.clientId || ""
    });
    setShowCustomerModal(true);
  };

  const handleSubmitCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    
    const customerData = {
      name: customerForm.name,
      email: customerForm.email,
      phone: customerForm.phone,
      cpfCnpj: customerForm.cpfCnpj,
      notes: customerForm.notes,
      clientId: customerForm.clientId || null
    };

    if (editingCustomer) {
      updateCustomerMutation.mutate({ 
        id: editingCustomer.id, 
        data: customerData 
      });
    } else {
      createCustomerMutation.mutate(customerData);
    }
  };

  const handleDeleteCustomer = (id: string) => {
    if (confirm("Tem certeza que deseja excluir este usuário?")) {
      deleteCustomerMutation.mutate(id);
    }
  };

  // Funções para especialidades
  const handleEditSpecialty = (specialty: any) => {
    setEditingSpecialty(specialty);
    setSpecialtyForm({
      name: specialty.name,
      description: specialty.description || "",
      color: specialty.color || "#3B82F6",
      serviceId: specialty.serviceId || ""
    });
    setShowSpecialtyModal(true);
  };

  const handleSubmitSpecialty = (e: React.FormEvent) => {
    e.preventDefault();
    
    const specialtyData = {
      name: specialtyForm.name,
      description: specialtyForm.description,
      color: specialtyForm.color,
      serviceId: specialtyForm.serviceId || null,
      isActive: true
    };

    if (editingSpecialty) {
      updateSpecialtyMutation.mutate({ 
        id: editingSpecialty.id, 
        data: specialtyData 
      });
    } else {
      createSpecialtyMutation.mutate(specialtyData);
    }
  };

  const handleDeleteSpecialty = (specialty: any) => {
    setSpecialtyToDelete(specialty);
    setShowDeleteSpecialtyConfirm(true);
  };

  const confirmDeleteSpecialty = () => {
    if (specialtyToDelete) {
      deleteSpecialtyMutation.mutate(specialtyToDelete);
    }
  };

  const toggleProfessional = (id: string) => {
    setProfessionalsState(prev => 
      prev.map(prof => 
        prof.id === id ? { ...prof, selected: !prof.selected } : prof
      )
    );
  };

  const toggleFilter = (id: string) => {
    setFilters(prev => 
      prev.map(filter => 
        filter.id === id ? { ...filter, checked: !filter.checked } : filter
      )
    );
  };

  const clearAllFilters = () => {
    setFilters(prev => prev.map(filter => ({ ...filter, checked: false })));
    setProfessionalsState(prev => prev.map(prof => ({ ...prof, selected: false })));
  };

  const filteredProfessionals = professionalsState.filter(prof => 
    prof.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prof.role.toLowerCase().includes(searchTerm.toLowerCase())
  );





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
                  // Converter appointments reais para o formato da agenda
                  const realEvents = (appointmentsData as any[]).map((appointment: any) => {
                    const appointmentDate = new Date(appointment.scheduledAt);
                    const appointmentDay = appointmentDate.getDate();
                    const appointmentMonth = appointmentDate.getMonth();
                    const appointmentYear = appointmentDate.getFullYear();

                    // Usar UTC para horário correto (15:00 ao invés de 12:00)
                    const appointmentHour = appointmentDate.getUTCHours();
                    const appointmentMinutes = appointmentDate.getUTCMinutes();

                    // Buscar dados relacionados
                    const professional = (professionalsData as any[]).find((p: any) => p.id === appointment.professionalId);
                    const customer = (customersData as any[]).find((c: any) => c.id === appointment.customerId);
                    const service = (servicesData as any[]).find((s: any) => s.id === appointment.serviceId);

                    return {
                      id: appointment.id,
                      date: appointmentDay,
                      month: appointmentMonth,
                      year: appointmentYear,
                      time: `${appointmentHour.toString().padStart(2, '0')}:${appointmentMinutes.toString().padStart(2, '0')}`,
                      customerName: appointment.customerName || customer?.name || 'Cliente não encontrado',
                      professionalName: professional?.name || 'Profissional não encontrado',
                      serviceName: service?.name || 'Serviço não encontrado',
                      color: professional?.color || '#A78BFA',
                      status: appointment.status,
                      duration: appointment.duration || 60
                    };
                  }).filter((event: any) =>
                    event.month === currentMonth &&
                    event.year === currentYear
                  );

                  const dayEvents = realEvents.filter((event: any) =>
                    event.date === day &&
                    parseInt(event.time.split(':')[0]) === hour &&
                    professionalsState.find(p => p.name === event.professionalName)?.selected
                  );
                  
                  return (
                    <div
                      key={`${day}-${hour}`}
                      className="h-20 border-l border-b border-gray-100 p-1 relative cursor-pointer hover:bg-gray-50 group"
                      onClick={() => openNewEventModal(day, hour)}
                    >
                      <div className="h-full flex flex-col">
                        {/* Área dos eventos */}
                        <div className="flex-1 space-y-1 overflow-hidden">
                          {dayEvents.slice(0, 1).map((event, index) => {
                            // Encontrar o evento real correspondente
                            const realEvent = realEvents.find(re => re.id === event.id);
                            const eventToUse = realEvent || event;

                            return (
                              <div
                                key={event.id}
                                className="p-1.5 rounded text-xs font-medium text-gray-800 cursor-pointer hover:opacity-80 transition-opacity"
                                style={{
                                  backgroundColor: `${event.color}25`,
                                  borderLeft: `3px solid ${event.color}`
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedEvent(eventToUse);
                                }}
                              >
                                <div className="font-semibold truncate">{event.time} - {event.customerName}</div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Contador fixo no final */}
                        {dayEvents.length > 1 && (
                          <div className="mt-auto">
                            <div
                              className="text-xs text-blue-600 font-semibold bg-blue-50 px-1 py-0.5 rounded text-center cursor-pointer hover:bg-blue-100 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDay(day);
                                setViewMode("day"); // Mudar para visualização do dia
                              }}
                            >
                              +{dayEvents.length - 1}
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
    
    // Converter appointments reais para o formato da agenda do dia
    const realDayEvents = (appointmentsData as any[]).map((appointment: any) => {
      const appointmentDate = new Date(appointment.scheduledAt);
      const appointmentDay = appointmentDate.getDate();
      const appointmentMonth = appointmentDate.getMonth();
      const appointmentYear = appointmentDate.getFullYear();

      // Usar UTC para horário correto (15:00 ao invés de 12:00)
      const appointmentHour = appointmentDate.getUTCHours();
      const appointmentMinutes = appointmentDate.getUTCMinutes();

      // Buscar dados relacionados
      const professional = (professionalsData as any[]).find((p: any) => p.id === appointment.professionalId);
      const customer = (customersData as any[]).find((c: any) => c.id === appointment.customerId);
      const service = (servicesData as any[]).find((s: any) => s.id === appointment.serviceId);

      return {
        id: appointment.id,
        date: appointmentDay,
        month: appointmentMonth,
        year: appointmentYear,
        time: `${appointmentHour.toString().padStart(2, '0')}:${appointmentMinutes.toString().padStart(2, '0')}`,
        customerName: appointment.customerName || customer?.name || 'Cliente não encontrado',
        professionalName: professional?.name || 'Profissional não encontrado',
        serviceName: service?.name || 'Serviço não encontrado',
        color: professional?.color || '#A78BFA',
        status: appointment.status,
        duration: appointment.duration || 60
      };
    }).filter((event: any) =>
      event.month === currentMonth &&
      event.year === currentYear
    );

    const selectedDayEvents = realDayEvents.filter((event: any) =>
      event.date === selectedDay &&
      professionalsState.find(p => p.name === event.professionalName)?.selected
    );

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
    const dayName = dayNames[currentDate.getDay()];
    const fullDate = `${dayName}, ${selectedDay} de ${monthNames[currentMonth]} ${currentYear}`;

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
            const hourEvents = selectedDayEvents.filter(event => 
              parseInt(event.time.split(':')[0]) === hour
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
                    {hourEvents.map(event => (
                      <div
                        key={event.id}
                        className="p-4 rounded-lg border-l-4 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
                        style={{
                          backgroundColor: `${event.color}15`,
                          borderLeftColor: event.color
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvent(event);
                        }}
                      >
                        <div className="font-bold text-gray-800 text-base">{event.time} - {event.customerName}</div>
                        <div className="text-sm text-gray-600 mt-2 flex items-center gap-2">
                          <span className="font-medium">{event.professionalName}</span>
                          <span className="text-gray-400">•</span>
                          <span>{event.serviceName}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  
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

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

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

  const renderCalendarGrid = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDayOfWeek = getFirstDayOfMonth(currentMonth, currentYear);
    const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    
    const calendarDays = [];
    
    // Converter appointments reais para o formato do calendário
    const realCalendarEvents = appointmentsData ? (appointmentsData as any[]).map((appointment: any) => {
      const appointmentDate = new Date(appointment.scheduledAt);
      const appointmentDay = appointmentDate.getDate();
      const appointmentMonth = appointmentDate.getMonth();
      const appointmentYear = appointmentDate.getFullYear();
      const appointmentHour = appointmentDate.getHours();
      
      // Buscar dados relacionados
      const professional = professionalsData ? (professionalsData as any[]).find((p: any) => p.id === appointment.professionalId) : null;
      const customer = customersData ? (customersData as any[]).find((c: any) => c.id === appointment.customerId) : null;
      const service = servicesData ? (servicesData as any[]).find((s: any) => s.id === appointment.serviceId) : null;
      
      return {
        id: appointment.id,
        date: appointmentDay,
        month: appointmentMonth,
        year: appointmentYear,
        time: appointment.startTime?.slice(0, 5) || `${appointmentHour.toString().padStart(2, '0')}:${appointmentDate.getMinutes().toString().padStart(2, '0')}`,
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
    }).filter((event: any) => event.month === currentMonth && event.year === currentYear) : [];
    
    // Adicionar células vazias para os dias antes do primeiro dia do mês
    for (let i = 0; i < firstDayOfWeek; i++) {
      calendarDays.push(<div key={`empty-${i}`} className="h-32 border border-gray-200"></div>);
    }
    
    // Adicionar os dias do mês
    for (let day = 1; day <= daysInMonth; day++) {
      const dayEvents = realCalendarEvents.filter((event: any) => 
        event.date === day && 
        professionalsState.find(p => p.name === event.professionalName)?.selected
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
            // Se não há eventos no dia, abrir modal de novo agendamento
            if (dayEvents.length === 0) {
              openNewEventModal(day, 9); // 9h como horário padrão
            }
          }}
        >
          <div className="text-sm text-gray-600 font-medium mb-2">{day}</div>

          {/* Área dos eventos */}
          <div className="flex-1 space-y-1 overflow-hidden">
            {dayEvents.slice(0, 2).map((event: any) => (
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
          </div>

          {/* Contador fixo no final */}
          {dayEvents.length > 2 && (
            <div className="absolute bottom-1 left-2 right-2">
              <div
                className="text-xs text-blue-600 font-semibold bg-blue-50 px-2 py-1 rounded cursor-pointer hover:bg-blue-100 transition-colors text-center"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedDay(day);
                  setViewMode("day"); // Mudar para visualização do dia
                }}
              >
                +{dayEvents.length - 2} mais
              </div>
            </div>
          )}
          
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
        {/* Navegação do mês */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth('prev')}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Anterior
          </Button>
          
          <h2 className="text-lg font-semibold text-gray-900">
            {monthNames[currentMonth]} {currentYear}
          </h2>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth('next')}
            className="flex items-center gap-2"
          >
            Próximo
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Cabeçalho dos dias da semana */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {daysOfWeek.map(day => (
            <div key={day} className="p-3 text-center text-sm font-medium text-gray-500 border-r border-gray-200 last:border-r-0">
              {day}
            </div>
          ))}
        </div>
        
        {/* Grade do calendário */}
        <div className="grid grid-cols-7">
          {calendarDays}
        </div>
      </div>
    );
  };

  // Componente Sidebar reutilizável
  const SidebarContent = ({ onClose }: { onClose?: () => void }) => (
    <div className="flex flex-col h-full">
      <div className="p-4 flex-1">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-200">SempreCheioApp</h1>
          <div className="flex items-center space-x-2">
            <ThemeToggle />

            {/* Menu de Conta - Desktop */}
            {!onClose && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="relative">
                    <User className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Super Administrador</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    <span>Perfil</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Key className="mr-2 h-4 w-4" />
                    <span>Alterar Senha</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Shield className="mr-2 h-4 w-4" />
                    <span>Segurança</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sair</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose} className="lg:hidden">
                <X className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>
        
        {sidebarItems.map((section, index) => (
          <div key={section.section} className={index > 0 ? 'border-t border-gray-300 pt-4 mt-4' : ''}>
            <h3 className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: '#9CA3AF' }}>
              {section.section}
            </h3>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.name}>
                    <button
                      className={`w-full flex items-center space-x-3 px-3 py-2 text-sm rounded-md transition-colors ${
                        item.active 
                          ? 'bg-white text-gray-900 font-semibold shadow-sm' 
                          : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                      }`}
                      style={{ fontSize: '14px' }}
                      onClick={() => {
                        handleSidebarClick(item.name);
                        if (onClose) onClose();
                      }}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      
      {/* Botão de Logout */}
      <div className="p-4 border-t border-gray-300">
        <Button
          variant="ghost"
          className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={() => {
            setShowLogoutConfirm(true);
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
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Sidebar Desktop */}
      <div className="hidden lg:block w-60 bg-gray-100 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
        <SidebarContent />
      </div>

      {/* Mobile Sidebar Sheet */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-full sm:w-80 bg-gray-100 p-0 max-w-none h-full">
          <SheetHeader className="sr-only">
            <SheetTitle>Menu de Navegação</SheetTitle>
          </SheetHeader>
          <SidebarContent onClose={() => setMobileMenuOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Área Central - Agenda */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header Mobile */}
        <div className="lg:hidden bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setMobileMenuOpen(true)}
              className="p-1"
            >
              <Menu className="w-6 h-6" />
            </Button>
            <h1 className="text-lg font-bold text-gray-800 dark:text-gray-200">Super Admin - Agenda</h1>
          </div>
          <div className="flex items-center space-x-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm">
              <Search className="w-5 h-5" />
            </Button>

            {/* Menu de Conta */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="relative">
                  <User className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  <span>Perfil</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Key className="mr-2 h-4 w-4" />
                  <span>Alterar Senha</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Shield className="mr-2 h-4 w-4" />
                  <span>Segurança</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Barra de navegação da agenda - só aparece quando activeSection é 'Agenda' */}
        {activeSection === 'Agenda' && (
          <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div className="flex space-x-2">
                {(["month", "week", "day"] as ViewMode[]).map((mode) => (
                  <Button
                    key={mode}
                    variant={viewMode === mode ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode(mode)}
                    className={`rounded-md ${
                      viewMode === mode
                        ? 'text-white hover:bg-blue-700'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    style={{
                      backgroundColor: viewMode === mode ? '#3B82F6' : 'transparent',
                      color: viewMode === mode ? 'white' : '#6B7280',
                      borderRadius: '6px'
                    }}
                  >
                    {mode === "month" && "Mês"}
                    {mode === "week" && "Semana"}
                    {mode === "day" && "Dia"}
                  </Button>
                ))}
              </div>

              <Button
                onClick={() => {
                  resetAppointmentForm();
                  setShowNewEventModal(true);
                }}
                className="bg-green-600 hover:bg-green-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Agendamento
              </Button>
            </div>
          </div>
        )}

        {/* Grade do calendário ou seção ativa */}
        <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800">
          {activeSection === "Profissionais" ? (
            <div className="p-6">
              <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                  <h1 className="text-2xl font-bold text-gray-900">Gerenciar Profissionais</h1>
                  <Button
                    onClick={() => {
                      setEditingProfessional(null);
                      resetProfessionalForm();
                      setShowProfessionalModal(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Profissional
                  </Button>
                </div>

                {/* Filtro por Empresa */}
                <div className="mb-6">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Filtrar por Empresa
                      </label>
                      <Select value={selectedClientId || undefined} onValueChange={(value) => setSelectedClientId(value || "")}>
                        <SelectTrigger className="w-full">
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Buscar por Email da Empresa
                      </label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
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
                </div>

                {/* Search Bar */}
                <div className="mb-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Buscar profissionais..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Loading State */}
                {professionalsLoading && (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Carregando profissionais...</p>
                  </div>
                )}

                {/* Professionals Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(professionalsData as any[])?.filter((prof: any) => {
                      // Filtro por empresa
                      const matchesClient = !selectedClientId || selectedClientId === "all" || prof.clientId === selectedClientId;
                      // Filtro por busca
                      const matchesSearch = prof.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                          prof.email.toLowerCase().includes(searchTerm.toLowerCase());
                      return matchesClient && matchesSearch;
                    })
                    .map((professional: any) => {
                      const specialty = (specialtiesData as any[])?.find((s: any) => s.id === professional.specialtyId);
                      const client = (clientsData as any[])?.find((c: any) => c.id === professional.clientId);
                      return (
                        <Card key={professional.id} className="hover:shadow-lg transition-shadow">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-lg">{professional.name}</CardTitle>
                              <Badge 
                                variant={professional.isActive ? "default" : "secondary"}
                                className={professional.isActive ? "bg-green-100 text-green-800" : ""}
                              >
                                {professional.isActive ? "Ativo" : "Inativo"}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2 mb-4">
                              <div className="flex items-center text-sm text-gray-600">
                                <Mail className="w-4 h-4 mr-2" />
                                {professional.email}
                              </div>
                              <div className="flex items-center text-sm text-gray-600">
                                <Phone className="w-4 h-4 mr-2" />
                                {professional.phone}
                              </div>
                              <div className="flex items-center text-sm text-gray-600">
                                <Users className="w-4 h-4 mr-2" />
                                {specialty?.name || "Sem especialidade"}
                              </div>
                              <div className="flex items-center text-sm text-blue-600 font-medium">
                                <Building2 className="w-4 h-4 mr-2" />
                                {client?.name || "Empresa não definida"}
                              </div>
                            </div>
                            
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditProfessional(professional)}
                                className="flex-1"
                              >
                                <Edit className="w-4 h-4 mr-1" />
                                Editar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteProfessional(professional)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>

                {/* Empty State */}
                {!professionalsLoading && professionalsData.length === 0 && (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum profissional encontrado</h3>
                    <p className="text-gray-600 mb-4">Comece adicionando seu primeiro profissional ao sistema.</p>
                    <Button
                      onClick={() => {
                        setEditingProfessional(null);
                        resetProfessionalForm();
                        setShowProfessionalModal(true);
                      }}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Profissional
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : activeSection === "Config. Profissionais" ? (
            <ConfigProfissionais />
          ) : activeSection === "Serviços" ? (
            <div className="p-6">
              <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                  <h1 className="text-2xl font-bold text-gray-900">Gerenciar Serviços</h1>
                  <Button
                    onClick={() => {
                      setEditingService(null);
                      resetServiceForm();
                      setShowServiceModal(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Serviço
                  </Button>
                </div>

                {/* Filtro por Empresa */}
                <div className="mb-6">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Filtrar por Empresa
                      </label>
                      <Select value={selectedClientIdServices || undefined} onValueChange={(value) => setSelectedClientIdServices(value || "all")}>
                        <SelectTrigger className="w-full">
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Buscar por Email da Empresa
                      </label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          placeholder="Digite o email da empresa..."
                          onChange={(e) => {
                            const email = e.target.value.toLowerCase();
                            const client = clientsData?.find((c: any) =>
                              c.email.toLowerCase().includes(email)
                            );
                            if (client && email.length > 2) {
                              setSelectedClientIdServices(client.id);
                            } else if (email.length === 0) {
                              setSelectedClientIdServices("all");
                            }
                          }}
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="mb-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Buscar serviços..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Loading State */}
                {servicesLoading && (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Carregando serviços...</p>
                  </div>
                )}

                {/* Services Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(servicesData as any[])
                    .filter((service: any) => {
                      // Filtro por empresa
                      const matchesClient = !selectedClientIdServices || selectedClientIdServices === "all" || service.clientId === selectedClientIdServices;
                      // Filtro por busca
                      const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                          service.description.toLowerCase().includes(searchTerm.toLowerCase());
                      return matchesClient && matchesSearch;
                    })
                    .map((service: any) => {
                      const specialty = (specialtiesData as any[]).find((s: any) => s.id === service.specialtyId);
                      const client = (clientsData as any[])?.find((c: any) => c.id === service.clientId);
                      return (
                        <Card key={service.id} className="hover:shadow-lg transition-shadow">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-lg">{service.name}</CardTitle>
                              <Badge 
                                variant={service.isActive ? "default" : "secondary"}
                                className={service.isActive ? "bg-green-100 text-green-800" : ""}
                              >
                                {service.isActive ? "Ativo" : "Inativo"}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3 mb-4">
                              <p className="text-sm text-gray-600 line-clamp-2">
                                {service.description}
                              </p>
                              
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  <span className="font-medium text-gray-700">Duração:</span>
                                  <p className="text-gray-600">{service.duration} min</p>
                                </div>
                                <div>
                                  <span className="font-medium text-gray-700">Preço:</span>
                                  <p className="text-gray-600">R$ {service.price}</p>
                                </div>
                              </div>
                              
                              <div>
                                <span className="font-medium text-gray-700">Especialidade:</span>
                                <p className="text-gray-600">{specialty?.name || "Sem especialidade"}</p>
                              </div>

                              <div className="flex items-center text-sm text-blue-600 font-medium">
                                <Building2 className="w-4 h-4 mr-2" />
                                {client?.name || "Empresa não definida"}
                              </div>
                            </div>
                            
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditService(service)}
                                className="flex-1"
                              >
                                <Edit className="w-4 h-4 mr-1" />
                                Editar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteService(service)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>

                {/* Empty State */}
                {!servicesLoading && (servicesData as any[]).length === 0 && (
                  <div className="text-center py-12">
                    <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum serviço encontrado</h3>
                    <p className="text-gray-600 mb-4">Comece adicionando seu primeiro serviço ao sistema.</p>
                    <Button
                      onClick={() => {
                        setEditingService(null);
                        resetServiceForm();
                        setShowServiceModal(true);
                      }}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Serviço
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : activeSection === "Especialidades" ? (
            <div className="p-4 sm:p-6">
              <div className="max-w-6xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Gerenciar Especialidades</h1>
                  <Button
                    onClick={() => {
                      setEditingSpecialty(null);
                      resetSpecialtyForm();
                      setShowSpecialtyModal(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Especialidade
                  </Button>
                </div>

                {/* Filtro por Empresa */}
                <div className="mb-6">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Filtrar por Empresa
                      </label>
                      <Select value={selectedClientIdSpecialties || undefined} onValueChange={(value) => setSelectedClientIdSpecialties(value || "all")}>
                        <SelectTrigger className="w-full">
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Buscar por Email da Empresa
                      </label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          placeholder="Digite o email da empresa..."
                          onChange={(e) => {
                            const email = e.target.value.toLowerCase();
                            const client = clientsData?.find((c: any) =>
                              c.email.toLowerCase().includes(email)
                            );
                            if (client && email.length > 2) {
                              setSelectedClientIdSpecialties(client.id);
                            } else if (email.length === 0) {
                              setSelectedClientIdSpecialties("all");
                            }
                          }}
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="mb-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Buscar especialidades..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Loading State */}
                {specialtiesLoading && (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Carregando especialidades...</p>
                  </div>
                )}

                {/* Specialties Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {(specialtiesData as any[])
                    .filter((specialty: any) => {
                      // Filtro por empresa (quando o campo clientId existir)
                      const matchesClient = !selectedClientIdSpecialties || selectedClientIdSpecialties === "all" ||
                                          (specialty.clientId && specialty.clientId === selectedClientIdSpecialties);
                      // Filtro por busca
                      const matchesSearch = specialty.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                          (specialty.description && specialty.description.toLowerCase().includes(searchTerm.toLowerCase()));
                      return matchesClient && matchesSearch;
                    })
                    .map((specialty: any) => {
                      const client = (clientsData as any[])?.find((c: any) => c.id === specialty.clientId);
                      return (
                        <Card key={specialty.id} className="hover:shadow-lg transition-shadow">
                          <CardHeader className="pb-3">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                              <div className="flex items-center space-x-3">
                                <div
                                  className="w-4 h-4 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: specialty.color || '#3B82F6' }}
                                />
                                <CardTitle className="text-base sm:text-lg truncate">{specialty.name}</CardTitle>
                              </div>
                              <Badge
                                variant={specialty.isActive ? "default" : "secondary"}
                                className={`${specialty.isActive ? "bg-green-100 text-green-800" : ""} flex-shrink-0`}
                              >
                                {specialty.isActive ? "Ativa" : "Inativa"}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              <div>
                                <p className="text-sm text-gray-600">
                                  {specialty.description || "Sem descrição disponível"}
                                </p>
                              </div>

                              <div className="flex items-center text-sm text-blue-600 font-medium">
                                <Building2 className="w-4 h-4 mr-2" />
                                {client?.name || "Empresa não definida"}
                              </div>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row gap-2 mt-4">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditSpecialty(specialty)}
                                className="flex-1"
                              >
                                <Edit className="w-4 h-4 mr-1" />
                                Editar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteSpecialty(specialty)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 sm:w-auto"
                              >
                                <Trash2 className="w-4 h-4 sm:mr-0 mr-1" />
                                <span className="sm:hidden">Excluir</span>
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>

                {/* Empty State */}
                {!specialtiesLoading && (specialtiesData as any[]).length === 0 && (
                  <div className="text-center py-12">
                    <Tag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma especialidade encontrada</h3>
                    <p className="text-gray-600 mb-4">Comece adicionando sua primeira especialidade ao sistema.</p>
                    <Button
                      onClick={() => {
                        setEditingSpecialty(null);
                        resetSpecialtyForm();
                        setShowSpecialtyModal(true);
                      }}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Especialidade
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : activeSection === "Clientes" ? (
            <div className="p-6">
              <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                  <h1 className="text-2xl font-bold text-gray-900">Gerenciar Clientes</h1>
                  <Button
                    onClick={() => {
                      setEditingCustomer(null);
                      resetCustomerForm();
                      setShowCustomerModal(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Cliente
                  </Button>
                </div>

                {/* Filtro por Empresa */}
                <div className="mb-6">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Filtrar por Empresa
                      </label>
                      <Select value={selectedClientIdCustomers || undefined} onValueChange={(value) => setSelectedClientIdCustomers(value || "all")}>
                        <SelectTrigger className="w-full">
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Buscar por Email da Empresa
                      </label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          placeholder="Digite o email da empresa..."
                          onChange={(e) => {
                            const email = e.target.value.toLowerCase();
                            const client = clientsData?.find((c: any) =>
                              c.email.toLowerCase().includes(email)
                            );
                            if (client && email.length > 2) {
                              setSelectedClientIdCustomers(client.id);
                            } else if (email.length === 0) {
                              setSelectedClientIdCustomers("all");
                            }
                          }}
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="mb-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Buscar clientes..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Loading State */}
                {customersLoading && (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Carregando clientes...</p>
                  </div>
                )}

                {/* Customers Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(customersData as any[])
                    .filter((customer: any) => {
                      // Filtro por empresa
                      const matchesClient = !selectedClientIdCustomers || selectedClientIdCustomers === "all" ||
                                          customer.clientId === selectedClientIdCustomers;
                      // Filtro por busca
                      const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                          (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase()));
                      return matchesClient && matchesSearch;
                    })
                    .map((customer: any) => {
                      const associatedClient = customer.clientId 
                        ? (clientsData as any[])?.find((client: any) => client.id === customer.clientId)
                        : null;
                      
                      return (
                        <Card key={customer.id} className="hover:shadow-lg transition-shadow">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-lg">{customer.name}</CardTitle>
                              <Badge 
                                variant="default"
                                className="bg-green-100 text-green-800"
                              >
                                Ativo
                              </Badge>
                            </div>
                            {associatedClient && (
                              <div className="mt-2">
                                <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                                  <Building2 className="w-3 h-3 mr-1" />
                                  {associatedClient.name}
                                </Badge>
                              </div>
                            )}
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3 mb-4">
                              <div className="flex items-center text-sm text-gray-600">
                                <Mail className="w-4 h-4 mr-2" />
                                {customer.email}
                              </div>
                              <div className="flex items-center text-sm text-gray-600">
                                <Phone className="w-4 h-4 mr-2" />
                                {customer.phone}
                              </div>
                              <div className="text-xs text-gray-500">
                                Criado em: {new Date(customer.createdAt).toLocaleDateString('pt-BR')}
                              </div>
                            </div>
                            
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditCustomer(customer)}
                                className="flex-1"
                              >
                                <Edit className="w-4 h-4 mr-1" />
                                Editar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteCustomer(customer.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>

                {/* Empty State */}
                {!customersLoading && (customersData as any[]).length === 0 && (
                  <div className="text-center py-12">
                    <UserCog className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum cliente encontrado</h3>
                    <p className="text-gray-600 mb-4">Comece adicionando seu primeiro cliente ao sistema.</p>
                    <Button
                      onClick={() => {
                        setEditingCustomer(null);
                        resetCustomerForm();
                        setShowCustomerModal(true);
                      }}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Cliente
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : activeSection === "Empresa" && !isCompanyAdmin ? (
            <div className="p-6">
              <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                  <h1 className="text-2xl font-bold text-gray-900">Gerenciar Empresas</h1>
                  <Button
                    onClick={() => {
                      setEditingClient(null);
                      resetClientForm();
                      setShowClientModal(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Empresa
                  </Button>
                </div>

                {/* Search Bar */}
                <div className="mb-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Buscar empresas..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Loading State */}
                {clientsLoading && (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Carregando empresas...</p>
                  </div>
                )}

                {/* Clients Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(clientsData as any[])
                    .filter((client: any) => 
                      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      client.email.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((client: any) => {
                      return (
                        <Card key={client.id} className="hover:shadow-lg transition-shadow">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-lg">{client.name}</CardTitle>
                              <Badge 
                                variant={client.isActive ? "default" : "secondary"}
                                className={client.isActive ? "bg-green-100 text-green-800" : ""}
                              >
                                {client.isActive ? "Ativo" : "Inativo"}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3 mb-4">
                              <div className="flex items-center text-sm text-gray-600">
                                <Mail className="w-4 h-4 mr-2" />
                                {client.email}
                              </div>
                              <div className="flex items-center text-sm text-gray-600">
                                <Phone className="w-4 h-4 mr-2" />
                                {client.phone}
                              </div>
                              <div className="flex items-center text-sm text-gray-600">
                                <Building2 className="w-4 h-4 mr-2" />
                                {client.serviceType || "Tipo de serviço não definido"}
                              </div>
                              <div className="text-xs text-gray-500">
                                Criado em: {new Date(client.createdAt).toLocaleDateString('pt-BR')}
                              </div>
                            </div>
                            
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditClient(client)}
                                className="flex-1"
                              >
                                <Edit className="w-4 h-4 mr-1" />
                                Editar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteClient(client)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>

                {/* Empty State */}
                {!clientsLoading && (clientsData as any[]).length === 0 && (
                  <div className="text-center py-12">
                    <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma empresa encontrada</h3>
                    <p className="text-gray-600 mb-4">Comece adicionando a primeira empresa ao sistema.</p>
                    <Button
                      onClick={() => {
                        setEditingClient(null);
                        resetClientForm();
                        setShowClientModal(true);
                      }}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Nova Empresa
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : activeSection === "Canais" && !isCompanyAdmin ? (
            <WhatsAppChannels />
          ) : activeSection === "Agente IA" && !isCompanyAdmin ? (
            <AIAgent />
          ) : activeSection === "Configurações" ? (
            <Configuracoes />
          ) : activeSection === "Empresas" && !isCompanyAdmin ? (
            <div className="p-6">
              <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Gerenciamento de Empresas</h1>
                <CompaniesManagement />
              </div>
            </div>
          ) : activeSection === "Dashboard" ? (
            <div className="p-6 space-y-6">
              <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard Executivo</h1>

                {dashboardLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-600">Carregando métricas...</span>
                  </div>
                ) : (
                  <>
                    {/* Métricas Principais */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-600">Receita Total</p>
                              <p className="text-2xl font-bold text-green-600">
                                R$ {dashboardData?.metrics?.totalRevenue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                              </p>
                              <p className="text-xs text-gray-500">Baseado em agendamentos concluídos</p>
                            </div>
                            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                              <CreditCard className="w-6 h-6 text-green-600" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-600">Agendamentos</p>
                              <p className="text-2xl font-bold text-blue-600">
                                {dashboardData?.metrics?.totalAppointments || 0}
                              </p>
                              <p className="text-xs text-gray-500">Total de agendamentos</p>
                            </div>
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                              <Calendar className="w-6 h-6 text-blue-600" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-600">Empresas Ativas</p>
                              <p className="text-2xl font-bold text-purple-600">
                                {dashboardData?.metrics?.totalClients || 0}
                              </p>
                              <p className="text-xs text-gray-500">Empresas cadastradas</p>
                            </div>
                            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                              <Building2 className="w-6 h-6 text-purple-600" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-600">Profissionais</p>
                              <p className="text-2xl font-bold text-orange-600">
                                {dashboardData?.metrics?.totalProfessionals || 0}
                              </p>
                              <p className="text-xs text-gray-500">Profissionais ativos</p>
                            </div>
                            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                              <Users className="w-6 h-6 text-orange-600" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </>
                )}

                {!dashboardLoading && (
                  <>
                    {/* Gráficos e Estatísticas */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                      <Card>
                        <CardHeader>
                          <CardTitle>Receita Mensal</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="h-64 flex flex-col items-center justify-center bg-gray-50 rounded-lg">
                            <div className="text-center">
                              <p className="text-3xl font-bold text-green-600 mb-2">
                                R$ {dashboardData?.metrics?.monthlyRevenue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                              </p>
                              <p className="text-gray-500">Receita estimada do mês</p>
                              <p className="text-xs text-gray-400 mt-2">
                                *Baseado em agendamentos concluídos
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>Agendamentos por Especialidade</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {dashboardData?.appointmentsBySpecialty && Object.keys(dashboardData.appointmentsBySpecialty).length > 0 ? (
                              Object.entries(dashboardData.appointmentsBySpecialty)
                                .sort(([,a], [,b]) => (b as number) - (a as number))
                                .slice(0, 5)
                                .map(([specialty, count], index) => {
                                  const maxCount = Math.max(...Object.values(dashboardData.appointmentsBySpecialty));
                                  const percentage = ((count as number) / maxCount) * 100;
                                  const colors = ['bg-blue-600', 'bg-green-600', 'bg-purple-600', 'bg-orange-600', 'bg-red-600'];

                                  return (
                                    <div key={specialty}>
                                      <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">{specialty}</span>
                                        <span className="text-sm font-medium">{count}</span>
                                      </div>
                                      <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                          className={`${colors[index % colors.length]} h-2 rounded-full`}
                                          style={{width: `${percentage}%`}}
                                        ></div>
                                      </div>
                                    </div>
                                  );
                                })
                            ) : (
                              <div className="text-center py-8">
                                <p className="text-gray-500">Nenhum agendamento encontrado</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </>
                )}

                {!dashboardLoading && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Atividades Recentes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {dashboardData?.recentActivities && dashboardData.recentActivities.length > 0 ? (
                          dashboardData.recentActivities.map((activity: any, index: number) => {
                            const getIcon = (type: string) => {
                              switch (type) {
                                case 'client':
                                  return <Building2 className="w-4 h-4 text-green-600" />;
                                case 'appointment':
                                  return <Calendar className="w-4 h-4 text-blue-600" />;
                                default:
                                  return <Plus className="w-4 h-4 text-gray-600" />;
                              }
                            };

                            const getBgColor = (type: string) => {
                              switch (type) {
                                case 'client':
                                  return 'bg-green-100';
                                case 'appointment':
                                  return 'bg-blue-100';
                                default:
                                  return 'bg-gray-100';
                              }
                            };

                            const formatTime = (time: string) => {
                              if (!time) return 'Recente';
                              const date = new Date(time);
                              const now = new Date();
                              const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

                              if (diffInHours < 1) return 'Há poucos minutos';
                              if (diffInHours < 24) return `Há ${diffInHours} hora${diffInHours > 1 ? 's' : ''}`;
                              const diffInDays = Math.floor(diffInHours / 24);
                              return `Há ${diffInDays} dia${diffInDays > 1 ? 's' : ''}`;
                            };

                            return (
                              <div key={index} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                                <div className={`w-8 h-8 ${getBgColor(activity.type)} rounded-full flex items-center justify-center`}>
                                  {getIcon(activity.type)}
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-medium">{activity.description}</p>
                                  <p className="text-xs text-gray-500">{formatTime(activity.time)}</p>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-center py-8">
                            <p className="text-gray-500">Nenhuma atividade recente</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          ) : activeSection === "Pagamentos" ? (
            <div className="p-6 space-y-6">
              <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Gestão de Pagamentos</h1>

                {/* Resumo Financeiro */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Receita Total</p>
                          <p className="text-2xl font-bold text-green-600">R$ 125.430</p>
                          <p className="text-xs text-green-600">+12% este mês</p>
                        </div>
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                          <CreditCard className="w-6 h-6 text-green-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Receita Mensal</p>
                          <p className="text-2xl font-bold text-blue-600">R$ 28.750</p>
                          <p className="text-xs text-blue-600">Meta: R$ 30.000</p>
                        </div>
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <BarChart3 className="w-6 h-6 text-blue-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Assinaturas Ativas</p>
                          <p className="text-2xl font-bold text-purple-600">47</p>
                          <p className="text-xs text-purple-600">+3 novas</p>
                        </div>
                        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                          <Users className="w-6 h-6 text-purple-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Faturas Pendentes</p>
                          <p className="text-2xl font-bold text-orange-600">8</p>
                          <p className="text-xs text-orange-600">R$ 4.200 total</p>
                        </div>
                        <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                          <Clock className="w-6 h-6 text-orange-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Planos e Assinaturas */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  <Card>
                    <CardHeader>
                      <CardTitle>Planos de Assinatura</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-lg">Plano Básico</h3>
                            <Badge variant="secondary">15 empresas</Badge>
                          </div>
                          <p className="text-2xl font-bold text-green-600 mb-2">R$ 99/mês</p>
                          <p className="text-sm text-gray-600">Até 3 profissionais por empresa</p>
                        </div>

                        <div className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-lg">Plano Profissional</h3>
                            <Badge variant="secondary">25 empresas</Badge>
                          </div>
                          <p className="text-2xl font-bold text-blue-600 mb-2">R$ 199/mês</p>
                          <p className="text-sm text-gray-600">Até 10 profissionais por empresa</p>
                        </div>

                        <div className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-lg">Plano Enterprise</h3>
                            <Badge variant="secondary">7 empresas</Badge>
                          </div>
                          <p className="text-2xl font-bold text-purple-600 mb-2">R$ 399/mês</p>
                          <p className="text-sm text-gray-600">Profissionais ilimitados</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Configurações do Asaas</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                          <div>
                            <p className="font-medium text-green-800">Status da Integração</p>
                            <p className="text-sm text-green-600">Conectado e funcionando</p>
                          </div>
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        </div>

                        <div className="space-y-2">
                          <Label>API Key do Asaas</Label>
                          <Input
                            type="password"
                            value="$aact_YTU5YjRlM2I4ODRlNDEyZGI4MjA2YTQyZjU2NDNkMzQ6OjAwMDAwMDAwMDAwMDAwNzI1Mjk6OiRhYWNoXzRlNTU3YWI5LTEwZDItNGI4Zi1iZGY1LTZkNzI4YjUxZjcwMw=="
                            readOnly
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Webhook URL</Label>
                          <Input
                            value="https://semprecheio.app/api/asaas/webhook"
                            readOnly
                          />
                        </div>

                        <Button className="w-full">
                          Testar Conexão
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Transações Recentes */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Transações Recentes</CardTitle>
                      <Button variant="outline" size="sm">
                        Ver Todas
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2">Empresa</th>
                            <th className="text-left py-2">Plano</th>
                            <th className="text-left py-2">Valor</th>
                            <th className="text-left py-2">Status</th>
                            <th className="text-left py-2">Data</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b">
                            <td className="py-3">Clínica São Paulo</td>
                            <td className="py-3">Profissional</td>
                            <td className="py-3 font-semibold text-green-600">R$ 199,00</td>
                            <td className="py-3">
                              <Badge className="bg-green-100 text-green-800">Pago</Badge>
                            </td>
                            <td className="py-3 text-gray-600">01/07/2025</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-3">Consultório Central</td>
                            <td className="py-3">Básico</td>
                            <td className="py-3 font-semibold text-green-600">R$ 99,00</td>
                            <td className="py-3">
                              <Badge className="bg-green-100 text-green-800">Pago</Badge>
                            </td>
                            <td className="py-3 text-gray-600">01/07/2025</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-3">Clínica Premium</td>
                            <td className="py-3">Enterprise</td>
                            <td className="py-3 font-semibold text-orange-600">R$ 399,00</td>
                            <td className="py-3">
                              <Badge className="bg-orange-100 text-orange-800">Pendente</Badge>
                            </td>
                            <td className="py-3 text-gray-600">28/06/2025</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-3">Médicos Associados</td>
                            <td className="py-3">Profissional</td>
                            <td className="py-3 font-semibold text-green-600">R$ 199,00</td>
                            <td className="py-3">
                              <Badge className="bg-green-100 text-green-800">Pago</Badge>
                            </td>
                            <td className="py-3 text-gray-600">30/06/2025</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <>
              {viewMode === "month" && renderCalendarGrid()}
              {viewMode === "week" && renderWeekView()}
              {viewMode === "day" && renderDayView()}
            </>
          )}
        </div>
      </div>

      {/* Painel Direito - Profissionais & Filtros - só aparece na seção Agenda */}
      {activeSection === 'Agenda' && (
        <div className="hidden xl:flex w-64 bg-white border-l border-gray-200 flex-col">
        {/* Campo de busca */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Input
              placeholder="Buscar profissional"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10 border-gray-300"
            />
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
        </div>

        {/* Lista de profissionais */}
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-sm font-bold text-gray-800 mb-4">Profissionais</h3>
          
          <div className="space-y-3">
            {filteredProfessionals.map((professional) => (
              <div key={professional.id} className="flex items-center space-x-3">
                <Checkbox
                  checked={professional.selected}
                  onCheckedChange={() => toggleProfessional(professional.id)}
                />
                
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                  style={{ backgroundColor: professional.color }}
                >
                  {professional.name.charAt(0)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-bold truncate ${
                    professional.selected ? 'text-blue-600' : 'text-gray-800'
                  }`} style={{ fontSize: '14px' }}>
                    {professional.name}
                  </div>
                  <div className="text-xs text-gray-500 truncate" style={{ fontSize: '12px', color: '#6B7280' }}>
                    {professional.role}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Área de filtros */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-800" style={{ fontSize: '12px' }}>Filtros</h3>
            <button 
              onClick={clearAllFilters}
              className="text-xs hover:underline"
              style={{ color: '#2563EB', fontSize: '12px' }}
            >
              Limpar todos
            </button>
          </div>
          
          <div className="space-y-2">
            {filters.map((filter) => (
              <div key={filter.id} className="flex items-center space-x-2">
                <Checkbox
                  checked={filter.checked}
                  onCheckedChange={() => toggleFilter(filter.id)}
                />
                <label className="text-xs text-gray-700 cursor-pointer" style={{ fontSize: '12px' }}>
                  {filter.label}
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>
      )}

      {/* Modal de detalhes do agendamento */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="w-full max-w-md mx-4 sm:mx-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">Detalhes do Agendamento</DialogTitle>
            <DialogDescription className="text-sm">
              Visualize e gerencie as informações do agendamento selecionado.
            </DialogDescription>
          </DialogHeader>
          
          {selectedEvent && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg border-l-4" style={{ 
                backgroundColor: `${selectedEvent.color}20`,
                borderLeftColor: selectedEvent.color 
              }}>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="font-medium text-gray-600">Cliente:</span>
                    <p className="text-gray-900">{selectedEvent.customerName || 'Nome não encontrado'}</p>
                    {(() => {
                      // Buscar telefone do customer a partir dos dados do appointment
                      const appointment = appointmentsData ? (appointmentsData as any[]).find((a: any) => a.id === selectedEvent.id) : null;
                      const customerPhone = appointment?.customerPhone;
                      return customerPhone ? (
                        <p className="text-sm text-gray-500 mt-1">Telefone: {customerPhone}</p>
                      ) : null;
                    })()}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="font-medium text-gray-600">Hora de Início:</span>
                      <p className="text-gray-900">
                        {selectedEvent.startTime?.slice(0, 5) || selectedEvent.time || 'Não definido'}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Hora de Fim:</span>
                      <p className="text-gray-900">
                        {selectedEvent.endTime?.slice(0, 5) || 'Não definido'}
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <span className="font-medium text-gray-600">Profissional:</span>
                    <p className="text-gray-900">{selectedEvent.professionalName || 'Profissional não encontrado'}</p>
                    {(() => {
                      const professional = professionalsData ? (professionalsData as any[]).find((p: any) => p.id === selectedEvent.professionalId) : null;
                      const specialty = professional && specialtiesData ? (specialtiesData as any[]).find((s: any) => s.id === professional.specialtyId) : null;
                      return specialty ? (
                        <p className="text-sm text-gray-500 mt-1">Especialidade: {specialty.name}</p>
                      ) : null;
                    })()}
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Serviço:</span>
                    <p className="text-gray-900">{selectedEvent.serviceName || 'Serviço não encontrado'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Status:</span>
                    <p className="text-gray-900">{selectedEvent.status || 'Confirmado'}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <Button 
                  size="sm" 
                  className="flex-1 flex items-center justify-center space-x-1"
                  onClick={() => handleEditAppointment(selectedEvent)}
                >
                  <Edit className="w-3 h-3" />
                  <span>Editar</span>
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive" 
                  className="flex-1 flex items-center justify-center space-x-1"
                  onClick={() => {
                    setAppointmentToCancel(selectedEvent);
                    setShowCancelConfirm(true);
                  }}
                >
                  <X className="w-3 h-3" />
                  <span>Cancelar</span>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de novo agendamento */}
      <Dialog open={showNewEventModal} onOpenChange={setShowNewEventModal}>
        <DialogContent className="w-full max-w-2xl mx-4 sm:mx-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">Novo Agendamento</DialogTitle>
            <DialogDescription className="text-sm">
              {appointmentForm.appointment_time ? (
                <>
                  Criar agendamento para {new Date(appointmentForm.appointment_time).toLocaleDateString('pt-BR')} às {new Date(appointmentForm.appointment_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </>
              ) : (
                'Preencha os dados para criar um novo agendamento.'
              )}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitAppointment} className="space-y-4">
            {/* Empresa/Cliente */}
            <div className="space-y-2">
              <Label htmlFor="client_id">Empresa/Cliente *</Label>
              <Select
                value={appointmentForm.client_id}
                onValueChange={(value) => setAppointmentForm(prev => ({ ...prev, client_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma empresa..." />
                </SelectTrigger>
                <SelectContent>
                  {clientsData?.map((client: any) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Profissional */}
            <div className="space-y-2">
              <Label htmlFor="professional_id">Profissional *</Label>
              <Select
                value={appointmentForm.professional_id}
                onValueChange={(value) => setAppointmentForm(prev => ({ ...prev, professional_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um profissional..." />
                </SelectTrigger>
                <SelectContent>
                  {professionalsData?.map((professional: any) => (
                    <SelectItem key={professional.id} value={professional.id}>
                      {professional.name} - {professional.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Especialidade */}
            <div className="space-y-2">
              <Label htmlFor="specialty_id">Especialidade</Label>
              <Select
                value={appointmentForm.specialty_id}
                onValueChange={(value) => setAppointmentForm(prev => ({ ...prev, specialty_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma especialidade..." />
                </SelectTrigger>
                <SelectContent>
                  {specialtiesData?.map((specialty: any) => (
                    <SelectItem key={specialty.id} value={specialty.id}>
                      {specialty.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Serviço */}
            <div className="space-y-2">
              <Label htmlFor="service_id">Serviço *</Label>
              <Select
                value={appointmentForm.service_id}
                onValueChange={(value) => setAppointmentForm(prev => ({ ...prev, service_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um serviço..." />
                </SelectTrigger>
                <SelectContent>
                  {servicesData?.map((service: any) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name} - {service.category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Cliente Final */}
            <div className="space-y-2">
              <Label htmlFor="customer_id">Cliente Final (opcional)</Label>
              <Select
                value={appointmentForm.customer_id}
                onValueChange={(value) => setAppointmentForm(prev => ({ ...prev, customer_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente (opcional)..." />
                </SelectTrigger>
                <SelectContent>
                  {customersData?.map((customer: any) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name} - {customer.phone || customer.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Horário Disponível */}
            <div className="space-y-2">
              <Label htmlFor="availability_id">Horário Disponível *</Label>
              <Select
                value={appointmentForm.availability_id}
                onValueChange={(value) => setAppointmentForm(prev => ({ ...prev, availability_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um horário..." />
                </SelectTrigger>
                <SelectContent>
                  {availabilityData?.filter((slot: any) => slot.isActive).map((slot: any) => (
                    <SelectItem key={slot.id} value={slot.id}>
                      {slot.date ? new Date(slot.date).toLocaleDateString('pt-BR') : 'Recorrente'} - {slot.startTime} às {slot.endTime}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Data/Hora do Agendamento */}
            <div className="space-y-2">
              <Label htmlFor="appointment_time">Data e Hora do Agendamento</Label>
              <Input
                type="datetime-local"
                value={appointmentForm.appointment_time}
                onChange={(e) => setAppointmentForm(prev => ({ ...prev, appointment_time: e.target.value }))}
              />
            </div>

            {/* Nome do Cliente (opcional) */}
            <div className="space-y-2">
              <Label htmlFor="customer_name">Nome do Cliente (opcional)</Label>
              <Input
                type="text"
                placeholder="Nome completo do cliente"
                value={appointmentForm.customer_name}
                onChange={(e) => setAppointmentForm(prev => ({ ...prev, customer_name: e.target.value }))}
              />
            </div>

            {/* Telefone do Cliente (opcional) */}
            <div className="space-y-2">
              <Label htmlFor="customer_phone">Telefone do Cliente (opcional)</Label>
              <Input
                type="tel"
                placeholder="(11) 99999-9999"
                value={appointmentForm.customer_phone}
                onChange={(e) => setAppointmentForm(prev => ({ ...prev, customer_phone: e.target.value }))}
              />
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={appointmentForm.status}
                onValueChange={(value) => setAppointmentForm(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="confirmado">Confirmado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Botões */}
            <div className="flex space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowNewEventModal(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createAppointmentMutation.isPending}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {createAppointmentMutation.isPending ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Criando...
                  </div>
                ) : (
                  "Criar Agendamento"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de criação/edição de profissional */}
      <Dialog open={showProfessionalModal} onOpenChange={setShowProfessionalModal}>
        <DialogContent className="w-full max-w-md mx-4 sm:mx-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">
              {editingProfessional ? "Editar Profissional" : "Novo Profissional"}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {editingProfessional ? "Atualize as informações do profissional." : "Adicione um novo profissional ao sistema."}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmitProfessional} className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-sm font-medium">
                Nome Completo
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Ex: Maria Silva"
                value={professionalForm.name}
                onChange={(e) => setProfessionalForm(prev => ({ ...prev, name: e.target.value }))}
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="email" className="text-sm font-medium">
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="maria@exemplo.com"
                value={professionalForm.email}
                onChange={(e) => setProfessionalForm(prev => ({ ...prev, email: e.target.value }))}
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="phone" className="text-sm font-medium">
                Telefone
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(11) 99999-9999"
                value={professionalForm.phone}
                onChange={(e) => setProfessionalForm(prev => ({ ...prev, phone: e.target.value }))}
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="specialtyId" className="text-sm font-medium">
                Especialidade
              </Label>
              <Select
                value={professionalForm.specialtyId}
                onValueChange={(value) => setProfessionalForm(prev => ({ ...prev, specialtyId: value }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione uma especialidade" />
                </SelectTrigger>
                <SelectContent>
                  {specialtiesData.map((specialty) => (
                    <SelectItem key={specialty.id} value={specialty.id}>
                      {specialty.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="clientId" className="text-sm font-medium">
                Empresa
              </Label>
              <Select
                value={professionalForm.clientId}
                onValueChange={(value) => setProfessionalForm(prev => ({ ...prev, clientId: value }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione uma empresa" />
                </SelectTrigger>
                <SelectContent>
                  {(clientsData as any[])?.map((client: any) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="flex space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowProfessionalModal(false);
                  setEditingProfessional(null);
                  resetProfessionalForm();
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createProfessionalMutation.isPending || updateProfessionalMutation.isPending}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {createProfessionalMutation.isPending || updateProfessionalMutation.isPending ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Salvando...
                  </div>
                ) : (
                  editingProfessional ? "Atualizar" : "Criar"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de criação/edição de serviço */}
      <Dialog open={showServiceModal} onOpenChange={setShowServiceModal}>
        <DialogContent className="w-full max-w-md mx-4 sm:mx-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">
              {editingService ? "Editar Serviço" : "Novo Serviço"}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {editingService ? "Atualize as informações do serviço." : "Adicione um novo serviço ao sistema."}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmitService} className="space-y-4">
            <div>
              <Label htmlFor="serviceName" className="text-sm font-medium">
                Nome do Serviço
              </Label>
              <Input
                id="serviceName"
                type="text"
                placeholder="Ex: Limpeza de Pele"
                value={serviceForm.name}
                onChange={(e) => setServiceForm(prev => ({ ...prev, name: e.target.value }))}
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="serviceCategory" className="text-sm font-medium">
                Categoria
              </Label>
              <Input
                id="serviceCategory"
                type="text"
                placeholder="Ex: Estética, Fisioterapia, Massagem"
                value={serviceForm.category}
                onChange={(e) => setServiceForm(prev => ({ ...prev, category: e.target.value }))}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="serviceDescription" className="text-sm font-medium">
                Descrição
              </Label>
              <Input
                id="serviceDescription"
                type="text"
                placeholder="Descrição do serviço..."
                value={serviceForm.description}
                onChange={(e) => setServiceForm(prev => ({ ...prev, description: e.target.value }))}
                required
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="serviceDuration" className="text-sm font-medium">
                  Duração (min)
                </Label>
                <Input
                  id="serviceDuration"
                  type="number"
                  placeholder="60"
                  value={serviceForm.duration}
                  onChange={(e) => setServiceForm(prev => ({ ...prev, duration: e.target.value }))}
                  required
                  min="1"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="servicePrice" className="text-sm font-medium">
                  Preço (R$)
                </Label>
                <Input
                  id="servicePrice"
                  type="number"
                  placeholder="99.90"
                  value={serviceForm.price}
                  onChange={(e) => setServiceForm(prev => ({ ...prev, price: e.target.value }))}
                  required
                  min="0"
                  step="0.01"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="serviceClientId" className="text-sm font-medium">
                Empresa
              </Label>
              <Select
                value={serviceForm.clientId}
                onValueChange={(value) => setServiceForm(prev => ({ ...prev, clientId: value }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione uma empresa" />
                </SelectTrigger>
                <SelectContent>
                  {(clientsData as any[]).map((client: any) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="flex space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowServiceModal(false);
                  setEditingService(null);
                  resetServiceForm();
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createServiceMutation.isPending || updateServiceMutation.isPending}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {createServiceMutation.isPending || updateServiceMutation.isPending ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Salvando...
                  </div>
                ) : (
                  editingService ? "Atualizar" : "Criar"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de criação/edição de cliente */}
      <Dialog open={showClientModal} onOpenChange={setShowClientModal}>
        <DialogContent className="w-full max-w-md mx-4 sm:mx-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">
              {editingClient ? "Editar Cliente" : "Novo Cliente"}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {editingClient ? "Atualize as informações do cliente." : "Adicione um novo cliente ao sistema."}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmitClient} className="space-y-4">
            <div>
              <Label htmlFor="clientName" className="text-sm font-medium">
                Nome da Empresa/Cliente
              </Label>
              <Input
                id="clientName"
                type="text"
                placeholder="Ex: Clínica Beleza"
                value={clientForm.name}
                onChange={(e) => setClientForm(prev => ({ ...prev, name: e.target.value }))}
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="clientEmail" className="text-sm font-medium">
                E-mail
              </Label>
              <Input
                id="clientEmail"
                type="email"
                placeholder="contato@clinica.com"
                value={clientForm.email}
                onChange={(e) => setClientForm(prev => ({ ...prev, email: e.target.value }))}
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="clientPhone" className="text-sm font-medium">
                Telefone
              </Label>
              <Input
                id="clientPhone"
                type="tel"
                placeholder="(11) 99999-9999"
                value={clientForm.phone}
                onChange={(e) => setClientForm(prev => ({ ...prev, phone: e.target.value }))}
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="clientWhatsappInstance" className="text-sm font-medium">
                Instância WhatsApp
              </Label>
              <Input
                id="clientWhatsappInstance"
                type="text"
                placeholder="Ex: megacode-MFEV4XdMgfE"
                value={clientForm.whatsappInstanceUrl}
                onChange={(e) => setClientForm(prev => ({ ...prev, whatsappInstanceUrl: e.target.value }))}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="clientPassword" className="text-sm font-medium">
                Senha de Acesso {editingClient && "(deixe em branco para manter a atual)"}
              </Label>
              <Input
                id="clientPassword"
                type="password"
                placeholder={editingClient ? "Nova senha (opcional)" : "Senha para acesso"}
                value={clientForm.password}
                onChange={(e) => setClientForm(prev => ({ ...prev, password: e.target.value }))}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="clientServiceType" className="text-sm font-medium">
                Tipo de Serviço
              </Label>
              <Select
                value={clientForm.serviceType}
                onValueChange={(value) => setClientForm(prev => ({ ...prev, serviceType: value }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione o tipo de serviço" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="clinica_estetica">Clínica Estética</SelectItem>
                  <SelectItem value="salon_beleza">Salão de Beleza</SelectItem>
                  <SelectItem value="barbearia">Barbearia</SelectItem>
                  <SelectItem value="spa">Spa</SelectItem>
                  <SelectItem value="consultorio_medico">Consultório Médico</SelectItem>
                  <SelectItem value="centro_massagem">Centro de Massagem</SelectItem>
                  <SelectItem value="automacao_marketing">Automação de Marketing</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Campo personalizado - só aparece quando "Outros" é selecionado */}
            {clientForm.serviceType === "outros" && (
              <div>
                <Label htmlFor="clientCustomServiceType" className="text-sm font-medium">
                  Especifique o tipo de serviço
                </Label>
                <Input
                  id="clientCustomServiceType"
                  type="text"
                  placeholder="Ex: Academia, Pet Shop, Advocacia..."
                  value={clientForm.customServiceType}
                  onChange={(e) => setClientForm(prev => ({ ...prev, customServiceType: e.target.value }))}
                  required
                  className="mt-1"
                />
              </div>
            )}

            <DialogFooter className="flex space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowClientModal(false);
                  setEditingClient(null);
                  resetClientForm();
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createClientMutation.isPending || updateClientMutation.isPending}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {createClientMutation.isPending || updateClientMutation.isPending ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Salvando...
                  </div>
                ) : (
                  editingClient ? "Atualizar" : "Criar"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de criação/edição de customer */}
      <Dialog open={showCustomerModal} onOpenChange={setShowCustomerModal}>
        <DialogContent className="w-full max-w-md mx-4 sm:mx-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">
              {editingCustomer ? "Editar Usuário" : "Novo Usuário"}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {editingCustomer ? "Atualize as informações do usuário." : "Adicione um novo usuário ao sistema."}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmitCustomer} className="space-y-4">
            <div>
              <Label htmlFor="customerName" className="text-sm font-medium">
                Nome Completo
              </Label>
              <Input
                id="customerName"
                type="text"
                placeholder="Ex: João Silva"
                value={customerForm.name}
                onChange={(e) => setCustomerForm(prev => ({ ...prev, name: e.target.value }))}
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="customerClient" className="text-sm font-medium">
                Empresa (Opcional)
              </Label>
              <select
                id="customerClient"
                value={customerForm.clientId}
                onChange={(e) => setCustomerForm(prev => ({ ...prev, clientId: e.target.value }))}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Selecione uma empresa (opcional)</option>
                {(clientsData as any[])?.map((client: any) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="customerEmail" className="text-sm font-medium">
                E-mail
              </Label>
              <Input
                id="customerEmail"
                type="email"
                placeholder="joao@email.com"
                value={customerForm.email}
                onChange={(e) => setCustomerForm(prev => ({ ...prev, email: e.target.value }))}
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="customerPhone" className="text-sm font-medium">
                Telefone
              </Label>
              <Input
                id="customerPhone"
                type="tel"
                placeholder="(11) 99999-9999"
                value={customerForm.phone}
                onChange={(e) => setCustomerForm(prev => ({ ...prev, phone: e.target.value }))}
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="customerCpfCnpj" className="text-sm font-medium">
                CPF/CNPJ
              </Label>
              <Input
                id="customerCpfCnpj"
                type="text"
                placeholder="000.000.000-00 ou 00.000.000/0000-00"
                value={customerForm.cpfCnpj}
                onChange={(e) => setCustomerForm(prev => ({ ...prev, cpfCnpj: e.target.value }))}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="customerNotes" className="text-sm font-medium">
                Observações
              </Label>
              <Input
                id="customerNotes"
                type="text"
                placeholder="Observações sobre o cliente (opcional)"
                value={customerForm.notes}
                onChange={(e) => setCustomerForm(prev => ({ ...prev, notes: e.target.value }))}
                className="mt-1"
              />
            </div>

            <DialogFooter className="flex space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCustomerModal(false);
                  setEditingCustomer(null);
                  resetCustomerForm();
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createCustomerMutation.isPending || updateCustomerMutation.isPending}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {createCustomerMutation.isPending || updateCustomerMutation.isPending ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Salvando...
                  </div>
                ) : (
                  editingCustomer ? "Atualizar" : "Criar"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de edição de agendamento */}
      <Dialog open={showEditEventModal} onOpenChange={setShowEditEventModal}>
        <DialogContent className="w-full max-w-md mx-4 sm:mx-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">Editar Agendamento</DialogTitle>
            <DialogDescription className="text-sm">
              Atualize as informações do agendamento selecionado.
            </DialogDescription>
          </DialogHeader>
          
          {editingEvent && (
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(handleSubmitEditAppointment)} className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="scheduledAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="startTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hora de Início</FormLabel>
                        <FormControl>
                          <Input
                            type="time"
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editForm.control}
                    name="endTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hora de Fim</FormLabel>
                        <FormControl>
                          <Input
                            type="time"
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={editForm.control}
                  name="serviceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Serviço</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um serviço" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(servicesData as any[])?.map((service: any) => (
                            <SelectItem key={service.id} value={service.id}>
                              {service.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="professionalId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Profissional</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um profissional" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(professionalsData as any[])?.map((professional: any) => (
                            <SelectItem key={professional.id} value={professional.id}>
                              {professional.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <DialogFooter className="flex space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowEditEventModal(false)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateAppointmentMutation.isPending}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    {updateAppointmentMutation.isPending ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Salvando...
                      </div>
                    ) : (
                      "Atualizar"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Cancelamento */}
      <Dialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <DialogContent className="w-full max-w-md mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <X className="w-5 h-5" />
              Cancelar Agendamento
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-600 dark:text-gray-300">
              Confirma cancelar o agendamento do cliente{" "}
              <strong>{appointmentToCancel?.customerName}</strong> às{" "}
              <strong>{appointmentToCancel?.time}</strong>?
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              O horário será liberado automaticamente para novos agendamentos.
            </p>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCancelConfirm(false)}
              className="flex-1"
            >
              Voltar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (appointmentToCancel?.id) {
                  // Buscar o telefone diretamente dos dados de appointments
                  const appointment = (appointmentsData as any[])?.find((apt: any) => apt.id === appointmentToCancel.id);
                  const customerPhone = appointmentToCancel?.customerPhone || appointment?.customerPhone || appointment?.phone;
                  
                  if (customerPhone) {
                    cancelAppointmentMutation.mutate({ 
                      appointmentId: appointmentToCancel.id,
                      customerPhone: customerPhone
                    });
                  }
                }
              }}
              disabled={cancelAppointmentMutation.isPending}
              className="flex-1"
            >
              {cancelAppointmentMutation.isPending ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Cancelando...
                </div>
              ) : (
                "Cancelar Agora"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Logout */}
      <Dialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <DialogContent className="w-full max-w-md mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <LogOut className="w-5 h-5" />
              Confirmar Saída
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-600 dark:text-gray-300">
              Tem certeza que deseja sair do sistema? Você será redirecionado para a tela de login.
            </p>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowLogoutConfirm(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                logout.mutate();
                setShowLogoutConfirm(false);
              }}
              disabled={logout.isPending}
              className="flex-1"
            >
              {logout.isPending ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saindo...
                </div>
              ) : (
                "Confirmar Saída"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Exclusão de Profissional */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="w-full max-w-md mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              Excluir Profissional
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-600 dark:text-gray-300">
              Tem certeza que deseja excluir o profissional{" "}
              <strong>{professionalToDelete?.name}</strong>?
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Esta ação não pode ser desfeita. Todos os agendamentos relacionados serão afetados.
            </p>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowDeleteConfirm(false);
                setProfessionalToDelete(null);
              }}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDeleteProfessional}
              disabled={deleteProfessionalMutation.isPending}
              className="flex-1"
            >
              {deleteProfessionalMutation.isPending ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Excluindo...
                </div>
              ) : (
                "Excluir"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Exclusão de Serviço */}
      <Dialog open={showDeleteServiceConfirm} onOpenChange={setShowDeleteServiceConfirm}>
        <DialogContent className="w-full max-w-md mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              Excluir Serviço
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-600 dark:text-gray-300">
              Tem certeza que deseja excluir o serviço{" "}
              <strong>{serviceToDelete?.name}</strong>?
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Esta ação não pode ser desfeita. Todos os agendamentos relacionados serão afetados.
            </p>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowDeleteServiceConfirm(false);
                setServiceToDelete(null);
              }}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDeleteService}
              disabled={deleteServiceMutation.isPending}
              className="flex-1"
            >
              {deleteServiceMutation.isPending ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Excluindo...
                </div>
              ) : (
                "Excluir"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Exclusão de Cliente */}
      <Dialog open={showDeleteClientConfirm} onOpenChange={setShowDeleteClientConfirm}>
        <DialogContent className="w-full max-w-md mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              Excluir Cliente
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-600 dark:text-gray-300">
              Tem certeza que deseja excluir o cliente{" "}
              <strong>{clientToDelete?.name}</strong>?
            </p>
            <p className="text-sm text-red-600 dark:text-red-400 mt-2 font-medium">
              ⚠️ ATENÇÃO: Esta ação é irreversível e irá excluir todos os dados relacionados 
              (profissionais, serviços, agendamentos, usuários).
            </p>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowDeleteClientConfirm(false);
                setClientToDelete(null);
              }}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDeleteClient}
              disabled={deleteClientMutation.isPending}
              className="flex-1"
            >
              {deleteClientMutation.isPending ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Excluindo...
                </div>
              ) : (
                "Excluir Permanentemente"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de criação/edição de especialidade */}
      <Dialog open={showSpecialtyModal} onOpenChange={setShowSpecialtyModal}>
        <DialogContent className="w-full max-w-md mx-4 sm:mx-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">
              {editingSpecialty ? "Editar Especialidade" : "Nova Especialidade"}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {editingSpecialty ? "Atualize as informações da especialidade." : "Adicione uma nova especialidade ao sistema."}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmitSpecialty} className="space-y-4">
            <div>
              <Label htmlFor="specialty-name" className="text-sm font-medium">
                Nome da Especialidade
              </Label>
              <Input
                id="specialty-name"
                type="text"
                placeholder="Ex: Corte de Cabelo"
                value={specialtyForm.name}
                onChange={(e) => setSpecialtyForm(prev => ({ ...prev, name: e.target.value }))}
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="specialty-description" className="text-sm font-medium">
                Descrição
              </Label>
              <Input
                id="specialty-description"
                type="text"
                placeholder="Descrição da especialidade (opcional)"
                value={specialtyForm.description}
                onChange={(e) => setSpecialtyForm(prev => ({ ...prev, description: e.target.value }))}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="specialty-serviceId" className="text-sm font-medium">
                Serviço Associado
              </Label>
              <Select
                value={specialtyForm.serviceId}
                onValueChange={(value) => setSpecialtyForm(prev => ({ ...prev, serviceId: value }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione um serviço (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {(servicesData as any[]).map((service: any) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="specialty-color" className="text-sm font-medium">
                Cor de Identificação
              </Label>
              <div className="flex items-center space-x-3 mt-1">
                <input
                  id="specialty-color"
                  type="color"
                  value={specialtyForm.color}
                  onChange={(e) => setSpecialtyForm(prev => ({ ...prev, color: e.target.value }))}
                  className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                />
                <Input
                  type="text"
                  value={specialtyForm.color}
                  onChange={(e) => setSpecialtyForm(prev => ({ ...prev, color: e.target.value }))}
                  placeholder="#3B82F6"
                  className="flex-1"
                />
              </div>
            </div>
            
            <div className="flex space-x-2 pt-4">
              <Button
                type="submit"
                disabled={createSpecialtyMutation.isPending || updateSpecialtyMutation.isPending}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {(createSpecialtyMutation.isPending || updateSpecialtyMutation.isPending) ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {editingSpecialty ? "Atualizando..." : "Criando..."}
                  </div>
                ) : (
                  editingSpecialty ? "Atualizar Especialidade" : "Criar Especialidade"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowSpecialtyModal(false);
                  setEditingSpecialty(null);
                  resetSpecialtyForm();
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmação de exclusão de especialidade */}
      <Dialog open={showDeleteSpecialtyConfirm} onOpenChange={setShowDeleteSpecialtyConfirm}>
        <DialogContent className="w-full max-w-md mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              Excluir Especialidade
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-600 dark:text-gray-300">
              Tem certeza que deseja excluir a especialidade{" "}
              <strong>{specialtyToDelete?.name}</strong>?
            </p>
            <p className="text-sm text-red-600 dark:text-red-400 mt-2 font-medium">
              ⚠️ Esta ação pode afetar profissionais e serviços associados.
            </p>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowDeleteSpecialtyConfirm(false);
                setSpecialtyToDelete(null);
              }}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDeleteSpecialty}
              disabled={deleteSpecialtyMutation.isPending}
              className="flex-1"
            >
              {deleteSpecialtyMutation.isPending ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Excluindo...
                </div>
              ) : (
                "Excluir Especialidade"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}