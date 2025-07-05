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
      const { data: clients, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching clients:', error);
        return res.status(500).json({ error: error.message });
      }
      
      return res.status(200).json(clients || []);
    }
    
    if (req.method === 'POST') {
      const { name, email, phone, service_type, address } = req.body;
      
      const { data: client, error } = await supabase
        .from('clients')
        .insert([{
          name,
          email,
          phone,
          service_type,
          address,
          is_active: true,
          password: 'temp123' // Temporary password
        }])
        .select()
        .single();
      
      if (error) {
        console.error('Error creating client:', error);
        return res.status(500).json({ error: error.message });
      }
      
      return res.status(201).json(client);
    }
    
    if (req.method === 'PUT') {
      const { id } = req.query;
      const updateData = req.body;
      
      const { data: client, error } = await supabase
        .from('clients')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating client:', error);
        return res.status(500).json({ error: error.message });
      }
      
      return res.status(200).json(client);
    }
    
    if (req.method === 'DELETE') {
      const { id } = req.query;
      
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error deleting client:', error);
        return res.status(500).json({ error: error.message });
      }
      
      return res.status(200).json({ success: true });
    }
    
    return res.status(405).json({ message: 'Method not allowed' });
    
  } catch (error) {
    console.error('Clients API error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor',
      error: error.message 
    });
  }
};
