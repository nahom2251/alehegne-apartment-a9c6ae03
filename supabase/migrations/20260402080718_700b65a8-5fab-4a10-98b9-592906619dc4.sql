
-- Clear tenant_user_id from apartment
UPDATE apartments SET tenant_user_id = NULL WHERE tenant_user_id = 'f9178a8b-9220-4c7f-8465-0f2ad23c34ef';

-- Delete profile
DELETE FROM profiles WHERE user_id = 'f9178a8b-9220-4c7f-8465-0f2ad23c34ef';

-- Delete user role
DELETE FROM user_roles WHERE user_id = 'f9178a8b-9220-4c7f-8465-0f2ad23c34ef';

-- Delete the auth user
DELETE FROM auth.users WHERE id = 'f9178a8b-9220-4c7f-8465-0f2ad23c34ef';
