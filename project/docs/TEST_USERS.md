# Test Users Setup Guide

## Pre-Seeded Test Accounts

The application comes with pre-seeded test accounts ready to use. Simply sign in with these credentials:

| Email | Password | Role | Department |
|-------|----------|------|------------|
| sarah.johnson@eposnow.com | password123 | Manager | Sales |
| john.smith@eposnow.com | password123 | Employee | Sales |
| emma.wilson@eposnow.com | password123 | Employee | Sales |
| david.brown@eposnow.com | password123 | Employee | Sales |
| michael.davies@eposnow.com | password123 | Leadership | Sales |

**All accounts are fully set up and ready to use. Simply enter the email and password to log in.**

### Manager Test Account (sarah.johnson@eposnow.com)
- Has 3 team members (John, Emma, David)
- Has historical reviews with all team members
- Can create new reviews and schedule future reviews
- View team member details and performance

### Employee Test Accounts (john.smith, emma.wilson, david.brown)
- Each has review history with their manager
- Can view their own performance reviews
- Have action items assigned to them

### Leadership Test Account (michael.davies@eposnow.com)
- Department head view
- Can access organisation-wide metrics

## Creating Additional Test Users

If you need to create additional test users in Supabase, here's how:

### Method 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **Authentication > Users**
3. Click **Add User** for each test account
4. Create the following users:

| Email | Password | Role |
|-------|----------|------|
| employee@test.com | password123 | employee |
| manager@test.com | password123 | manager |
| deptlead@test.com | password123 | dept_lead |
| senior@test.com | password123 | senior |
| leadership@test.com | password123 | leadership |
| lnd@test.com | password123 | l_and_d |
| admin@test.com | password123 | admin |

5. After creating each user in Auth, you need to create their profile. Go to **Database > SQL Editor** and run:

```sql
-- For each user, replace the UUID with the actual auth.users ID
-- You can find the UUID in Authentication > Users

-- Employee
INSERT INTO profiles (id, email, full_name, role, department, tenure)
VALUES ('USER_UUID_HERE', 'employee@test.com', 'John Employee', 'employee', 'Support', 2);

-- Manager
INSERT INTO profiles (id, email, full_name, role, department, tenure)
VALUES ('USER_UUID_HERE', 'manager@test.com', 'Sarah Manager', 'manager', 'Support', 5);

-- Department Lead
INSERT INTO profiles (id, email, full_name, role, department, tenure)
VALUES ('USER_UUID_HERE', 'deptlead@test.com', 'Michael Lead', 'dept_lead', 'Support', 7);

-- Senior
INSERT INTO profiles (id, email, full_name, role, department, tenure)
VALUES ('USER_UUID_HERE', 'senior@test.com', 'Emily Senior', 'senior', 'Engineering', 6);

-- Leadership
INSERT INTO profiles (id, email, full_name, role, department, tenure)
VALUES ('USER_UUID_HERE', 'leadership@test.com', 'David Leadership', 'leadership', 'Executive', 10);

-- L&D
INSERT INTO profiles (id, email, full_name, role, department, tenure)
VALUES ('USER_UUID_HERE', 'lnd@test.com', 'Lisa Learning', 'l_and_d', 'HR', 4);

-- Admin
INSERT INTO profiles (id, email, full_name, role, department, tenure)
VALUES ('USER_UUID_HERE', 'admin@test.com', 'Alex Admin', 'admin', 'IT', 8);
```

### Method 2: Programmatic Setup (Advanced)

If you have access to the Supabase service role key, you can use this script:

```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseServiceKey = 'YOUR_SERVICE_ROLE_KEY'; // Admin key, not anon key!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const testUsers = [
  { email: 'employee@test.com', fullName: 'John Employee', role: 'employee', department: 'Support' },
  { email: 'manager@test.com', fullName: 'Sarah Manager', role: 'manager', department: 'Support' },
  { email: 'deptlead@test.com', fullName: 'Michael Lead', role: 'dept_lead', department: 'Support' },
  { email: 'senior@test.com', fullName: 'Emily Senior', role: 'senior', department: 'Engineering' },
  { email: 'leadership@test.com', fullName: 'David Leadership', role: 'leadership', department: 'Executive' },
  { email: 'lnd@test.com', fullName: 'Lisa Learning', role: 'l_and_d', department: 'HR' },
  { email: 'admin@test.com', fullName: 'Alex Admin', role: 'admin', department: 'IT' }
];

async function createTestUsers() {
  for (const user of testUsers) {
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: user.email,
      password: 'password123',
      email_confirm: true
    });

    if (authError) {
      console.error(`Error creating ${user.email}:`, authError);
      continue;
    }

    // Create profile
    const { error: profileError } = await supabase.from('profiles').insert({
      id: authData.user.id,
      email: user.email,
      full_name: user.fullName,
      role: user.role,
      department: user.department,
      tenure: Math.floor(Math.random() * 8) + 2
    });

    if (profileError) {
      console.error(`Error creating profile for ${user.email}:`, profileError);
    } else {
      console.log(`✓ Created ${user.email}`);
    }
  }
}

createTestUsers();
```

## Testing Different Views

After creating the test users, you can log in with each account to see different dashboard views:

- **Employee View**: Basic performance tracking and learning opportunities
- **Manager View**: Team management, 1:1 scheduling, progression tracking
- **Leadership View**: Organization-wide metrics, talent mobility, strategic planning

## Sample Data

The database has been pre-populated with:
- **Skills**: Technical and soft skills for career development
- **Training Sessions**: Upcoming learning opportunities
- **Job Families**: Career progression paths

You can view and modify these through the application once logged in with the appropriate role.
