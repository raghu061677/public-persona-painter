import { supabase } from "@/integrations/supabase/client";

async function createMatrixAdmin() {
  try {
    console.log("Creating admin user for Matrix Network Solutions...");
    
    const { data, error } = await supabase.functions.invoke('create-user', {
      body: {
        email: 'raghu@matrix-networksolutions.com',
        password: 'Admin@321',
        username: 'Matrix Admin',
        role: 'admin',
        company_id: '0b75c4c9-43fe-496a-9fc6-036900ebbfe0'
      }
    });

    if (error) {
      console.error('Error creating user:', error);
      return;
    }

    console.log('User created successfully:', data);
    console.log('\n=== Login Credentials ===');
    console.log('Email: raghu@matrix-networksolutions.com');
    console.log('Password: Admin@321');
    console.log('Company: Matrix Network Solutions');
    console.log('Role: Admin');
    console.log('========================\n');
    
  } catch (err) {
    console.error('Exception:', err);
  }
}

createMatrixAdmin();
