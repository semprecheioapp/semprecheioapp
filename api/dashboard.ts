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
    // Get appointments count
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('*');
    
    // Get clients count
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('*');
    
    // Get professionals count
    const { data: professionals, error: professionalsError } = await supabase
      .from('professionals')
      .select('*');
    
    const totalAppointments = appointments?.length || 0;
    const totalClients = clients?.length || 0;
    const totalProfessionals = professionals?.length || 0;
    
    // Calculate revenue (mock data for now)
    const totalRevenue = totalAppointments * 50; // R$ 50 per appointment average
    const monthlyRevenue = totalRevenue * 0.3; // 30% this month
    
    const metrics = {
      totalRevenue,
      monthlyRevenue,
      totalAppointments,
      monthlyAppointments: Math.floor(totalAppointments * 0.3),
      totalClients,
      totalProfessionals,
      conversionRate: totalAppointments > 0 ? (totalAppointments / totalClients * 100) : 0,
      averageTicket: totalAppointments > 0 ? (totalRevenue / totalAppointments) : 0
    };
    
    return res.status(200).json({ metrics });
    
  } catch (error) {
    console.error('Dashboard error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
}
