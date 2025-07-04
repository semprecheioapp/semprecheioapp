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
      const { data: connections, error } = await supabase
        .from('connections')
        .select(`
          *,
          clients (
            id,
            name
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching connections:', error);
        return res.status(500).json({ error: error.message });
      }
      
      return res.status(200).json(connections || []);
    }
    
    if (req.method === 'POST') {
      const { client_id, instance_name, host, token } = req.body;
      
      const { data: connection, error } = await supabase
        .from('connections')
        .insert([{
          client_id,
          instance_name,
          host,
          token,
          status: 'disconnected',
          sync_status: 'idle'
        }])
        .select()
        .single();
      
      if (error) {
        console.error('Error creating connection:', error);
        return res.status(500).json({ error: error.message });
      }
      
      return res.status(201).json(connection);
    }
    
    return res.status(405).json({ message: 'Method not allowed' });
    
  } catch (error) {
    console.error('Connections API error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
}
