
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const serviceRoleKey = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function fixUser() {
    const email = 'matthew@dixondigital.co';

    console.log(`Looking for user ${email}...`);

    // List users to find the ID
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
        console.error('Error listing users:', listError);
        return;
    }

    const user = users.find(u => u.email === email);

    if (!user) {
        console.error('User not found!');
        return;
    }

    console.log(`Found user ${user.id}. Updating metadata...`);

    const { data, error } = await supabase.auth.admin.updateUserById(
        user.id,
        {
            app_metadata: {
                ...user.app_metadata,
                supamode_access: 'true'
            }
        }
    );

    if (error) {
        console.error('Error updating user:', error);
    } else {
        console.log('User updated successfully!');
        console.log('New app_metadata:', data.user.app_metadata);
    }
}

fixUser();
