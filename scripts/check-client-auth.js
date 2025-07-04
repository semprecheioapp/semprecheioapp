import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAndSetupAuth() {
  try {
    const testUsers = [
      {
        name: 'Agência MBK Automações',
        email: 'agenciambkautomacoes@gmail.com',
        phone: '556699618890',
        password: 'senha123',
        service_type: 'automacao_marketing'
      },
      {
        name: 'Super Administrador',
        email: 'super@admin.com',
        phone: '11999999999',
        password: '123456',
        service_type: 'administracao'
      },
      {
        name: 'Admin Salon',
        email: 'admin@salon.com',
        phone: '11888888888',
        password: '123456',
        service_type: 'salon_beleza'
      }
    ];

    for (const testUser of testUsers) {
      // Check if user already exists
      const { data: existingClient, error } = await supabase
        .from('clients')
        .select('*')
        .eq('email', testUser.email)
        .single();

      if (error && error.code === 'PGRST116') {
        // User doesn't exist, create new one
        console.log(`Creating user: ${testUser.email}`);
        
        const hashedPassword = await bcrypt.hash(testUser.password, 10);
        
        const { data: newClient, error: insertError } = await supabase
          .from('clients')
          .insert({
            name: testUser.name,
            email: testUser.email,
            phone: testUser.phone,
            service_type: testUser.service_type,
            is_active: true,
            password: hashedPassword
          })
          .select()
          .single();

        if (insertError) {
          console.error(`Error creating ${testUser.email}:`, insertError);
        } else {
          console.log(`✓ User created: ${testUser.email}`);
        }
      } else if (existingClient) {
        console.log(`✓ User already exists: ${testUser.email}`);
        
        // Check if password needs to be updated
        if (!existingClient.password) {
          console.log(`Adding password to ${testUser.email}...`);
          const hashedPassword = await bcrypt.hash(testUser.password, 10);
          
          const { error: updateError } = await supabase
            .from('clients')
            .update({ password: hashedPassword })
            .eq('id', existingClient.id);

          if (updateError) {
            console.error(`Error updating password for ${testUser.email}:`, updateError);
          } else {
            console.log(`✓ Password updated for ${testUser.email}`);
          }
        }
      }
    }

    console.log('\n=== Test Users Ready ===');
    console.log('1. agenciambkautomacoes@gmail.com / senha123');
    console.log('2. super@admin.com / 123456');
    console.log('3. admin@salon.com / 123456');

  } catch (error) {
    console.error('Error:', error);
  }
}

checkAndSetupAuth();