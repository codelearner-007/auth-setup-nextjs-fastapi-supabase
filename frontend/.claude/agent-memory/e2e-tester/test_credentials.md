---
name: Test Credentials
description: Admin and super_admin user emails for testing BookVault features
type: reference
---

Super admin: farhanahmad0819@gmail.com (hierarchy 10000, role: super_admin)
Admin: officialfarhan1996@gmail.com (hierarchy 100, role: admin)
Admin: bookvault26@gmail.com (hierarchy 100, role: admin)

Query via: `npx supabase db query "SELECT id, email FROM auth.users;" --linked`

Passwords are not stored — ask user or check environment config.
