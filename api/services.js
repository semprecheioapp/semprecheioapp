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
      const { clientId } = req.query;
      let query = supabase.from('services').select('*').eq('is_active', true);

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data: services, error } = await query.order('name', { ascending: true });
      
      if (error) {
        console.error('Error fetching services:', error);
        return res.status(500).json({ error: error.message });
      }
      
      return res.status(200).json(services || []);
    }
    
    if (req.method === 'POST') {
      const { name, description, duration, price, client_id } = req.body;
      
      const { data: service, error } = await supabase
        .from('services')
        .insert([{
          name,
          description,
          duration,
          price,
          client_id,
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
      message: 'Erro interno do servidor',
      error: error.message 
    });
  }
};
