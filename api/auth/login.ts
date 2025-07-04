import { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcrypt';
import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://ginbujbeixdwdkornnjp.supabase.co',
  process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbmJ1amJlaXhkd2Rrb3JubmpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2MDgxMjYsImV4cCI6MjA2NjE4NDEyNn0.kUjoy5lWc01e6cqrtcmbzCW_lkFTbEE6Y_hMt1DMAMI'
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
  try {
    const { email, password, rememberMe } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email e senha são obrigatórios' 
      });
    }
    
    console.log('Login attempt for:', email);
    
    // Get user from database
    const { data: client, error } = await supabase
      .from('clients')
      .select('*')
      .eq('email', email)
      .eq('is_active', true)
      .single();
    
    if (error || !client) {
      console.log('User not found:', error);
      return res.status(401).json({ 
        success: false, 
        message: 'Credenciais inválidas' 
      });
    }
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, client.password);
    
    if (!isValidPassword) {
      console.log('Invalid password for:', email);
      return res.status(401).json({ 
        success: false, 
        message: 'Credenciais inválidas' 
      });
    }
    
    // Generate session ID
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Set session cookie
    const cookieOptions = [
      `sessionId=${sessionId}`,
      'HttpOnly',
      'Path=/',
      'SameSite=Lax',
      rememberMe ? 'Max-Age=2592000' : 'Max-Age=86400' // 30 days or 1 day
    ];
    
    res.setHeader('Set-Cookie', cookieOptions.join('; '));
    
    // Store session in database (you can implement this)
    // For now, we'll use a simple approach
    
    console.log('Login successful for:', email);
    
    return res.status(200).json({
      success: true,
      message: 'Login realizado com sucesso',
      user: {
        id: client.id,
        name: client.name,
        email: client.email,
        role: client.service_type === 'super_admin' ? 'super_admin' : 'admin',
        serviceType: client.service_type
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
}
