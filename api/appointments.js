const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://ginbujbeixdwdkornnjp.supabase.co',
  process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbmJ1amJlaXhkd2Rrb3JubmpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2MDgxMjYsImV4cCI6MjA2NjE4NDEyNn0.kUjoy5lWc01e6cqrtcmbzCW_lkFTbEE6Y_hMt1DMAMI'
);

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    if (req.method === 'GET') {
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select(`
          *,
          professionals (
            id,
            name
          ),
          services (
            id,
            name,
            duration,
            price
          )
        `)
        .order('scheduled_at', { ascending: true });
      
      if (error) {
        console.error('Error fetching appointments:', error);
        return res.status(500).json({ error: error.message });
      }
      
      return res.status(200).json(appointments || []);
    }
    
    if (req.method === 'POST') {
      const { 
        professional_id, 
        service_id, 
        scheduled_at, 
        start_time,
        end_time,
        duration,
        notes 
      } = req.body;
      
      const { data: appointment, error } = await supabase
        .from('appointments')
        .insert([{
          professional_id,
          service_id,
          scheduled_at,
          start_time,
          end_time,
          duration: duration || 60,
          notes,
          status: 'scheduled'
        }])
        .select()
        .single();
      
      if (error) {
        console.error('Error creating appointment:', error);
        return res.status(500).json({ error: error.message });
      }
      
      return res.status(201).json(appointment);
    }
    
    return res.status(405).json({ message: 'Method not allowed' });
    
  } catch (error) {
    console.error('Appointments API error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor',
      error: error.message 
    });
  }
};
