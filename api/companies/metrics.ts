import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://ginbujbeixdwdkornnjp.supabase.co',
  process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbmJ1amJlaXhkd2Rrb3JubmpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2MDgxMjYsImV4cCI6MjA2NjE4NDEyNn0.kUjoy5lWc01e6cqrtcmbzCW_lkFTbEE6Y_hMt1DMAMI'
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
  try {
    // Get all clients
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('*')
      .eq('is_active', true);
    
    if (clientsError) {
      console.error('Error fetching clients:', clientsError);
      return res.status(500).json({ error: clientsError.message });
    }
    
    const companies = [];
    
    for (const client of clients || []) {
      // Get appointments for this client
      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('*')
        .eq('client_id', client.id);
      
      // Get customers for this client
      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .eq('client_id', client.id);
      
      const totalAppointments = appointments?.length || 0;
      const totalCustomers = customers?.length || 0;
      const completedAppointments = appointments?.filter(a => a.status === 'completed').length || 0;
      
      // Calculate metrics
      const grossRevenue = completedAppointments * 50; // R$ 50 average
      const netRevenue = grossRevenue * 0.85; // 15% fees
      const conversionRate = totalCustomers > 0 ? (totalAppointments / totalCustomers * 100) : 0;
      const averageTicket = completedAppointments > 0 ? (grossRevenue / completedAppointments) : 0;
      
      // Current month data
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthlyAppointments = appointments?.filter(a => {
        const date = new Date(a.appointment_time || a.created_at);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      }).length || 0;
      
      const monthlyRevenue = monthlyAppointments * 50;
      
      companies.push({
        company: client,
        metrics: {
          totalAppointments,
          completedAppointments,
          grossRevenue,
          netRevenue,
          conversionRate,
          averageTicket,
          monthlyRevenue,
          monthlyAppointments,
          currentMonth,
          currentYear,
          appointmentDates: appointments?.map(a => a.appointment_time || a.created_at) || []
        }
      });
    }
    
    return res.status(200).json({ companies });
    
  } catch (error) {
    console.error('Companies metrics API error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
}
