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
      const { data: professionals, error } = await supabase
        .from('professionals')
        .select(`
          *,
          specialties (
            id,
            name
          )
        `);
      
      if (error) {
        console.error('Error fetching professionals:', error);
        return res.status(500).json({ error: error.message });
      }
      
      return res.status(200).json(professionals || []);
    }
    
    if (req.method === 'POST') {
      const { name, email, phone, specialty_id, client_id } = req.body;
      
      const { data: professional, error } = await supabase
        .from('professionals')
        .insert([{
          name,
          email,
          phone,
          specialty_id,
          client_id,
          is_active: true
        }])
        .select()
        .single();
      
      if (error) {
        console.error('Error creating professional:', error);
        return res.status(500).json({ error: error.message });
      }
      
      return res.status(201).json(professional);
    }
    
    return res.status(405).json({ message: 'Method not allowed' });
    
  } catch (error) {
    console.error('Professionals API error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
}
