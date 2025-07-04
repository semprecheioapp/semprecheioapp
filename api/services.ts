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
  
  try {
    if (req.method === 'GET') {
      const { data: services, error } = await supabase
        .from('services')
        .select(`
          *,
          specialties (
            id,
            name,
            color
          )
        `)
        .eq('is_active', true)
        .order('name', { ascending: true });
      
      if (error) {
        console.error('Error fetching services:', error);
        return res.status(500).json({ error: error.message });
      }
      
      return res.status(200).json(services || []);
    }
    
    if (req.method === 'POST') {
      const { name, description, duration, price, specialty_id, client_id, category } = req.body;
      
      const { data: service, error } = await supabase
        .from('services')
        .insert([{
          name,
          description,
          duration: duration || 60,
          price: price || 0,
          specialty_id,
          client_id,
          category,
          is_active: true
        }])
        .select()
        .single();
      
      if (error) {
        console.error('Error creating service:', error);
        return res.status(500).json({ error: error.message });
      }
      
      return res.status(201).json(service);
    }
    
    return res.status(405).json({ message: 'Method not allowed' });
    
  } catch (error) {
    console.error('Services API error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
}
