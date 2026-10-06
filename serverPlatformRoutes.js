// ============================================================================
// SaaS Platform Control Plane - Backend Routes & Store
// Approved Functional Specification (Section 1 & Section 2)
// ============================================================================

import {
  PLATFORM_PERMISSIONS,
  PERMISSION_DEFINITIONS,
  PLATFORM_ROLES,
  hasPlatformPermission,
  isTenantInScope,
} from './serverPlatformRbac.js';

export function setupPlatformRoutes(app, db, nextId, nowIso) {
  // --------------------------------------------------------------------------
  // Dynamic Platform Control Plane In-Memory Collections
  // --------------------------------------------------------------------------
  let platformPlans = [];
  let platformFeatures = [];
  let platformAddons = [];
  let platformSubscriptions = [];
  let platformOverrides = [];
  let tenantAssignedAddons = [];
  let platformSupportSessions = [];
  let platformAuditLogs = [];
  let platformUsers = [];
  let platformAdmins = []; // alias for backward compatibility
  let activeSimulationUserId = 'pusr-1';

  // Helper date generators relative to current execution time
  const dateOffsetIso = (daysOffset = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    return d.toISOString();
  };

  const dateOffsetMinutesIso = (minsOffset = 0) => {
    const d = new Date(Date.now() + minsOffset * 60000);
    return d.toISOString();
  };

  const createPlatformAdminSeed = () => [
    {
      id: 'pusr-1',
      email: 'admin@fastmovers.com',
      name: 'System Administrator',
      role: 'super_admin',
      status: 'active',
      company_scope_type: 'all',
      assigned_companies: [],
      mfa_enabled: true,
      mfa_enforced: true,
      expires_at: null,
      session_version: 1,
      created_at: '2025-01-01T00:00:00Z',
      created_by: 'system',
      updated_at: '2025-01-01T00:00:00Z',
      last_login_at: dateOffsetIso(-1),
    },
    {
      id: 'pusr-2',
      email: 'elena.rostova@kargoflow.com',
      name: 'Elena Rostova',
      role: 'support_admin',
      status: 'active',
      company_scope_type: 'all',
      assigned_companies: [],
      mfa_enabled: true,
      mfa_enforced: true,
      expires_at: '2027-12-31T23:59:59Z',
      session_version: 1,
      created_at: '2025-06-15T00:00:00Z',
      created_by: 'admin@fastmovers.com',
      updated_at: '2025-06-15T00:00:00Z',
      last_login_at: dateOffsetIso(-2),
    },
    {
      id: 'pusr-3',
      email: 'david.ross@kargoflow.com',
      name: 'David Ross',
      role: 'support_admin',
      status: 'active',
      company_scope_type: 'assigned',
      assigned_companies: [1, 2, 3],
      mfa_enabled: true,
      mfa_enforced: true,
      expires_at: '2026-12-31T23:59:59Z',
      session_version: 1,
      created_at: '2026-01-10T00:00:00Z',
      created_by: 'admin@fastmovers.com',
      updated_at: '2026-01-10T00:00:00Z',
      last_login_at: dateOffsetIso(-1),
    },
    {
      id: 'pusr-4',
      email: 'agent.smith@kargoflow.com',
      name: 'Agent Smith',
      role: 'support_agent',
      status: 'active',
      company_scope_type: 'assigned',
      assigned_companies: [1],
      mfa_enabled: true,
      mfa_enforced: true,
      expires_at: null,
      session_version: 1,
      created_at: '2026-02-01T00:00:00Z',
      created_by: 'admin@fastmovers.com',
      updated_at: '2026-02-01T00:00:00Z',
      last_login_at: dateOffsetIso(-3),
    },
    {
      id: 'pusr-5',
      email: 'marcus.vance@kargoflow.com',
      name: 'Marcus Vance',
      role: 'auditor',
      status: 'active',
      company_scope_type: 'all',
      assigned_companies: [],
      mfa_enabled: true,
      mfa_enforced: true,
      expires_at: '2027-06-30T23:59:59Z',
      session_version: 1,
      created_at: '2025-09-01T00:00:00Z',
      created_by: 'admin@fastmovers.com',
      updated_at: '2025-09-01T00:00:00Z',
      last_login_at: dateOffsetIso(-4),
    },
    {
      id: 'pusr-6',
      email: 'expired.agent@kargoflow.com',
      name: 'Expired Staff Member',
      role: 'support_agent',
      status: 'active',
      company_scope_type: 'assigned',
      assigned_companies: [1],
      mfa_enabled: true,
      mfa_enforced: true,
      expires_at: dateOffsetIso(-5),
      session_version: 1,
      created_at: '2025-01-01T00:00:00Z',
      created_by: 'admin@fastmovers.com',
      updated_at: '2025-01-01T00:00:00Z',
      last_login_at: dateOffsetIso(-6),
    },
    {
      id: 'pusr-7',
      email: 'suspended.agent@kargoflow.com',
      name: 'Suspended Staff Member',
      role: 'support_agent',
      status: 'suspended',
      company_scope_type: 'assigned',
      assigned_companies: [2],
      mfa_enabled: true,
      mfa_enforced: true,
      expires_at: null,
      session_version: 2,
      created_at: '2025-01-01T00:00:00Z',
      created_by: 'admin@fastmovers.com',
      updated_at: '2025-01-01T00:00:00Z',
      last_login_at: dateOffsetIso(-10),
    },
  ];

  // --------------------------------------------------------------------------
  // Seed / Reset Platform Data Function (for Testing & Template Presentation)
  // --------------------------------------------------------------------------
  function resetAndSeedPlatformData(preset = 'standard') {
    // 1. Platform Plans (Section 1.3)
    platformPlans = [
      {
        id: 'plan-essential',
        code: 'ESSENTIAL',
        name: 'Essential Plan',
        version: 'v1.2',
        status: 'active',
        is_current: true,
        is_public: true,
        billing_interval: 'month',
        currency: 'USD',
        base_price_cents: 19900,
        limits: {
          active_users: 5,
          active_branches: 1,
          monthly_sms: 1000,
          monthly_email: 5000,
          monthly_api_requests: 50000,
          monthly_automations: 500,
          storage_bytes: 10737418240, // 10 GB
        },
        features: {
          crm_leads: 'write',
          crm_sales: 'write',
          crm_estimates: 'write',
          customer_portal: 'read',
          documents_storage: 'write',
          documents_signatures: 'read',
          finance_payments: 'write',
          finance_accounting: 'none',
          operations_jobs: 'write',
          operations_dispatch: 'write',
          operations_crew_app: 'none',
          automations_workflow: 'none',
          integrations_api: 'none',
          reporting_advanced: 'none',
          platform_multibranch: 'none',
          platform_custom_roles: 'none',
          platform_white_label: 'none',
          comms_sms: 'write',
          comms_email: 'write',
        },
        created_at: '2025-06-01T00:00:00Z',
      },
      {
        id: 'plan-professional',
        code: 'PROFESSIONAL',
        name: 'Professional Plan',
        version: 'v2.0',
        status: 'active',
        is_current: true,
        is_public: true,
        billing_interval: 'month',
        currency: 'USD',
        base_price_cents: 49900,
        limits: {
          active_users: 15,
          active_branches: 3,
          monthly_sms: 5000,
          monthly_email: 25000,
          monthly_api_requests: 200000,
          monthly_automations: 2500,
          storage_bytes: 53687091200, // 50 GB
        },
        features: {
          crm_leads: 'write',
          crm_sales: 'write',
          crm_estimates: 'write',
          customer_portal: 'write',
          documents_storage: 'write',
          documents_signatures: 'write',
          finance_payments: 'write',
          finance_accounting: 'write',
          operations_jobs: 'write',
          operations_dispatch: 'write',
          operations_crew_app: 'write',
          automations_workflow: 'write',
          integrations_api: 'write',
          reporting_advanced: 'write',
          platform_multibranch: 'write',
          platform_custom_roles: 'none',
          platform_white_label: 'none',
          comms_sms: 'write',
          comms_email: 'write',
        },
        created_at: '2025-09-15T00:00:00Z',
      },
      {
        id: 'plan-enterprise',
        code: 'ENTERPRISE',
        name: 'Enterprise Scale Plan',
        version: 'v2.1',
        status: 'active',
        is_current: true,
        is_public: true,
        billing_interval: 'month',
        currency: 'USD',
        base_price_cents: 99900,
        limits: {
          active_users: 50,
          active_branches: 10,
          monthly_sms: 20000,
          monthly_email: 100000,
          monthly_api_requests: 1000000,
          monthly_automations: 10000,
          storage_bytes: 214748364800, // 200 GB
        },
        features: {
          crm_leads: 'write',
          crm_sales: 'write',
          crm_estimates: 'write',
          customer_portal: 'write',
          documents_storage: 'write',
          documents_signatures: 'write',
          finance_payments: 'write',
          finance_accounting: 'write',
          operations_jobs: 'write',
          operations_dispatch: 'write',
          operations_crew_app: 'write',
          automations_workflow: 'write',
          integrations_api: 'write',
          reporting_advanced: 'write',
          platform_multibranch: 'write',
          platform_custom_roles: 'write',
          platform_white_label: 'write',
          comms_sms: 'write',
          comms_email: 'write',
        },
        created_at: '2026-01-10T00:00:00Z',
      },
      {
        id: 'plan-custom',
        code: 'CUSTOM',
        name: 'Custom Corporate Plan',
        version: 'v1.0',
        status: 'active',
        is_current: true,
        is_public: false,
        billing_interval: 'year',
        currency: 'USD',
        base_price_cents: 1499000,
        limits: {
          active_users: 100,
          active_branches: 25,
          monthly_sms: 50000,
          monthly_email: 250000,
          monthly_api_requests: 2500000,
          monthly_automations: 25000,
          storage_bytes: 536870912000, // 500 GB
        },
        features: {
          crm_leads: 'write',
          crm_sales: 'write',
          crm_estimates: 'write',
          customer_portal: 'write',
          documents_storage: 'write',
          documents_signatures: 'write',
          finance_payments: 'write',
          finance_accounting: 'write',
          operations_jobs: 'write',
          operations_dispatch: 'write',
          operations_crew_app: 'write',
          automations_workflow: 'write',
          integrations_api: 'write',
          reporting_advanced: 'write',
          platform_multibranch: 'write',
          platform_custom_roles: 'write',
          platform_white_label: 'write',
          comms_sms: 'write',
          comms_email: 'write',
        },
        created_at: '2026-02-01T00:00:00Z',
      },
    ];

    // 2. Feature Catalog (Section 1.4)
    platformFeatures = [
      { key: 'crm_leads', category: 'CRM', name: 'Leads Management', description: 'Incoming inquiries, intake normalization and lead conversion' },
      { key: 'crm_sales', category: 'CRM', name: 'Sales CRM & Pipeline', description: 'Opportunity tracking, visual pipelines, and sales activities' },
      { key: 'crm_estimates', category: 'CRM', name: 'Estimates & Quotes', description: 'Tariff calculations, moving charges, and formal quote generation' },
      { key: 'customer_portal', category: 'Customer', name: 'Customer Portal', description: 'Dedicated customer inventory portal and contract review' },
      { key: 'documents_storage', category: 'Documents', name: 'Documents Repository', description: 'Bills of Lading, agreements, and file storage' },
      { key: 'documents_signatures', category: 'Documents', name: 'E-Signatures', description: 'Legally-binding e-signature capture on proposals & contracts' },
      { key: 'finance_payments', category: 'Finance', name: 'Payments & Card Processing', description: 'Credit card processing, deposits, and payment tracking' },
      { key: 'finance_accounting', category: 'Finance', name: 'Financial Accounting', description: 'Invoice journals, ledger reconciliation, and payouts' },
      { key: 'operations_jobs', category: 'Operations', name: 'Jobs Management', description: 'Operational job booking, service tracking, and work orders' },
      { key: 'operations_dispatch', category: 'Operations', name: 'Dispatch & Trucks', description: 'Fleet scheduling, truck assignments, and route dispatches' },
      { key: 'operations_crew_app', category: 'Operations', name: 'Crew Mobile App', description: 'Mobile field access for movers and crew leads' },
      { key: 'automations_workflow', category: 'Automation', name: 'Workflow Automations', description: 'Trigger-based reminders, automatic status shifts, and alerts' },
      { key: 'integrations_api', category: 'Integration', name: 'Integrations & Open API', description: 'Third-party integrations and platform developer REST APIs' },
      { key: 'reporting_advanced', category: 'Reporting', name: 'Advanced Reports & BI', description: 'Sales rep performance, lead source ROI, and analytics' },
      { key: 'platform_multibranch', category: 'Platform / Security', name: 'Multi-Branch Operations', description: 'Multiple operating locations and branch-specific rules' },
      { key: 'platform_custom_roles', category: 'Platform / Security', name: 'Custom RBAC Roles', description: 'Tenant-defined roles with granular permission keys' },
      { key: 'platform_white_label', category: 'Platform / Security', name: 'White-Label Branding', description: 'Custom domain mapping, branded portal, and email styling' },
      { key: 'comms_sms', category: 'Communication', name: 'Two-Way SMS', description: 'Automated and agent SMS messaging to customers' },
      { key: 'comms_email', category: 'Communication', name: 'Outbound & Inbound Email', description: 'Email notifications and marketing correspondence' },
    ];

    // 3. Add-ons Catalog (Section 1.7)
    platformAddons = [
      { id: 'addon-users-10', name: '+10 Active Users Pack', type: 'quota', limit_key: 'active_users', increment: 10, price_cents: 6000, interval: 'month' },
      { id: 'addon-branch-1', name: '+1 Additional Branch Location', type: 'quota', limit_key: 'active_branches', increment: 1, price_cents: 8000, interval: 'month' },
      { id: 'addon-sms-10k', name: '+10,000 Metered SMS Pack', type: 'quota', limit_key: 'monthly_sms', increment: 10000, price_cents: 7000, interval: 'month' },
      { id: 'addon-email-50k', name: '+50,000 Metered Email Pack', type: 'quota', limit_key: 'monthly_email', increment: 50000, price_cents: 5000, interval: 'month' },
      { id: 'addon-storage-100gb', name: '+100 GB Cloud Storage', type: 'quota', limit_key: 'storage_bytes', increment: 107374182400, price_cents: 3000, interval: 'month' },
      { id: 'addon-whitelabel', name: 'White-Label Custom Domain & Branding', type: 'feature', feature_key: 'platform_white_label', access_mode: 'write', price_cents: 15000, interval: 'month' },
      { id: 'addon-crew-unlimited', name: 'Crew Mobile App Add-on', type: 'feature', feature_key: 'operations_crew_app', access_mode: 'write', price_cents: 12000, interval: 'month' },
    ];

    // 4. Ten Multi-Tenant Companies (Comprehensive representation across all lifecycle states)
    db.companies = [
      {
        id: 1,
        company_id: 'KGF-1001',
        name: 'KargoFlow Logistics',
        legal_name: 'KargoFlow Moving & Storage LLC',
        subdomain: 'fastmovers',
        email: 'admin@fastmovers.com',
        phone: '512-555-0100',
        website: 'https://fastmovers.com',
        address_line1: '123 Moving Way',
        city: 'Austin',
        state: 'TX',
        zip_code: '78701',
        country: 'US',
        currency: 'USD',
        timezone: 'America/Chicago',
        plan_id: 'plan-professional',
        subscription_plan: 'professional',
        subscription_status: 'active',
        is_active: true,
        is_deleted: false,
        functional_state: 'Active',
        active_branches_count: 2,
        active_users_count: 4,
        created_at: '2026-01-15T09:00:00Z',
      },
      {
        id: 2,
        company_id: 'APX-2002',
        name: 'Apex Relocations',
        legal_name: 'Apex Relocations Inc',
        subdomain: 'apex-moves',
        email: 'ops@apexrelocations.com',
        phone: '206-555-0188',
        website: 'https://apexmoves.example.com',
        address_line1: '789 Olympic Blvd',
        city: 'Seattle',
        state: 'WA',
        zip_code: '98101',
        country: 'US',
        currency: 'USD',
        timezone: 'America/Los_Angeles',
        plan_id: 'plan-essential',
        subscription_plan: 'essential',
        subscription_status: 'trialing',
        trial_ends_at: dateOffsetIso(11),
        is_active: true,
        is_deleted: false,
        functional_state: 'Active',
        active_branches_count: 1,
        active_users_count: 3,
        created_at: '2026-09-20T11:30:00Z',
      },
      {
        id: 3,
        company_id: 'CVL-3003',
        name: 'Coastline Van Lines',
        legal_name: 'Coastline Freight & Van Lines Inc',
        subdomain: 'coastline-vans',
        email: 'billing@coastlinevans.com',
        phone: '305-555-0199',
        website: 'https://coastlinevans.example.com',
        address_line1: '400 Biscayne Way',
        city: 'Miami',
        state: 'FL',
        zip_code: '33132',
        country: 'US',
        currency: 'USD',
        timezone: 'America/New_York',
        plan_id: 'plan-enterprise',
        subscription_plan: 'enterprise',
        subscription_status: 'past_due',
        grace_period_ends_at: dateOffsetIso(7),
        is_active: true,
        is_deleted: false,
        functional_state: 'Active',
        active_branches_count: 3,
        active_users_count: 18,
        created_at: '2025-11-05T08:00:00Z',
      },
      {
        id: 4,
        company_id: 'NMC-4004',
        name: 'Nordic Movers Corp',
        legal_name: 'Nordic Movers Corporation',
        subdomain: 'nordic-movers',
        email: 'admin@nordicmovers.com',
        phone: '312-555-0177',
        website: 'https://nordicmovers.example.com',
        address_line1: '900 Michigan Ave',
        city: 'Chicago',
        state: 'IL',
        zip_code: '60611',
        country: 'US',
        currency: 'USD',
        timezone: 'America/Chicago',
        plan_id: 'plan-essential',
        subscription_plan: 'essential',
        subscription_status: 'suspended',
        is_active: false,
        is_deleted: false,
        functional_state: 'Suspended',
        active_branches_count: 1,
        active_users_count: 2,
        created_at: '2026-02-10T14:15:00Z',
      },
      {
        id: 5,
        company_id: 'BSM-5005',
        name: 'BlueSky Moving & Storage',
        legal_name: 'BlueSky Transport LLC',
        subdomain: 'bluesky-moves',
        email: 'contact@blueskymoves.com',
        phone: '303-555-0144',
        website: 'https://blueskymoves.example.com',
        address_line1: '1600 Mountain View Rd',
        city: 'Denver',
        state: 'CO',
        zip_code: '80202',
        country: 'US',
        currency: 'USD',
        timezone: 'America/Denver',
        plan_id: 'plan-essential',
        subscription_plan: 'essential',
        subscription_status: 'trialing',
        trial_ends_at: dateOffsetIso(14),
        is_active: false,
        is_deleted: false,
        functional_state: 'Provisioning',
        active_branches_count: 1,
        active_users_count: 1,
        created_at: '2026-10-01T16:00:00Z',
      },
      {
        id: 6,
        company_id: 'VEV-6006',
        name: 'Vanguard Elite Van Lines',
        legal_name: 'Vanguard Elite Relocations LLC',
        subdomain: 'vanguard-elite',
        email: 'dispatch@vanguardvanlines.com',
        phone: '212-555-0155',
        website: 'https://vanguardvanlines.com',
        address_line1: '550 5th Avenue',
        city: 'New York',
        state: 'NY',
        zip_code: '10036',
        country: 'US',
        currency: 'USD',
        timezone: 'America/New_York',
        plan_id: 'plan-enterprise',
        subscription_plan: 'enterprise',
        subscription_status: 'active',
        is_active: true,
        is_deleted: false,
        functional_state: 'Active',
        active_branches_count: 4,
        active_users_count: 28,
        created_at: '2025-08-12T10:00:00Z',
      },
      {
        id: 7,
        company_id: 'SMM-7007',
        name: 'Summit Mountain Moving & Storage',
        legal_name: 'Summit Mountain Movers Inc',
        subdomain: 'summit-movers',
        email: 'info@summitmountainmoving.com',
        phone: '720-555-0166',
        website: 'https://summitmountainmoving.com',
        address_line1: '2450 Pearl St',
        city: 'Boulder',
        state: 'CO',
        zip_code: '80302',
        country: 'US',
        currency: 'USD',
        timezone: 'America/Denver',
        plan_id: 'plan-professional',
        subscription_plan: 'professional',
        subscription_status: 'active',
        is_active: true,
        is_deleted: false,
        functional_state: 'Active',
        active_branches_count: 2,
        active_users_count: 8,
        created_at: '2026-03-01T09:30:00Z',
      },
      {
        id: 8,
        company_id: 'PRR-8008',
        name: 'Pacific Rim Relocation Services',
        legal_name: 'Pacific Rim Global Relocation Corp',
        subdomain: 'pacific-rim',
        email: 'corporate@pacificrimrelocations.com',
        phone: '415-555-0133',
        website: 'https://pacificrimrelocations.com',
        address_line1: '1 Market St, Suite 1800',
        city: 'San Francisco',
        state: 'CA',
        zip_code: '94105',
        country: 'US',
        currency: 'USD',
        timezone: 'America/Los_Angeles',
        plan_id: 'plan-custom',
        subscription_plan: 'custom',
        subscription_status: 'active',
        is_active: true,
        is_deleted: false,
        functional_state: 'Active',
        active_branches_count: 6,
        active_users_count: 45,
        created_at: '2025-05-10T14:00:00Z',
      },
      {
        id: 9,
        company_id: 'RRF-9009',
        name: 'RedRock Interstate Freight',
        legal_name: 'RedRock Hauling & Freight LLC',
        subdomain: 'redrock-freight',
        email: 'support@redrockinterstate.com',
        phone: '602-555-0122',
        website: 'https://redrockinterstate.com',
        address_line1: '3200 Camelback Rd',
        city: 'Phoenix',
        state: 'AZ',
        zip_code: '85018',
        country: 'US',
        currency: 'USD',
        timezone: 'America/Phoenix',
        plan_id: 'plan-essential',
        subscription_plan: 'essential',
        subscription_status: 'cancelled',
        is_active: true,
        is_deleted: false,
        functional_state: 'Active',
        active_branches_count: 1,
        active_users_count: 3,
        created_at: '2026-01-20T12:00:00Z',
      },
      {
        id: 10,
        company_id: 'MSH-1010',
        name: 'Metro Star Haulers',
        legal_name: 'Metro Star Relocations LLC',
        subdomain: 'metro-star',
        email: 'sales@metrostarhaulers.com',
        phone: '404-555-0111',
        website: 'https://metrostarhaulers.com',
        address_line1: '1200 Peachtree St',
        city: 'Atlanta',
        state: 'GA',
        zip_code: '30309',
        country: 'US',
        currency: 'USD',
        timezone: 'America/New_York',
        plan_id: 'plan-professional',
        subscription_plan: 'professional',
        subscription_status: 'trialing',
        trial_ends_at: dateOffsetIso(2),
        is_active: true,
        is_deleted: false,
        functional_state: 'Active',
        active_branches_count: 1,
        active_users_count: 6,
        created_at: '2026-09-25T15:00:00Z',
      },
    ];

    // 5. Ten Subscriptions matching all tenants with full transition history (Section 1.6, 2.10, 2.11)
    platformSubscriptions = [
      {
        id: 'sub-101',
        tenant_id: 1,
        tenant_name: 'KargoFlow Logistics',
        plan_id: 'plan-professional',
        status: 'active',
        billing_interval: 'month',
        current_period_start: dateOffsetIso(-20),
        current_period_end: dateOffsetIso(10),
        provider_name: 'stripe',
        provider_customer_id: 'cus_Qx791Kargo1',
        provider_subscription_id: 'sub_1P83xKargoFlow',
        status_history: [
          { id: 1, old_status: null, new_status: 'trialing', reason: 'Initial tenant signup', actor: 'system@kargoflow.com', timestamp: '2026-01-15T09:00:00Z' },
          { id: 2, old_status: 'trialing', new_status: 'active', reason: 'Upgraded to Professional monthly', actor: 'billing@kargoflow.com', timestamp: '2026-02-14T10:00:00Z' },
        ],
      },
      {
        id: 'sub-102',
        tenant_id: 2,
        tenant_name: 'Apex Relocations',
        plan_id: 'plan-essential',
        status: 'trialing',
        billing_interval: 'month',
        current_period_start: dateOffsetIso(-3),
        current_period_end: dateOffsetIso(27),
        trial_ends_at: dateOffsetIso(11),
        provider_name: 'stripe',
        provider_customer_id: 'cus_Apex0912',
        provider_subscription_id: 'sub_ApexTrial1',
        status_history: [
          { id: 3, old_status: null, new_status: 'trialing', reason: 'New tenant free trial started', actor: 'sales@kargoflow.com', timestamp: '2026-09-20T11:30:00Z' },
        ],
      },
      {
        id: 'sub-103',
        tenant_id: 3,
        tenant_name: 'Coastline Van Lines',
        plan_id: 'plan-enterprise',
        status: 'past_due',
        billing_interval: 'month',
        current_period_start: dateOffsetIso(-28),
        current_period_end: dateOffsetIso(2),
        grace_period_ends_at: dateOffsetIso(7),
        provider_name: 'stripe',
        provider_customer_id: 'cus_Coastline89',
        provider_subscription_id: 'sub_CoastlineEnt',
        status_history: [
          { id: 4, old_status: 'active', new_status: 'past_due', reason: 'Payment card declined on invoice #INV-9921', actor: 'stripe_webhook', timestamp: dateOffsetIso(-3) },
        ],
      },
      {
        id: 'sub-104',
        tenant_id: 4,
        tenant_name: 'Nordic Movers Corp',
        plan_id: 'plan-essential',
        status: 'suspended',
        billing_interval: 'month',
        current_period_start: '2026-02-10T00:00:00Z',
        current_period_end: '2026-10-10T00:00:00Z',
        provider_name: 'stripe',
        provider_customer_id: 'cus_NordicMovers',
        provider_subscription_id: 'sub_NordicMv1',
        status_history: [
          { id: 5, old_status: 'active', new_status: 'suspended', reason: 'Security investigation - unauthorized API spam', actor: 'admin@fastmovers.com', timestamp: dateOffsetIso(-5) },
        ],
      },
      {
        id: 'sub-105',
        tenant_id: 5,
        tenant_name: 'BlueSky Moving & Storage',
        plan_id: 'plan-essential',
        status: 'trialing',
        billing_interval: 'month',
        current_period_start: dateOffsetIso(-2),
        current_period_end: dateOffsetIso(28),
        trial_ends_at: dateOffsetIso(14),
        provider_name: 'manual',
        provider_customer_id: 'man_BlueSky',
        provider_subscription_id: 'man_sub_5',
        status_history: [
          { id: 6, old_status: null, new_status: 'trialing', reason: 'Self-serve onboarding trial initiated', actor: 'admin@fastmovers.com', timestamp: dateOffsetIso(-2) },
        ],
      },
      {
        id: 'sub-106',
        tenant_id: 6,
        tenant_name: 'Vanguard Elite Van Lines',
        plan_id: 'plan-enterprise',
        status: 'active',
        billing_interval: 'month',
        current_period_start: dateOffsetIso(-12),
        current_period_end: dateOffsetIso(18),
        provider_name: 'stripe',
        provider_customer_id: 'cus_Vanguard88',
        provider_subscription_id: 'sub_VanguardScale1',
        status_history: [
          { id: 7, old_status: null, new_status: 'active', reason: 'Enterprise contract activated', actor: 'sales@kargoflow.com', timestamp: '2025-08-12T10:00:00Z' },
        ],
      },
      {
        id: 'sub-107',
        tenant_id: 7,
        tenant_name: 'Summit Mountain Moving & Storage',
        plan_id: 'plan-professional',
        status: 'active',
        billing_interval: 'month',
        current_period_start: dateOffsetIso(-15),
        current_period_end: dateOffsetIso(15),
        provider_name: 'stripe',
        provider_customer_id: 'cus_SummitMoves',
        provider_subscription_id: 'sub_SummitPro2',
        status_history: [
          { id: 8, old_status: 'trialing', new_status: 'active', reason: 'Trial conversion to Professional', actor: 'billing@kargoflow.com', timestamp: '2026-03-15T12:00:00Z' },
        ],
      },
      {
        id: 'sub-108',
        tenant_id: 8,
        tenant_name: 'Pacific Rim Relocation Services',
        plan_id: 'plan-custom',
        status: 'active',
        billing_interval: 'year',
        current_period_start: '2026-05-10T00:00:00Z',
        current_period_end: '2027-05-10T00:00:00Z',
        provider_name: 'ach',
        provider_customer_id: 'ach_PacificRimCorp',
        provider_subscription_id: 'ach_sub_PRR2026',
        status_history: [
          { id: 9, old_status: null, new_status: 'active', reason: 'Custom Enterprise Master Services Agreement executed', actor: 'admin@fastmovers.com', timestamp: '2025-05-10T14:00:00Z' },
        ],
      },
      {
        id: 'sub-109',
        tenant_id: 9,
        tenant_name: 'RedRock Interstate Freight',
        plan_id: 'plan-essential',
        status: 'cancelled',
        billing_interval: 'month',
        current_period_start: '2026-08-20T00:00:00Z',
        current_period_end: dateOffsetIso(-1),
        provider_name: 'stripe',
        provider_customer_id: 'cus_RedRock90',
        provider_subscription_id: 'sub_RedRockTerm',
        status_history: [
          { id: 10, old_status: 'active', new_status: 'cancelled', reason: 'Consolidation with parent regional carrier', actor: 'support@redrockinterstate.com', timestamp: dateOffsetIso(-8) },
        ],
      },
      {
        id: 'sub-110',
        tenant_id: 10,
        tenant_name: 'Metro Star Haulers',
        plan_id: 'plan-professional',
        status: 'trialing',
        billing_interval: 'month',
        current_period_start: dateOffsetIso(-12),
        current_period_end: dateOffsetIso(18),
        trial_ends_at: dateOffsetIso(2),
        provider_name: 'stripe',
        provider_customer_id: 'cus_MetroStar4',
        provider_subscription_id: 'sub_MetroStarTrial',
        status_history: [
          { id: 11, old_status: null, new_status: 'trialing', reason: 'Sales outreach trial initiated', actor: 'sales@kargoflow.com', timestamp: '2026-09-25T15:00:00Z' },
        ],
      },
    ];

    // 6. Overrides (Section 1.7)
    platformOverrides = [
      {
        id: 'ovr-1',
        tenant_id: 1,
        type: 'limit',
        limit_key: 'active_users',
        override_type: 'add',
        value: 5,
        reason: 'Promotional onboarding user allowance approved by VP Sales',
        expires_at: dateOffsetIso(90),
        created_by: 'admin@fastmovers.com',
        created_at: '2026-02-01T00:00:00Z',
      },
      {
        id: 'ovr-2',
        tenant_id: 1,
        type: 'feature',
        feature_key: 'platform_white_label',
        access_mode: 'write',
        reason: 'White label beta preview granted',
        expires_at: dateOffsetIso(60),
        created_by: 'admin@fastmovers.com',
        created_at: '2026-09-01T00:00:00Z',
      },
      {
        id: 'ovr-3',
        tenant_id: 3,
        type: 'limit',
        limit_key: 'monthly_sms',
        override_type: 'replace',
        value: 30000,
        reason: 'Emergency peak relocation volume waiver',
        expires_at: dateOffsetIso(30),
        created_by: 'admin@fastmovers.com',
        created_at: '2026-09-10T00:00:00Z',
      },
      {
        id: 'ovr-4',
        tenant_id: 8,
        type: 'limit',
        limit_key: 'monthly_api_requests',
        override_type: 'replace',
        value: 5000000,
        reason: 'Enterprise API integration throughput tier contract amendment',
        expires_at: null,
        created_by: 'admin@fastmovers.com',
        created_at: '2026-05-15T00:00:00Z',
      },
      {
        id: 'ovr-5',
        tenant_id: 7,
        type: 'limit',
        limit_key: 'monthly_automations',
        override_type: 'add',
        value: 1000,
        reason: 'Seasonal dispatch volume automation increase',
        expires_at: dateOffsetIso(45),
        created_by: 'admin@fastmovers.com',
        created_at: '2026-09-15T00:00:00Z',
      },
    ];

    // 7. Assigned Add-ons (Section 1.7)
    tenantAssignedAddons = [
      {
        id: 'taa-1',
        tenant_id: 1,
        addon_id: 'addon-branch-1',
        quantity: 1,
        status: 'active',
        started_at: '2026-03-01T00:00:00Z',
        end_date: null,
      },
      {
        id: 'taa-2',
        tenant_id: 3,
        addon_id: 'addon-sms-10k',
        quantity: 2,
        status: 'active',
        started_at: '2026-08-01T00:00:00Z',
        end_date: null,
      },
      {
        id: 'taa-3',
        tenant_id: 6,
        addon_id: 'addon-storage-100gb',
        quantity: 1,
        status: 'active',
        started_at: '2026-08-15T00:00:00Z',
        end_date: null,
      },
      {
        id: 'taa-4',
        tenant_id: 6,
        addon_id: 'addon-users-10',
        quantity: 1,
        status: 'active',
        started_at: '2026-09-01T00:00:00Z',
        end_date: null,
      },
      {
        id: 'taa-5',
        tenant_id: 7,
        addon_id: 'addon-sms-10k',
        quantity: 1,
        status: 'active',
        started_at: '2026-09-10T00:00:00Z',
        end_date: null,
      },
    ];

    // 8. Controlled Support Sessions (Section 1.9)
    platformSupportSessions = [
      {
        id: 'sess-801',
        tenant_id: 1,
        tenant_name: 'KargoFlow Logistics',
        actor_email: 'admin@fastmovers.com',
        actor_role: 'Super Admin',
        mode: 'support_write',
        reason: 'Assisting customer support with custom invoice template format',
        ticket_ref: 'SUP-4921',
        duration_minutes: 240,
        started_at: dateOffsetMinutesIso(-45),
        expires_at: dateOffsetMinutesIso(195),
        ip_address: '192.168.1.100',
        user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        status: 'active',
      },
      {
        id: 'sess-802',
        tenant_id: 3,
        tenant_name: 'Coastline Van Lines',
        actor_email: 'support-lead@kargoflow.com',
        actor_role: 'Support Admin',
        mode: 'support_write',
        reason: 'Resolving billing dispute and payment card reconciliation during grace period',
        ticket_ref: 'SUP-5102',
        duration_minutes: 120,
        started_at: dateOffsetMinutesIso(-20),
        expires_at: dateOffsetMinutesIso(100),
        ip_address: '192.168.1.105',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        status: 'active',
      },
      {
        id: 'sess-798',
        tenant_id: 4,
        tenant_name: 'Nordic Movers Corp',
        actor_email: 'saas-admin@kargoflow.com',
        actor_role: 'SaaS Admin',
        mode: 'support_read',
        reason: 'Conducting audit investigation on abnormal API rate spikes',
        ticket_ref: 'SEC-1092',
        duration_minutes: 60,
        started_at: dateOffsetIso(-5),
        expires_at: dateOffsetIso(-5),
        ip_address: '10.0.4.12',
        user_agent: 'Mozilla/5.0 (X11; Linux x86_64)',
        status: 'ended',
      },
      {
        id: 'sess-795',
        tenant_id: 2,
        tenant_name: 'Apex Relocations',
        actor_email: 'support-lead@kargoflow.com',
        actor_role: 'Support Admin',
        mode: 'support_write',
        reason: 'Assisting with tariff calculations and moving catalog import',
        ticket_ref: 'SUP-4819',
        duration_minutes: 180,
        started_at: dateOffsetIso(-10),
        expires_at: dateOffsetIso(-10),
        ip_address: '192.168.1.105',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        status: 'ended',
      },
    ];

    // 9. Platform Audit Logs (Section 1.11)
    platformAuditLogs = [
      {
        id: 1,
        timestamp: dateOffsetMinutesIso(-10),
        actor_email: 'support-lead@kargoflow.com',
        tenant_id: 3,
        tenant_name: 'Coastline Van Lines',
        action: 'SUPPORT_SESSION_START',
        entity: 'support_session',
        reason: 'Resolving billing dispute and payment card reconciliation during grace period (SUP-5102)',
        metadata: { mode: 'support_write', duration: 120, ticket: 'SUP-5102' },
        ip_address: '192.168.1.105',
      },
      {
        id: 2,
        timestamp: dateOffsetMinutesIso(-45),
        actor_email: 'admin@fastmovers.com',
        tenant_id: 1,
        tenant_name: 'KargoFlow Logistics',
        action: 'SUPPORT_SESSION_START',
        entity: 'support_session',
        reason: 'Assisting customer support with custom invoice template format (SUP-4921)',
        metadata: { mode: 'support_write', duration: 240, ticket: 'SUP-4921' },
        ip_address: '192.168.1.100',
      },
      {
        id: 3,
        timestamp: dateOffsetIso(-2),
        actor_email: 'admin@fastmovers.com',
        tenant_id: 5,
        tenant_name: 'BlueSky Moving & Storage',
        action: 'TENANT_PROVISION',
        entity: 'company',
        reason: 'Self-serve onboarding trial initiated for BlueSky Moving',
        metadata: { plan: 'essential', subdomain: 'bluesky-moves' },
        ip_address: '192.168.1.100',
      },
      {
        id: 4,
        timestamp: dateOffsetIso(-3),
        actor_email: 'stripe_webhook',
        tenant_id: 3,
        tenant_name: 'Coastline Van Lines',
        action: 'SUBSCRIPTION_TRANSITION',
        entity: 'subscription',
        reason: 'Payment card declined on invoice #INV-9921',
        metadata: { from: 'active', to: 'past_due', grace_period_days: 10 },
        ip_address: '54.187.174.169',
      },
      {
        id: 5,
        timestamp: dateOffsetIso(-5),
        actor_email: 'admin@fastmovers.com',
        tenant_id: 4,
        tenant_name: 'Nordic Movers Corp',
        action: 'SUBSCRIPTION_TRANSITION',
        entity: 'subscription',
        reason: 'Security investigation - unauthorized API spam',
        metadata: { from: 'active', to: 'suspended' },
        ip_address: '192.168.1.100',
      },
      {
        id: 6,
        timestamp: dateOffsetIso(-8),
        actor_email: 'support@redrockinterstate.com',
        tenant_id: 9,
        tenant_name: 'RedRock Interstate Freight',
        action: 'SUBSCRIPTION_TRANSITION',
        entity: 'subscription',
        reason: 'Consolidation with parent regional carrier',
        metadata: { from: 'active', to: 'cancelled' },
        ip_address: '72.167.241.8',
      },
      {
        id: 7,
        timestamp: dateOffsetIso(-10),
        actor_email: 'admin@fastmovers.com',
        tenant_id: 1,
        tenant_name: 'KargoFlow Logistics',
        action: 'ENTITLEMENT_OVERRIDE_CREATE',
        entity: 'feature_override',
        reason: 'White label beta preview granted',
        metadata: { feature: 'platform_white_label', mode: 'write' },
        ip_address: '192.168.1.100',
      },
      {
        id: 8,
        timestamp: dateOffsetIso(-12),
        actor_email: 'sales@kargoflow.com',
        tenant_id: 10,
        tenant_name: 'Metro Star Haulers',
        action: 'TENANT_PROVISION',
        entity: 'company',
        reason: 'Sales outreach trial initiated for Metro Star Haulers',
        metadata: { plan: 'professional', subdomain: 'metro-star' },
        ip_address: '192.168.1.100',
      },
      {
        id: 9,
        timestamp: dateOffsetIso(-15),
        actor_email: 'billing@kargoflow.com',
        tenant_id: 7,
        tenant_name: 'Summit Mountain Moving & Storage',
        action: 'SUBSCRIPTION_TRANSITION',
        entity: 'subscription',
        reason: 'Trial conversion to Professional plan',
        metadata: { from: 'trialing', to: 'active', plan: 'plan-professional' },
        ip_address: '192.168.1.102',
      },
      {
        id: 10,
        timestamp: dateOffsetIso(-18),
        actor_email: 'admin@fastmovers.com',
        tenant_id: 7,
        tenant_name: 'Summit Mountain Moving & Storage',
        action: 'ENTITLEMENT_OVERRIDE_CREATE',
        entity: 'limit_override',
        reason: 'Seasonal dispatch volume automation increase',
        metadata: { limit_key: 'monthly_automations', type: 'add', value: 1000 },
        ip_address: '192.168.1.100',
      },
      {
        id: 11,
        timestamp: dateOffsetIso(-25),
        actor_email: 'admin@fastmovers.com',
        tenant_id: 3,
        tenant_name: 'Coastline Van Lines',
        action: 'ADDON_ASSIGNED',
        entity: 'addon_assignment',
        reason: 'Metered SMS capacity expansion pack activated',
        metadata: { addon_id: 'addon-sms-10k', quantity: 2 },
        ip_address: '192.168.1.100',
      },
      {
        id: 12,
        timestamp: dateOffsetIso(-35),
        actor_email: 'admin@fastmovers.com',
        tenant_id: 6,
        tenant_name: 'Vanguard Elite Van Lines',
        action: 'SUBSCRIPTION_PLAN_CHANGE',
        entity: 'subscription',
        reason: 'Account upgraded from Professional to Enterprise Scale',
        metadata: { from_plan: 'plan-professional', to_plan: 'plan-enterprise' },
        ip_address: '192.168.1.100',
      },
      {
        id: 13,
        timestamp: dateOffsetIso(-45),
        actor_email: 'admin@fastmovers.com',
        tenant_id: 8,
        tenant_name: 'Pacific Rim Relocation Services',
        action: 'TENANT_PROVISION',
        entity: 'company',
        reason: 'Custom Enterprise Master Services Agreement executed',
        metadata: { plan: 'plan-custom', interval: 'year' },
        ip_address: '192.168.1.100',
      },
    ];

    // 10. Platform admin/staff seed accounts (Section 1.1)
    platformUsers = createPlatformAdminSeed();
    platformAdmins = platformUsers;
    activeSimulationUserId = 'pusr-1';

    // Ensure corresponding branch records for multi-tenant simulation
    if (db && db.branches) {
      db.branches = [
        { id: 1, company: 1, name: 'Main Branch (Austin)', email: 'austin@fastmovers.com', phone: '512-555-0100', address_line1: '123 Moving Way', city: 'Austin', state: 'TX', zip_code: '78701', is_active: true, is_main: true },
        { id: 2, company: 1, name: 'Dallas Branch', email: 'dallas@fastmovers.com', phone: '214-555-0200', address_line1: '456 Relocation Ave', city: 'Dallas', state: 'TX', zip_code: '75201', is_active: true, is_main: false },
        { id: 3, company: 2, name: 'Seattle Headquarters', email: 'ops@apexrelocations.com', phone: '206-555-0188', address_line1: '789 Olympic Blvd', city: 'Seattle', state: 'WA', zip_code: '98101', is_active: true, is_main: true },
        { id: 4, company: 3, name: 'Miami Central Hub', email: 'billing@coastlinevans.com', phone: '305-555-0199', address_line1: '400 Biscayne Way', city: 'Miami', state: 'FL', zip_code: '33132', is_active: true, is_main: true },
        { id: 5, company: 4, name: 'Chicago North Hub', email: 'admin@nordicmovers.com', phone: '312-555-0177', address_line1: '900 Michigan Ave', city: 'Chicago', state: 'IL', zip_code: '60611', is_active: true, is_main: true },
        { id: 6, company: 5, name: 'Denver Central Depot', email: 'contact@blueskymoves.com', phone: '303-555-0144', address_line1: '1600 Mountain View Rd', city: 'Denver', state: 'CO', zip_code: '80202', is_active: true, is_main: true },
        { id: 7, company: 6, name: 'New York Flagship Terminal', email: 'dispatch@vanguardvanlines.com', phone: '212-555-0155', address_line1: '550 5th Avenue', city: 'New York', state: 'NY', zip_code: '10036', is_active: true, is_main: true },
        { id: 8, company: 7, name: 'Boulder Depot', email: 'info@summitmountainmoving.com', phone: '720-555-0166', address_line1: '2450 Pearl St', city: 'Boulder', state: 'CO', zip_code: '80302', is_active: true, is_main: true },
        { id: 9, company: 8, name: 'San Francisco Financial HQ', email: 'corporate@pacificrimrelocations.com', phone: '415-555-0133', address_line1: '1 Market St, Suite 1800', city: 'San Francisco', state: 'CA', zip_code: '94105', is_active: true, is_main: true },
        { id: 10, company: 9, name: 'Phoenix Interstate Depot', email: 'support@redrockinterstate.com', phone: '602-555-0122', address_line1: '3200 Camelback Rd', city: 'Phoenix', state: 'AZ', zip_code: '85018', is_active: true, is_main: true },
        { id: 11, company: 10, name: 'Atlanta Metro Hub', email: 'sales@metrostarhaulers.com', phone: '404-555-0111', address_line1: '1200 Peachtree St', city: 'Atlanta', state: 'GA', zip_code: '30309', is_active: true, is_main: true },
      ];
    }
  }

  // Initial Seed Execution
  resetAndSeedPlatformData('standard');

  // Helper: Approved Subscription Transition Matrix (Section 2.10)
  const ALLOWED_TRANSITIONS = {
    trialing: ['active', 'cancelled', 'suspended'],
    active: ['past_due', 'paused', 'cancelled', 'expired', 'suspended'],
    past_due: ['active', 'paused', 'cancelled', 'expired', 'suspended'],
    paused: ['active', 'cancelled', 'expired', 'suspended'],
    cancelled: ['active', 'suspended'],
    expired: ['active', 'suspended'],
    suspended: ['active'],
  };

  // Helper: Derived Effective Access (Section 2.4 & Section 2.1)
  const evaluateTenantAccess = (company, subscription) => {
    if (!company || company.is_active === false || company.is_deleted === true || company.functional_state === 'Deactivated' || company.functional_state === 'Closed / Deleted') {
      return { access: 'Blocked', code: 'company_blocked', label: 'Company Inactive/Blocked', canWrite: false };
    }
    if (!subscription) {
      return { access: 'Read-only', code: 'no_subscription', label: 'No Active Subscription', canWrite: false };
    }
    const now = new Date();
    switch (subscription.status) {
      case 'active':
        return { access: 'Full', code: 'full', label: 'Full Access', canWrite: true };
      case 'trialing': {
        const valid = subscription.trial_ends_at ? new Date(subscription.trial_ends_at) > now : true;
        return valid
          ? { access: 'Full', code: 'trial_valid', label: 'Trialing (Full)', canWrite: true }
          : { access: 'Read-only', code: 'trial_expired', label: 'Trial Expired (Read-only)', canWrite: false };
      }
      case 'past_due': {
        const graceValid = subscription.grace_period_ends_at ? new Date(subscription.grace_period_ends_at) > now : true;
        return graceValid
          ? { access: 'Grace / operational write', code: 'grace_valid', label: 'Past Due (Grace Active)', canWrite: true }
          : { access: 'Read-only', code: 'grace_expired', label: 'Past Due (Grace Expired)', canWrite: false };
      }
      case 'paused':
        return { access: 'Read-only', code: 'paused', label: 'Paused (Read-only)', canWrite: false };
      case 'cancelled':
        return { access: 'Read-only', code: 'cancelled', label: 'Cancelled (Read-only initially)', canWrite: false };
      case 'expired':
        return { access: 'Read-only', code: 'expired', label: 'Expired (Read-only initially)', canWrite: false };
      case 'suspended':
        return { access: 'Blocked', code: 'suspended', label: 'Suspended (Blocked)', canWrite: false };
      default:
        return { access: 'Read-only', code: 'unknown', label: subscription.status, canWrite: false };
    }
  };

  // Helper: Compute Effective Entitlement (Section 1.7)
  const calculateEffectiveEntitlement = (tenantId) => {
    const company = db.companies.find((c) => String(c.id) === String(tenantId));
    const sub = platformSubscriptions.find((s) => String(s.tenant_id) === String(tenantId));
    const plan = platformPlans.find((p) => p.id === (sub?.plan_id || company?.plan_id)) || platformPlans[0];
    const tenantOverridesList = platformOverrides.filter((o) => String(o.tenant_id) === String(tenantId));
    const tenantAddonList = tenantAssignedAddons.filter((a) => String(a.tenant_id) === String(tenantId) && a.status === 'active');

    // Effective Features
    const effectiveFeatures = { ...plan.features };
    tenantAddonList.forEach((ta) => {
      const addonDef = platformAddons.find((p) => p.id === ta.addon_id);
      if (addonDef && addonDef.type === 'feature' && addonDef.feature_key) {
        effectiveFeatures[addonDef.feature_key] = addonDef.access_mode || 'write';
      }
    });
    tenantOverridesList.forEach((ovr) => {
      if (ovr.type === 'feature' && ovr.feature_key) {
        const notExpired = !ovr.expires_at || new Date(ovr.expires_at) > new Date();
        if (notExpired) {
          effectiveFeatures[ovr.feature_key] = ovr.access_mode;
        }
      }
    });

    // Effective Limits
    const effectiveLimits = { ...plan.limits };
    tenantAddonList.forEach((ta) => {
      const addonDef = platformAddons.find((p) => p.id === ta.addon_id);
      if (addonDef && addonDef.type === 'quota' && addonDef.limit_key) {
        effectiveLimits[addonDef.limit_key] = (effectiveLimits[addonDef.limit_key] || 0) + (addonDef.increment * (ta.quantity || 1));
      }
    });
    tenantOverridesList.forEach((ovr) => {
      if (ovr.type === 'limit' && ovr.limit_key) {
        const notExpired = !ovr.expires_at || new Date(ovr.expires_at) > new Date();
        if (notExpired) {
          if (ovr.override_type === 'replace') {
            effectiveLimits[ovr.limit_key] = Number(ovr.value);
          } else if (ovr.override_type === 'add') {
            effectiveLimits[ovr.limit_key] = (effectiveLimits[ovr.limit_key] || 0) + Number(ovr.value);
          }
        }
      }
    });

    // Usage Snapshot
    const currentUsage = {
      active_users: company?.active_users_count || db.users.filter((u) => String(u.company || 1) === String(tenantId)).length || 1,
      active_branches: company?.active_branches_count || db.branches.filter((b) => String(b.company || 1) === String(tenantId)).length || 1,
      monthly_sms: 680,
      monthly_email: 3420,
      monthly_api_requests: 18450,
      monthly_automations: 190,
      storage_bytes: 4294967296, // ~4 GB
    };

    const accessBehavior = evaluateTenantAccess(company, sub);

    return {
      tenant_id: tenantId,
      company,
      subscription: sub,
      plan,
      access_behavior: accessBehavior,
      effective_features: effectiveFeatures,
      effective_limits: effectiveLimits,
      current_usage: currentUsage,
      active_overrides: tenantOverridesList,
      active_addons: tenantAddonList.map((ta) => ({
        ...ta,
        addon_details: platformAddons.find((p) => p.id === ta.addon_id),
      })),
    };
  };

  // ==========================================================================
  // Platform Staff RBAC & Authorization Middleware (Section 1.1)
  // ==========================================================================

  function resolvePlatformStaff(req) {
    const explicitId = req.headers['x-platform-user-id'] || req.query.platform_user_id;
    const authHeader = req.headers['authorization'];
    let requestedId = explicitId;
    let requestedSessionVersion = null;

    if (!requestedId && authHeader && authHeader.startsWith('Bearer platform-')) {
      const tokenBody = authHeader.replace('Bearer platform-', '');
      const match = tokenBody.match(/^(pusr-[^.:-]+|[^.:-]+)[.:-]([0-9]+)$/) || tokenBody.match(/^(pusr-[^.:-]+|[^.:-]+)$/);
      if (match) {
        requestedId = match[1].startsWith('pusr-') ? match[1] : `pusr-${match[1]}`;
        if (match[2]) requestedSessionVersion = Number(match[2]);
      }
    }

    if (!requestedId) {
      requestedId = activeSimulationUserId;
    }

    const user = platformUsers.find(
      (u) => u.id === requestedId || u.email.toLowerCase() === String(requestedId).toLowerCase()
    );

    return { user, requestedSessionVersion };
  }

  function authenticatePlatformStaff(req, res, next) {
    const { user, requestedSessionVersion } = resolvePlatformStaff(req);
    if (!user) {
      return res.status(401).json({
        error: 'Platform authentication required. Provide X-Platform-User-Id header or valid platform token.',
        code: 'UNAUTHORIZED',
      });
    }

    // Session version validation (revocation check)
    if (requestedSessionVersion !== null && requestedSessionVersion !== user.session_version) {
      return res.status(401).json({
        error: 'Session revoked due to role, scope, or status modification. Please re-authenticate.',
        code: 'SESSION_REVOKED',
      });
    }

    // Suspension check
    if (user.status === 'suspended') {
      return res.status(403).json({
        error: 'Platform staff account is suspended. Platform access revoked.',
        code: 'ACCOUNT_SUSPENDED',
      });
    }

    // Pending invitation check
    if (user.status === 'invited') {
      return res.status(403).json({
        error: 'Platform staff invitation is pending acceptance.',
        code: 'INVITATION_PENDING',
      });
    }

    // Expiry check
    if (user.expires_at && new Date(user.expires_at).getTime() < Date.now()) {
      return res.status(403).json({
        error: `Platform staff access expired on ${new Date(user.expires_at).toISOString()}.`,
        code: 'ACCESS_EXPIRED',
        expires_at: user.expires_at,
      });
    }

    req.platformUser = user;
    next();
  }

  function requirePlatformPermission(permissionCode) {
    return (req, res, next) => {
      const user = req.platformUser;
      if (!user) return res.status(401).json({ error: 'Platform authentication required', code: 'UNAUTHORIZED' });
      if (!hasPlatformPermission(user, permissionCode)) {
        return res.status(403).json({
          error: `Permission denied. Required platform permission: ${permissionCode}`,
          code: 'FORBIDDEN',
          required_permission: permissionCode,
          user_role: user.role,
        });
      }
      next();
    };
  }

  function requireTenantScope(getTenantId) {
    return (req, res, next) => {
      const user = req.platformUser;
      if (!user) return res.status(401).json({ error: 'Platform authentication required', code: 'UNAUTHORIZED' });
      const tenantId = getTenantId(req);
      if (!tenantId) return next();

      if (!isTenantInScope(user, tenantId)) {
        return res.status(403).json({
          error: `Tenant access out of assigned company scope. Company ID ${tenantId} is not in user assigned scope.`,
          code: 'TENANT_OUT_OF_SCOPE',
          tenant_id: Number(tenantId),
          assigned_companies: user.assigned_companies || [],
        });
      }
      next();
    };
  }

  function isLastActiveSuperAdmin(targetUserId) {
    const activeSuperAdmins = platformUsers.filter((u) => {
      if (u.role !== 'super_admin') return false;
      if (u.status !== 'active') return false;
      if (u.expires_at && new Date(u.expires_at).getTime() < Date.now()) return false;
      return true;
    });

    return activeSuperAdmins.length <= 1 && activeSuperAdmins.some((u) => u.id === targetUserId);
  }

  function validateRoleAssignment(actor, targetRole, assignedCompanies = [], scopeType = 'all') {
    const actorRoleObj = PLATFORM_ROLES[actor?.role] || { rank: 0 };
    const targetRoleObj = PLATFORM_ROLES[targetRole];

    if (!targetRoleObj) {
      return { valid: false, error: `Invalid platform role: ${targetRole}` };
    }

    // Only super_admin can assign super_admin
    if (targetRole === 'super_admin' && actor?.role !== 'super_admin') {
      return {
        valid: false,
        code: 'PRIVILEGE_ESCALATION',
        error: 'Privilege escalation rejected: Only Super Admins can assign the Super Admin role.',
      };
    }

    // Non-super_admin cannot assign a role with equal or higher rank than their own
    if (actor?.role !== 'super_admin' && targetRoleObj.rank >= actorRoleObj.rank) {
      return {
        valid: false,
        code: 'PRIVILEGE_ESCALATION',
        error: `Privilege escalation rejected: Cannot grant role "${targetRole}" with rank equal to or greater than your own.`,
      };
    }

    // Non-super_admin cannot grant global 'all' scope
    if (scopeType === 'all' && actor?.role !== 'super_admin') {
      return {
        valid: false,
        code: 'PRIVILEGE_ESCALATION',
        error: 'Privilege escalation rejected: Only Super Admins can grant global all-company scope.',
      };
    }

    // Non-super_admin cannot grant access to companies they are not assigned to
    if (actor?.company_scope_type === 'assigned') {
      const actorAssigned = (actor.assigned_companies || []).map(Number);
      const targetAssigned = (assignedCompanies || []).map(Number);
      const unauthorized = targetAssigned.filter((id) => !actorAssigned.includes(id));
      if (unauthorized.length > 0) {
        return {
          valid: false,
          code: 'PRIVILEGE_ESCALATION',
          error: `Privilege escalation rejected: Cannot grant companies [${unauthorized.join(', ')}] outside your own assigned scope.`,
        };
      }
    }

    return { valid: true };
  }

  // 0. Platform Identity & Auth Endpoints (Section 1.1)
  app.get('/api/platform/auth/me/', authenticatePlatformStaff, (req, res) => {
    const user = req.platformUser;
    const roleConfig = PLATFORM_ROLES[user.role] || {};
    const permissions = roleConfig.permissions || [];
    
    // Resolve assigned company objects
    const assignedCompanyDetails = (user.assigned_companies || [])
      .map((id) => db.companies.find((c) => Number(c.id) === Number(id)))
      .filter(Boolean)
      .map((c) => ({ id: c.id, name: c.name, subdomain: c.subdomain, city: c.city, state: c.state }));

    res.json({
      user,
      role: user.role,
      role_name: roleConfig.name || user.role,
      permissions,
      company_scope_type: user.company_scope_type,
      assigned_companies: user.assigned_companies || [],
      assigned_companies_details: assignedCompanyDetails,
      simulation_user_id: activeSimulationUserId,
      token: `platform-${user.id}-${user.session_version}`,
    });
  });

  // Login endpoint for standalone platform-admin app
  app.post('/api/platform/auth/login/', (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required.',
        code: 'MISSING_CREDENTIALS',
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = platformUsers.find(
      (u) => u.email.toLowerCase() === normalizedEmail || u.id === normalizedEmail
    );

    if (!user) {
      return res.status(401).json({
        error: 'Invalid platform staff credentials.',
        code: 'INVALID_CREDENTIALS',
      });
    }

    // Suspension check
    if (user.status === 'suspended') {
      return res.status(403).json({
        error: 'Platform staff account is suspended. Platform access revoked.',
        code: 'ACCOUNT_SUSPENDED',
      });
    }

    // Pending invitation check
    if (user.status === 'invited') {
      return res.status(403).json({
        error: 'Platform staff invitation is pending acceptance.',
        code: 'INVITATION_PENDING',
      });
    }

    // Expiry check
    if (user.expires_at && new Date(user.expires_at).getTime() < Date.now()) {
      return res.status(403).json({
        error: `Platform staff access expired on ${new Date(user.expires_at).toISOString()}.`,
        code: 'ACCESS_EXPIRED',
        expires_at: user.expires_at,
      });
    }

    // Update last login
    user.last_login_at = nowIso();

    const roleConfig = PLATFORM_ROLES[user.role] || {};
    const permissions = roleConfig.permissions || [];
    const token = `platform-${user.id}-${user.session_version}`;

    // Resolve assigned company objects
    const assignedCompanyDetails = (user.assigned_companies || [])
      .map((id) => db.companies.find((c) => Number(c.id) === Number(id)))
      .filter(Boolean)
      .map((c) => ({ id: c.id, name: c.name, subdomain: c.subdomain, city: c.city, state: c.state }));

    // Record login in audit trail
    platformAuditLogs.unshift({
      id: nextId(),
      timestamp: nowIso(),
      actor_user_id: user.id,
      actor_name: user.name,
      actor_email: user.email,
      actor_role: user.role,
      company_id: null,
      company_name: 'Platform Control Plane',
      category: 'security',
      action: 'PLATFORM_LOGIN',
      severity: 'info',
      target_resource: 'platform_auth',
      details: `Staff member ${user.name} (${user.email}) logged in successfully.`,
      status: 'success',
      ip_address: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
    });

    res.json({
      token,
      user,
      role: user.role,
      role_name: roleConfig.name || user.role,
      permissions,
      company_scope_type: user.company_scope_type,
      assigned_companies: user.assigned_companies || [],
      assigned_companies_details: assignedCompanyDetails,
    });
  });

  // Switch simulation actor (Super Admin, Support Admin, Support Agent, Auditor, Expired, Suspended)
  app.post('/api/platform/auth/switch/', (req, res) => {
    const { user_id } = req.body || {};
    const target = platformUsers.find((u) => u.id === user_id || u.email.toLowerCase() === String(user_id).toLowerCase());
    if (!target) {
      return res.status(404).json({ error: `Platform user "${user_id}" not found.`, code: 'NOT_FOUND' });
    }

    activeSimulationUserId = target.id;
    res.json({
      success: true,
      message: `Active platform staff persona switched to ${target.name} (${target.role}).`,
      active_user: target,
      token: `platform-${target.id}-${target.session_version}`,
    });
  });

  // Controlled first Super Admin bootstrap endpoint
  app.post('/api/platform/auth/bootstrap/', (req, res) => {
    const activeSuperAdmins = platformUsers.filter(
      (u) => u.role === 'super_admin' && u.status === 'active' && (!u.expires_at || new Date(u.expires_at).getTime() > Date.now())
    );

    if (activeSuperAdmins.length > 0) {
      return res.status(400).json({
        error: 'Active Super Admin account already exists. Bootstrap creation is locked.',
        code: 'SUPER_ADMIN_EXISTS',
        existing_count: activeSuperAdmins.length,
      });
    }

    const { name = 'Initial Super Admin', email = 'admin@fastmovers.com' } = req.body || {};
    const newSuperAdmin = {
      id: `pusr-${nextId()}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: 'super_admin',
      status: 'active',
      company_scope_type: 'all',
      assigned_companies: [],
      mfa_enabled: true,
      mfa_enforced: true,
      expires_at: null,
      session_version: 1,
      created_at: nowIso(),
      created_by: 'system_bootstrap',
      updated_at: nowIso(),
      last_login_at: nowIso(),
    };

    platformUsers.unshift(newSuperAdmin);
    activeSimulationUserId = newSuperAdmin.id;

    platformAuditLogs.unshift({
      id: nextId(),
      timestamp: nowIso(),
      actor_email: newSuperAdmin.email,
      tenant_id: null,
      tenant_name: 'Platform Security Plane',
      action: 'PLATFORM_SUPER_ADMIN_BOOTSTRAP',
      entity: 'platform_user',
      reason: 'First Super Admin account successfully bootstrapped',
      metadata: { user_id: newSuperAdmin.id, email: newSuperAdmin.email },
      ip_address: req.ip || '127.0.0.1',
    });

    res.status(201).json({
      success: true,
      message: 'First Super Admin account created.',
      user: newSuperAdmin,
    });
  });

  // Roles & Permissions Catalog Endpoint
  app.get('/api/platform/roles/', authenticatePlatformStaff, requirePlatformPermission('platform.roles.view'), (_req, res) => {
    res.json({
      count: Object.keys(PLATFORM_ROLES).length,
      results: Object.values(PLATFORM_ROLES),
      permissions: PERMISSION_DEFINITIONS,
    });
  });

  // ==========================================================================
  // Platform API Endpoints
  // ==========================================================================

  // 1. Dashboard Overview (Section 1.12 #13)
  app.get('/api/platform/dashboard/', authenticatePlatformStaff, (req, res) => {
    const totalTenants = db.companies.length;
    const activeTenants = db.companies.filter((c) => c.functional_state === 'Active' && c.is_active).length;
    const provisioningTenants = db.companies.filter((c) => c.functional_state === 'Provisioning' || !c.is_active).length;
    
    const subStatuses = platformSubscriptions.reduce((acc, s) => {
      acc[s.status] = (acc[s.status] || 0) + 1;
      return acc;
    }, {});

    // Calculate approximate MRR (including monthly equivalent of annual plans and active recurring add-ons)
    let mrrCents = 0;
    platformSubscriptions.forEach((s) => {
      if (s.status === 'active') {
        const p = platformPlans.find((plan) => plan.id === s.plan_id);
        if (p) {
          const planPrice = s.billing_interval === 'year' ? Math.round(p.base_price_cents / 12) : p.base_price_cents;
          mrrCents += planPrice || 0;
        }
      }
    });

    tenantAssignedAddons.forEach((ta) => {
      if (ta.status === 'active') {
        const addon = platformAddons.find((a) => a.id === ta.addon_id);
        if (addon) {
          const addonPrice = addon.interval === 'year' ? Math.round(addon.price_cents / 12) : addon.price_cents;
          mrrCents += (addonPrice || 0) * (ta.quantity || 1);
        }
      }
    });

    res.json({
      metrics: {
        total_tenants: totalTenants,
        active_tenants: activeTenants,
        provisioning_tenants: provisioningTenants,
        total_subscriptions: platformSubscriptions.length,
        active_subscriptions: subStatuses.active || 0,
        trialing_subscriptions: subStatuses.trialing || 0,
        past_due_subscriptions: subStatuses.past_due || 0,
        suspended_subscriptions: subStatuses.suspended || 0,
        mrr_cents: mrrCents,
        arr_cents: mrrCents * 12,
        active_support_sessions: platformSupportSessions.filter((s) => s.status === 'active').length,
      },
      recent_audits: platformAuditLogs.slice(0, 8),
      plans_summary: platformPlans.map((p) => ({
        id: p.id,
        name: p.name,
        price_cents: p.base_price_cents,
        subscriber_count: platformSubscriptions.filter((s) => s.plan_id === p.id).length,
      })),
    });
  });

  // 2. Tenants Management (Section 1.2, 2.1, 2.2)
  app.get('/api/platform/tenants/', authenticatePlatformStaff, requirePlatformPermission('platform.tenants.view'), (req, res) => {
    const search = String(req.query.search || '').toLowerCase();
    const statusFilter = req.query.status;

    let companies = db.companies;
    // Enforce company scope: if assigned scope, only return tenants within user's assigned scope
    if (req.platformUser.company_scope_type === 'assigned') {
      const allowedIds = (req.platformUser.assigned_companies || []).map(Number);
      companies = companies.filter((c) => allowedIds.includes(Number(c.id)));
    }

    let rows = companies.map((comp) => {
      const sub = platformSubscriptions.find((s) => String(s.tenant_id) === String(comp.id));
      const plan = platformPlans.find((p) => p.id === (sub?.plan_id || comp.plan_id)) || platformPlans[0];
      const access = evaluateTenantAccess(comp, sub);

      return {
        ...comp,
        subscription: sub,
        plan_name: plan.name,
        plan_id: plan.id,
        access_behavior: access,
        effective_access: access.access,
        can_write: access.canWrite,
      };
    });

    if (search) {
      rows = rows.filter((r) =>
        r.name?.toLowerCase().includes(search) ||
        r.subdomain?.toLowerCase().includes(search) ||
        r.email?.toLowerCase().includes(search)
      );
    }
    if (statusFilter && statusFilter !== 'all') {
      rows = rows.filter((r) => r.subscription?.status === statusFilter || r.functional_state?.toLowerCase() === statusFilter);
    }

    res.json({ count: rows.length, results: rows });
  });

  // Provision New Tenant (Section 2.2)
  app.post('/api/platform/tenants/', authenticatePlatformStaff, requirePlatformPermission('platform.tenants.manage'), (req, res) => {
    const body = req.body || {};
    const companyData = body.company || {};
    const name = (companyData.name || body.name || '').trim();
    const company_id = (companyData.company_id || body.company_id || companyData.subdomain || body.subdomain || '').trim();
    const subdomain = (companyData.subdomain || body.subdomain || company_id).toLowerCase().replace(/[^a-z0-9-]/g, '');
    const legal_name = (companyData.legal_name || body.legal_name || name).trim();
    const email = (companyData.email || body.email || body.initial_admin_email || body.admin?.email || (subdomain ? `admin@${subdomain}.com` : 'admin@company.com')).trim();
    const phone = (companyData.phone || body.phone || '555-0100').trim();
    const website = (companyData.website || body.website || '').trim();
    const country = companyData.country || body.country || 'US';
    const currency = companyData.currency || body.currency || 'USD';
    const timezone = companyData.timezone || body.timezone || 'America/Chicago';
    const plan_id = body.plan_id || 'plan-professional';
    const subscription_type = body.subscription_type || 'paid'; // 'trial', 'paid', 'manual'
    const initial_admin_name = body.admin?.name || body.initial_admin_name || 'Admin User';
    const initial_admin_email = body.admin?.email || body.initial_admin_email || email;
    const initial_admin_password = body.admin?.password || body.initial_admin_password || 'password123';
    const primary_branch_name = body.branch?.name || body.primary_branch_name || 'Main Headquarters';
    const activate_immediately = body.activate_immediately !== undefined ? body.activate_immediately : true;
    const reason = body.reason || 'New tenant provisioned via SaaS Control Plane';

    if (!name || (!company_id && !subdomain)) {
      return res.status(400).json({ error: 'Company Name and Company ID are required.' });
    }

    const companyId = nextId();
    const selectedPlan = platformPlans.find((p) => p.id === plan_id) || platformPlans[1];

    const newCompany = {
      id: companyId,
      company_id: company_id || `CMP-${companyId}`,
      name,
      legal_name: legal_name || name,
      subdomain: subdomain || `cmp-${companyId}`,
      email: email || initial_admin_email || 'admin@' + (subdomain || `cmp-${companyId}`) + '.com',
      phone: phone || '555-0100',
      website: website || '',
      country,
      currency,
      timezone,
      plan_id: selectedPlan.id,
      subscription_plan: selectedPlan.code.toLowerCase(),
      is_active: Boolean(activate_immediately),
      is_deleted: false,
      functional_state: activate_immediately ? 'Active' : 'Provisioning',
      active_branches_count: 1,
      active_users_count: 1,
      created_at: nowIso(),
    };

    db.companies.push(newCompany);

    // Initial Primary Branch (Section 2.2, 3.1)
    const branchId = nextId();
    const newBranch = {
      id: branchId,
      company: companyId,
      name: primary_branch_name,
      email: newCompany.email,
      phone: newCompany.phone,
      is_active: true,
      is_main: true,
      sales_number_prefix: (name.slice(0, 3).toUpperCase() || 'BRN') + '-',
      created_at: nowIso(),
    };
    db.branches.push(newBranch);

    // Initial Tenant Admin User (Section 2.2)
    const userId = nextId();
    const newAdmin = {
      id: userId,
      email: initial_admin_email || newCompany.email,
      first_name: initial_admin_name ? initial_admin_name.split(' ')[0] : 'Company',
      last_name: initial_admin_name ? initial_admin_name.split(' ').slice(1).join(' ') : 'Admin',
      full_name: initial_admin_name || 'Company Admin',
      is_staff: true,
      is_superuser: false,
      is_system_admin: false,
      is_company_owner: true,
      is_active: true,
      company: companyId,
      branch: branchId,
      branch_id: branchId,
      branches: [branchId],
      roles: [1],
      created_at: nowIso(),
    };
    db.users.push(newAdmin);

    // Initial Subscription (Section 2.2, 2.4)
    const subId = `sub-${nextId()}`;
    const initialStatus = subscription_type === 'trial' ? 'trialing' : 'active';
    const trialEnds = subscription_type === 'trial' ? new Date(Date.now() + 14 * 86400000).toISOString() : null;

    const newSub = {
      id: subId,
      tenant_id: companyId,
      tenant_name: name,
      plan_id: selectedPlan.id,
      status: initialStatus,
      billing_interval: 'month',
      current_period_start: nowIso(),
      current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
      trial_ends_at: trialEnds,
      provider_name: subscription_type === 'manual' ? 'manual' : 'stripe',
      provider_customer_id: `cus_${subdomain}_${nextId()}`,
      provider_subscription_id: `sub_${subdomain}_${nextId()}`,
      status_history: [
        {
          id: nextId(),
          old_status: null,
          new_status: initialStatus,
          reason,
          actor: 'admin@fastmovers.com',
          timestamp: nowIso(),
        },
      ],
    };
    platformSubscriptions.push(newSub);

    // Audit log
    platformAuditLogs.unshift({
      id: nextId(),
      timestamp: nowIso(),
      actor_email: 'admin@fastmovers.com',
      tenant_id: companyId,
      tenant_name: name,
      action: 'TENANT_PROVISION',
      entity: 'company',
      reason,
      metadata: { plan_id: selectedPlan.id, initialStatus, subdomain },
      ip_address: req.ip || '127.0.0.1',
    });

    res.status(201).json({
      company: newCompany,
      branch: newBranch,
      admin: newAdmin,
      subscription: newSub,
      message: `Tenant "${name}" successfully provisioned and initialized.`,
    });
  });

  // Tenant Details & Entitlements
  app.get('/api/platform/tenants/:id/', authenticatePlatformStaff, requirePlatformPermission('platform.tenants.view'), requireTenantScope((r) => r.params.id), (req, res) => {
    const comp = db.companies.find((c) => String(c.id) === String(req.params.id));
    if (!comp) return res.status(404).json({ error: 'Tenant not found' });
    const sub = platformSubscriptions.find((s) => String(s.tenant_id) === String(comp.id));
    const access = evaluateTenantAccess(comp, sub);

    res.json({
      ...comp,
      subscription: sub,
      access_behavior: access,
    });
  });

  // Update Tenant Details
  app.patch('/api/platform/tenants/:id/', authenticatePlatformStaff, requirePlatformPermission('platform.tenants.manage'), requireTenantScope((r) => r.params.id), (req, res) => {
    const comp = db.companies.find((c) => String(c.id) === String(req.params.id));
    if (!comp) return res.status(404).json({ error: 'Tenant not found' });

    Object.assign(comp, req.body || {}, { updated_at: nowIso() });
    res.json(comp);
  });

  // Tenant Lifecycle Status (Section 2.1)
  app.post('/api/platform/tenants/:id/status/', authenticatePlatformStaff, requirePlatformPermission('platform.tenants.manage'), requireTenantScope((r) => r.params.id), (req, res) => {
    const { functional_state, reason } = req.body || {};
    const comp = db.companies.find((c) => String(c.id) === String(req.params.id));
    if (!comp) return res.status(404).json({ error: 'Tenant not found' });

    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'Mandatory audit reason is required for tenant lifecycle changes (Section 2.1).' });
    }

    const validStates = ['Provisioning', 'Active', 'Deactivated', 'Closed / Deleted'];
    if (!validStates.includes(functional_state)) {
      return res.status(400).json({ error: `Invalid functional state "${functional_state}". Allowed states: ${validStates.join(', ')} (Section 2.1).` });
    }

    const oldState = comp.functional_state;

    // Apply approved Section 2.1 table mapping
    comp.functional_state = functional_state;
    if (functional_state === 'Active') {
      comp.is_active = true;
      comp.is_deleted = false;
    } else if (functional_state === 'Provisioning') {
      comp.is_active = false;
      comp.is_deleted = false;
    } else if (functional_state === 'Deactivated') {
      comp.is_active = false;
      comp.is_deleted = false;
    } else if (functional_state === 'Closed / Deleted') {
      comp.is_active = false;
      comp.is_deleted = true;
    }

    platformAuditLogs.unshift({
      id: nextId(),
      timestamp: nowIso(),
      actor_email: 'admin@fastmovers.com',
      tenant_id: comp.id,
      tenant_name: comp.name,
      action: 'TENANT_LIFECYCLE_CHANGE',
      entity: 'company',
      reason: reason.trim(),
      metadata: { oldState, newState: comp.functional_state, is_active: comp.is_active, is_deleted: comp.is_deleted },
      ip_address: req.ip || '127.0.0.1',
    });

    res.json(comp);
  });

  // 3. Plan Catalog (Section 1.3)
  app.get('/api/platform/plans/', (_req, res) => {
    res.json({ count: platformPlans.length, results: platformPlans });
  });

  app.post('/api/platform/plans/', (req, res) => {
    const { name, code, version = 'v1.0', base_price_cents, currency = 'USD', billing_interval = 'month', limits, features } = req.body || {};
    const newPlan = {
      id: `plan-${(code || name).toLowerCase().replace(/[^a-z0-9]/g, '-')}-${nextId()}`,
      code: code || name.toUpperCase().replace(/[^A-Z0-9]/g, '_'),
      name,
      version,
      status: 'active',
      is_current: true,
      is_public: true,
      billing_interval,
      currency,
      base_price_cents: Number(base_price_cents) || 0,
      limits: limits || platformPlans[0].limits,
      features: features || platformPlans[0].features,
      created_at: nowIso(),
    };
    platformPlans.push(newPlan);

    platformAuditLogs.unshift({
      id: nextId(),
      timestamp: nowIso(),
      actor_email: 'admin@fastmovers.com',
      action: 'PLAN_CREATE',
      entity: 'plan',
      reason: `Created plan ${newPlan.name} (${newPlan.version})`,
      metadata: { plan_id: newPlan.id },
      ip_address: req.ip || '127.0.0.1',
    });

    res.status(201).json(newPlan);
  });

  app.patch('/api/platform/plans/:id/', (req, res) => {
    const plan = platformPlans.find((p) => p.id === req.params.id);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    Object.assign(plan, req.body || {}, { updated_at: nowIso() });
    res.json(plan);
  });

  // 4. Feature Catalog (Section 1.4)
  app.get('/api/platform/features/', (_req, res) => {
    res.json({ count: platformFeatures.length, results: platformFeatures });
  });

  // 5. Subscription Management & Status Transition (Section 1.6, 2.10)
  app.get('/api/platform/subscriptions/', authenticatePlatformStaff, requirePlatformPermission('platform.subscriptions.view'), (req, res) => {
    const tenantId = req.query.tenant_id;
    let list = [...platformSubscriptions];
    if (tenantId) list = list.filter((s) => String(s.tenant_id) === String(tenantId));
    res.json({ count: list.length, results: list });
  });

  // Controlled Subscription Status Transition (Section 2.10)
  app.post('/api/platform/subscriptions/:id/transition/', authenticatePlatformStaff, requirePlatformPermission('platform.subscriptions.manage'), (req, res) => {
    const next_status = req.body?.next_status || req.body?.new_status || req.body?.status;
    const { reason, grace_period_days } = req.body || {};
    const sub = platformSubscriptions.find((s) => s.id === req.params.id || String(s.tenant_id) === String(req.params.id));
    if (!sub) return res.status(404).json({ error: 'Subscription not found' });

    const currentStatus = sub.status;
    const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];

    // Allow same-status updates for metadata/grace refresh without error
    if (next_status !== currentStatus && !allowed.includes(next_status)) {
      return res.status(400).json({
        error: `Lifecycle transition from "${currentStatus}" to "${next_status}" is forbidden under the approved transition matrix (Section 2.10). Allowed next statuses: ${allowed.join(', ')}.`,
        current_status: currentStatus,
        allowed_transitions: allowed,
      });
    }

    if (!reason) {
      return res.status(400).json({ error: 'Audit reason is required for subscription lifecycle transitions (Section 2.11).' });
    }

    const oldStatus = sub.status;
    sub.status = next_status;
    sub.updated_at = nowIso();

    if (next_status === 'past_due' && grace_period_days) {
      sub.grace_period_ends_at = new Date(Date.now() + Number(grace_period_days) * 86400000).toISOString();
    }

    // Append to immutable history (Section 2.11)
    const historyEntry = {
      id: nextId(),
      old_status: oldStatus,
      new_status: next_status,
      reason,
      actor: 'admin@fastmovers.com',
      timestamp: nowIso(),
    };
    sub.status_history = sub.status_history || [];
    sub.status_history.unshift(historyEntry);

    // Sync company subscription_status
    const comp = db.companies.find((c) => String(c.id) === String(sub.tenant_id));
    if (comp) comp.subscription_status = next_status;

    platformAuditLogs.unshift({
      id: nextId(),
      timestamp: nowIso(),
      actor_email: 'admin@fastmovers.com',
      tenant_id: sub.tenant_id,
      tenant_name: sub.tenant_name,
      action: 'SUBSCRIPTION_TRANSITION',
      entity: 'subscription',
      reason,
      metadata: { from: oldStatus, to: next_status },
      ip_address: req.ip || '127.0.0.1',
    });

    res.json({
      subscription: sub,
      message: `Subscription transitioned from ${oldStatus} to ${next_status}`,
    });
  });

  // Plan Change: Upgrade / Downgrade (Section 2.9)
  app.post('/api/platform/subscriptions/:id/plan-change/', authenticatePlatformStaff, requirePlatformPermission('platform.subscriptions.manage'), (req, res) => {
    const new_plan_id = req.body?.new_plan_id || req.body?.plan_id;
    const { billing_interval = 'month', effective_timing = 'immediate', reason } = req.body || {};
    const sub = platformSubscriptions.find((s) => s.id === req.params.id || String(s.tenant_id) === String(req.params.id));
    if (!sub) return res.status(404).json({ error: 'Subscription not found' });

    if (!new_plan_id) {
      return res.status(400).json({ error: 'New plan ID is required.' });
    }
    const targetPlan = platformPlans.find((p) => p.id === new_plan_id);
    if (!targetPlan) {
      return res.status(404).json({ error: `Target plan "${new_plan_id}" not found.` });
    }

    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'Audit reason is required for plan changes (Section 2.9).' });
    }

    const currentPlan = platformPlans.find((p) => p.id === sub.plan_id);
    const comp = db.companies.find((c) => String(c.id) === String(sub.tenant_id));

    // Downgrade quota check (Section 2.9)
    const isDowngrade = (targetPlan.base_price_cents || 0) < (currentPlan?.base_price_cents || 0);
    const currentUsers = comp?.active_users_count || 1;
    const currentBranches = comp?.active_branches_count || 1;
    let downgradeWarning = null;

    if (isDowngrade) {
      if (currentUsers > targetPlan.limits.active_users || currentBranches > targetPlan.limits.active_branches) {
        downgradeWarning = `Target plan quota is lower than current usage (Users: ${currentUsers}/${targetPlan.limits.active_users}, Branches: ${currentBranches}/${targetPlan.limits.active_branches}). Under Section 2.9, existing resources remain visible, but new creations are blocked until usage is remediated.`;
      }
    }

    const oldSubId = sub.id;
    const oldPlanId = sub.plan_id;

    if (effective_timing === 'next_period') {
      sub.scheduled_plan_change = {
        new_plan_id,
        billing_interval,
        effective_at: sub.current_period_end || new Date(Date.now() + 30 * 86400000).toISOString(),
        reason: reason.trim(),
      };
      return res.json({
        subscription: sub,
        message: `Plan downgrade scheduled for next renewal period: ${sub.current_period_end}`,
        downgrade_warning: downgradeWarning,
      });
    }

    // Section 2.9: "When the base plan changes, the previous current subscription record is ended and a new current subscription record is created, preserving plan history."
    sub.status = 'expired';
    sub.ended_at = nowIso();
    sub.status_history = sub.status_history || [];
    sub.status_history.unshift({
      id: nextId(),
      old_status: sub.status,
      new_status: 'expired',
      reason: `Ended due to commercial plan change to ${targetPlan.name} (${reason})`,
      actor: 'admin@fastmovers.com',
      timestamp: nowIso(),
    });

    const newSubId = `sub-${nextId()}`;
    const newSubscription = {
      id: newSubId,
      tenant_id: sub.tenant_id,
      tenant_name: sub.tenant_name,
      plan_id: targetPlan.id,
      status: 'active',
      billing_interval,
      current_period_start: nowIso(),
      current_period_end: new Date(Date.now() + (billing_interval === 'year' ? 365 : 30) * 86400000).toISOString(),
      provider_name: sub.provider_name || 'stripe',
      provider_customer_id: sub.provider_customer_id,
      provider_subscription_id: sub.provider_subscription_id,
      status_history: [
        {
          id: nextId(),
          old_status: null,
          new_status: 'active',
          reason: `Created via plan change from ${oldPlanId} to ${targetPlan.id} (${reason})`,
          actor: 'admin@fastmovers.com',
          timestamp: nowIso(),
        },
      ],
      previous_subscription_id: oldSubId,
    };

    platformSubscriptions.unshift(newSubscription);

    if (comp) {
      comp.plan_id = targetPlan.id;
      comp.subscription_plan = targetPlan.code.toLowerCase();
      comp.subscription_status = 'active';
    }

    platformAuditLogs.unshift({
      id: nextId(),
      timestamp: nowIso(),
      actor_email: 'admin@fastmovers.com',
      tenant_id: sub.tenant_id,
      tenant_name: sub.tenant_name,
      action: 'PLAN_CHANGE',
      entity: 'subscription',
      reason: reason.trim(),
      metadata: { oldSubId, newSubId, oldPlanId, newPlanId: targetPlan.id, isDowngrade, downgradeWarning },
      ip_address: req.ip || '127.0.0.1',
    });

    res.json({
      subscription: newSubscription,
      previous_subscription: sub,
      message: `Plan changed successfully to ${targetPlan.name}. Previous subscription archived.`,
      downgrade_warning: downgradeWarning,
    });
  });

  // Subscription Cancellation (Section 2.8)
  app.post('/api/platform/subscriptions/:id/cancel/', authenticatePlatformStaff, requirePlatformPermission('platform.subscriptions.manage'), (req, res) => {
    const { cancel_mode = 'period_end', reason } = req.body || {};
    const sub = platformSubscriptions.find((s) => s.id === req.params.id || String(s.tenant_id) === String(req.params.id));
    if (!sub) return res.status(404).json({ error: 'Subscription not found' });

    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'Audit reason is required for subscription cancellation (Section 2.8).' });
    }

    if (cancel_mode === 'period_end') {
      sub.cancel_at_period_end = true;
      sub.status_history = sub.status_history || [];
      sub.status_history.unshift({
        id: nextId(),
        old_status: sub.status,
        new_status: sub.status,
        reason: `Scheduled cancellation at period end (${sub.current_period_end}): ${reason}`,
        actor: 'admin@fastmovers.com',
        timestamp: nowIso(),
      });

      return res.json({
        subscription: sub,
        message: `Scheduled cancellation for end of period (${sub.current_period_end}). Access remains normal until period ends.`,
      });
    }

    // Immediate cancellation
    const oldStatus = sub.status;
    sub.status = 'cancelled';
    sub.ended_at = nowIso();
    sub.cancel_at_period_end = false;
    sub.status_history = sub.status_history || [];
    sub.status_history.unshift({
      id: nextId(),
      old_status: oldStatus,
      new_status: 'cancelled',
      reason: `Immediate cancellation: ${reason}`,
      actor: 'admin@fastmovers.com',
      timestamp: nowIso(),
    });

    const comp = db.companies.find((c) => String(c.id) === String(sub.tenant_id));
    if (comp) comp.subscription_status = 'cancelled';

    platformAuditLogs.unshift({
      id: nextId(),
      timestamp: nowIso(),
      actor_email: 'admin@fastmovers.com',
      tenant_id: sub.tenant_id,
      tenant_name: sub.tenant_name,
      action: 'SUBSCRIPTION_CANCEL',
      entity: 'subscription',
      reason: reason.trim(),
      metadata: { cancel_mode, from: oldStatus, to: 'cancelled' },
      ip_address: req.ip || '127.0.0.1',
    });

    res.json({
      subscription: sub,
      message: 'Subscription cancelled immediately. Effective access changed to read-only initially (Section 2.8).',
    });
  });

  // Subscription Reactivation (Section 2.8)
  app.post('/api/platform/subscriptions/:id/reactivate/', authenticatePlatformStaff, requirePlatformPermission('platform.subscriptions.manage'), (req, res) => {
    const { reason, plan_id } = req.body || {};
    const sub = platformSubscriptions.find((s) => s.id === req.params.id || String(s.tenant_id) === String(req.params.id));
    if (!sub) return res.status(404).json({ error: 'Subscription not found' });

    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'Audit reason is required for subscription reactivation (Section 2.8).' });
    }

    const oldStatus = sub.status;
    sub.status = 'active';
    sub.cancel_at_period_end = false;
    sub.ended_at = null;
    if (plan_id) sub.plan_id = plan_id;
    sub.current_period_start = nowIso();
    sub.current_period_end = new Date(Date.now() + 30 * 86400000).toISOString();

    sub.status_history = sub.status_history || [];
    sub.status_history.unshift({
      id: nextId(),
      old_status: oldStatus,
      new_status: 'active',
      reason: `Reactivation (reuses same company & data): ${reason}`,
      actor: 'admin@fastmovers.com',
      timestamp: nowIso(),
    });

    const comp = db.companies.find((c) => String(c.id) === String(sub.tenant_id));
    if (comp) {
      comp.subscription_status = 'active';
      if (plan_id) comp.plan_id = plan_id;
      if (comp.functional_state === 'Deactivated') {
        comp.functional_state = 'Active';
        comp.is_active = true;
      }
    }

    platformAuditLogs.unshift({
      id: nextId(),
      timestamp: nowIso(),
      actor_email: 'admin@fastmovers.com',
      tenant_id: sub.tenant_id,
      tenant_name: sub.tenant_name,
      action: 'SUBSCRIPTION_REACTIVATE',
      entity: 'subscription',
      reason: reason.trim(),
      metadata: { from: oldStatus, to: 'active', plan_id: sub.plan_id },
      ip_address: req.ip || '127.0.0.1',
    });

    res.json({
      subscription: sub,
      message: 'Subscription reactivated. Full access restored while preserving all tenant data, records, and audit history (Section 2.8).',
    });
  });

  // Trial Management (Section 2.4)
  app.post('/api/platform/subscriptions/:id/trial/', (req, res) => {
    const { trial_ends_at, reason } = req.body || {};
    const sub = platformSubscriptions.find((s) => s.id === req.params.id || String(s.tenant_id) === String(req.params.id));
    if (!sub) return res.status(404).json({ error: 'Subscription not found' });

    if (!trial_ends_at) {
      return res.status(400).json({ error: 'Trial end date is required.' });
    }

    sub.trial_ends_at = new Date(trial_ends_at).toISOString();
    sub.status = 'trialing';

    sub.status_history = sub.status_history || [];
    sub.status_history.unshift({
      id: nextId(),
      old_status: sub.status,
      new_status: 'trialing',
      reason: `Trial end date adjusted to ${sub.trial_ends_at} (${reason || 'Admin trial extension'})`,
      actor: 'admin@fastmovers.com',
      timestamp: nowIso(),
    });

    res.json({
      subscription: sub,
      message: 'Trial end date updated.',
    });
  });

  // Grace Period Management (Section 2.6)
  app.post('/api/platform/subscriptions/:id/grace-period/', (req, res) => {
    const { grace_period_ends_at, grace_period_days, reason } = req.body || {};
    const sub = platformSubscriptions.find((s) => s.id === req.params.id || String(s.tenant_id) === String(req.params.id));
    if (!sub) return res.status(404).json({ error: 'Subscription not found' });

    if (grace_period_ends_at) {
      sub.grace_period_ends_at = new Date(grace_period_ends_at).toISOString();
    } else if (grace_period_days) {
      sub.grace_period_ends_at = new Date(Date.now() + Number(grace_period_days) * 86400000).toISOString();
    } else {
      return res.status(400).json({ error: 'Grace period date or days are required.' });
    }

    sub.status_history = sub.status_history || [];
    sub.status_history.unshift({
      id: nextId(),
      old_status: sub.status,
      new_status: sub.status,
      reason: `Grace period adjusted to ${sub.grace_period_ends_at} (${reason || 'Admin grace adjustment'})`,
      actor: 'admin@fastmovers.com',
      timestamp: nowIso(),
    });

    res.json({
      subscription: sub,
      message: 'Grace period updated.',
    });
  });

  // 6. Entitlements Snapshot & Overrides (Section 1.7, 1.8)
  app.get('/api/platform/tenants/:id/entitlements/', (req, res) => {
    const snapshot = calculateEffectiveEntitlement(req.params.id);
    res.json(snapshot);
  });

  // Create Override
  app.post('/api/platform/tenants/:id/overrides/', (req, res) => {
    const { type, feature_key, limit_key, access_mode, override_type, value, reason, expires_at } = req.body || {};
    if (!reason) {
      return res.status(400).json({ error: 'Reason is required for administrative entitlement overrides (Section 1.7).' });
    }
    const tenantId = Number(req.params.id);
    const newOverride = {
      id: `ovr-${nextId()}`,
      tenant_id: tenantId,
      type: type || (feature_key ? 'feature' : 'limit'),
      feature_key,
      limit_key,
      access_mode,
      override_type: override_type || 'replace',
      value: value !== undefined ? Number(value) : undefined,
      reason,
      expires_at: expires_at || null,
      created_by: 'admin@fastmovers.com',
      created_at: nowIso(),
    };
    platformOverrides.unshift(newOverride);

    const comp = db.companies.find((c) => c.id === tenantId);
    platformAuditLogs.unshift({
      id: nextId(),
      timestamp: nowIso(),
      actor_email: 'admin@fastmovers.com',
      tenant_id: tenantId,
      tenant_name: comp?.name || `Tenant ${tenantId}`,
      action: 'ENTITLEMENT_OVERRIDE_CREATE',
      entity: newOverride.type === 'feature' ? 'feature_override' : 'limit_override',
      reason,
      metadata: newOverride,
      ip_address: req.ip || '127.0.0.1',
    });

    res.status(201).json(newOverride);
  });

  // Delete Override
  app.delete('/api/platform/tenants/:id/overrides/:overrideId/', (req, res) => {
    const idx = platformOverrides.findIndex((o) => o.id === req.params.overrideId);
    if (idx !== -1) {
      const removed = platformOverrides.splice(idx, 1)[0];
      platformAuditLogs.unshift({
        id: nextId(),
        timestamp: nowIso(),
        actor_email: 'admin@fastmovers.com',
        tenant_id: req.params.id,
        action: 'ENTITLEMENT_OVERRIDE_REVOKE',
        entity: 'override',
        reason: 'Administrative override revoked',
        metadata: removed,
        ip_address: req.ip || '127.0.0.1',
      });
    }
    res.status(204).send();
  });

  // 7. Add-ons Catalog & Assignment (Section 1.7)
  app.get('/api/platform/add-ons/', (_req, res) => {
    res.json({ count: platformAddons.length, results: platformAddons });
  });

  app.post('/api/platform/tenants/:id/add-ons/', (req, res) => {
    const { addon_id, quantity = 1, end_date } = req.body || {};
    const addon = platformAddons.find((a) => a.id === addon_id);
    if (!addon) return res.status(404).json({ error: 'Add-on not found in catalog' });

    const newAssignment = {
      id: `taa-${nextId()}`,
      tenant_id: Number(req.params.id),
      addon_id,
      quantity: Number(quantity) || 1,
      status: 'active',
      started_at: nowIso(),
      end_date: end_date || null,
    };
    tenantAssignedAddons.unshift(newAssignment);

    res.status(201).json(newAssignment);
  });

  // 8. Controlled Platform Support Sessions (Section 1.9)
  app.get('/api/platform/support-sessions/', authenticatePlatformStaff, requirePlatformPermission('platform.support_sessions.view'), (_req, res) => {
    res.json({ count: platformSupportSessions.length, results: platformSupportSessions });
  });

  app.post('/api/platform/support-sessions/', authenticatePlatformStaff, requirePlatformPermission('platform.support_sessions.create'), requireTenantScope((r) => r.body.tenant_id), (req, res) => {
    const actor = req.platformUser;
    const { tenant_id, mode = 'support_write', reason, ticket_ref, duration_minutes = 240 } = req.body || {};
    if (!tenant_id || !reason) {
      return res.status(400).json({ error: 'Target tenant and mandatory reason are required to initiate a support session (Section 1.9).' });
    }

    const duration = Math.min(Math.max(Number(duration_minutes) || 240, 15), 480);
    const company = db.companies.find((c) => String(c.id) === String(tenant_id));

    const newSession = {
      id: `sess-${nextId()}`,
      tenant_id: Number(tenant_id),
      tenant_name: company?.name || `Tenant ${tenant_id}`,
      actor_email: actor.email,
      actor_role: actor.role_name || actor.role,
      mode,
      reason,
      ticket_ref: ticket_ref || `TKT-${nextId()}`,
      duration_minutes: duration,
      started_at: nowIso(),
      expires_at: new Date(Date.now() + duration * 60 * 1000).toISOString(),
      ip_address: req.ip || '127.0.0.1',
      user_agent: req.headers['user-agent'] || 'Platform Support Agent',
      status: 'active',
    };
    platformSupportSessions.unshift(newSession);

    platformAuditLogs.unshift({
      id: nextId(),
      timestamp: nowIso(),
      actor_email: actor.email,
      tenant_id: newSession.tenant_id,
      tenant_name: newSession.tenant_name,
      action: 'SUPPORT_SESSION_START',
      entity: 'support_session',
      reason,
      metadata: { session_id: newSession.id, mode, duration_minutes: duration, ticket_ref },
      ip_address: req.ip || '127.0.0.1',
    });

    res.status(201).json(newSession);
  });

  app.post('/api/platform/support-sessions/:id/end/', (req, res) => {
    const sess = platformSupportSessions.find((s) => s.id === req.params.id);
    if (!sess) return res.status(404).json({ error: 'Session not found' });
    sess.status = 'revoked';
    sess.ended_at = nowIso();

    platformAuditLogs.unshift({
      id: nextId(),
      timestamp: nowIso(),
      actor_email: 'admin@fastmovers.com',
      tenant_id: sess.tenant_id,
      tenant_name: sess.tenant_name,
      action: 'SUPPORT_SESSION_END',
      entity: 'support_session',
      reason: 'Support session closed by operator',
      metadata: { session_id: sess.id },
      ip_address: req.ip || '127.0.0.1',
    });

    res.json(sess);
  });

  // 9. Platform Audit Logs (Section 1.11)
  app.get('/api/platform/audit-logs/', authenticatePlatformStaff, requirePlatformPermission('platform.audit.view'), (req, res) => {
    let logs = [...platformAuditLogs];
    if (req.query.tenant_id) {
      logs = logs.filter((l) => String(l.tenant_id) === String(req.query.tenant_id));
    }
    if (req.query.action) {
      logs = logs.filter((l) => l.action === req.query.action);
    }
    if (req.query.search) {
      const q = String(req.query.search).toLowerCase();
      logs = logs.filter((l) =>
        l.action?.toLowerCase().includes(q) ||
        l.reason?.toLowerCase().includes(q) ||
        l.actor_email?.toLowerCase().includes(q) ||
        l.tenant_name?.toLowerCase().includes(q)
      );
    }
    res.json({ count: logs.length, results: logs });
  });

  // 10. Platform Admins & Staff Management (Section 1.1)
  // Helper to enrich user with assigned company metadata
  const enrichStaffUser = (u) => {
    const roleConfig = PLATFORM_ROLES[u.role] || {};
    const assignedCompanies = Array.isArray(u.assigned_companies) ? u.assigned_companies : [];
    const companyDetails = assignedCompanies
      .map((id) => db.companies.find((c) => Number(c.id) === Number(id)))
      .filter(Boolean)
      .map((c) => ({ id: c.id, name: c.name, subdomain: c.subdomain, city: c.city, state: c.state }));

    return {
      ...u,
      role_name: roleConfig.name || u.role,
      role_rank: roleConfig.rank || 0,
      permissions: roleConfig.permissions || [],
      company_details: companyDetails,
      assigned_companies_count: assignedCompanies.length,
      is_last_super_admin: isLastActiveSuperAdmin(u.id),
    };
  };

  // Searchable, filterable platform staff list
  app.get('/api/platform/admins/', authenticatePlatformStaff, requirePlatformPermission('platform.users.view'), (req, res) => {
    const search = String(req.query.search || '').toLowerCase().trim();
    const roleFilter = req.query.role;
    const statusFilter = req.query.status;
    const scopeFilter = req.query.scope;

    let users = platformUsers.map(enrichStaffUser);

    if (search) {
      users = users.filter((u) =>
        u.name?.toLowerCase().includes(search) ||
        u.email?.toLowerCase().includes(search) ||
        u.id?.toLowerCase().includes(search)
      );
    }

    if (roleFilter && roleFilter !== 'all') {
      users = users.filter((u) => u.role === roleFilter);
    }

    if (statusFilter && statusFilter !== 'all') {
      if (statusFilter === 'expired') {
        users = users.filter((u) => u.expires_at && new Date(u.expires_at).getTime() < Date.now());
      } else {
        users = users.filter((u) => u.status === statusFilter);
      }
    }

    if (scopeFilter && scopeFilter !== 'all') {
      users = users.filter((u) => u.company_scope_type === scopeFilter);
    }

    res.json({ count: users.length, results: users });
  });

  // Single admin detail view with effective permissions and recent activity
  app.get('/api/platform/admins/:id/', authenticatePlatformStaff, requirePlatformPermission('platform.users.view'), (req, res) => {
    const user = platformUsers.find((u) => u.id === req.params.id);
    if (!user) {
      return res.status(404).json({ error: `Platform staff account "${req.params.id}" not found.`, code: 'NOT_FOUND' });
    }

    const enriched = enrichStaffUser(user);
    const recentActivity = platformAuditLogs
      .filter((l) => l.actor_email === user.email || l.metadata?.target_user_id === user.id)
      .slice(0, 10);

    res.json({
      ...enriched,
      recent_activity: recentActivity,
    });
  });

  // Create platform staff user (direct creation)
  app.post('/api/platform/admins/', authenticatePlatformStaff, requirePlatformPermission('platform.users.manage'), (req, res) => {
    const actor = req.platformUser;
    const {
      name,
      email,
      role = 'support_agent',
      company_scope_type = 'assigned',
      assigned_companies = [],
      expires_at = null,
      mfa_enforced = true,
      reason = 'Platform staff account created',
    } = req.body || {};

    if (!name?.trim() || !email?.trim()) {
      return res.status(400).json({ error: 'Name and email are required fields.', code: 'VALIDATION_ERROR' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = platformUsers.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (existing) {
      return res.status(400).json({ error: `An account with email "${normalizedEmail}" already exists.`, code: 'EMAIL_EXISTS' });
    }

    // Role & Escalation validation
    const scopeType = role === 'super_admin' ? 'all' : (company_scope_type || 'assigned');
    const assigned = role === 'super_admin' ? [] : (Array.isArray(assigned_companies) ? assigned_companies.map(Number) : []);
    const validation = validateRoleAssignment(actor, role, assigned, scopeType);
    if (!validation.valid) {
      return res.status(403).json(validation);
    }

    const newUser = {
      id: `pusr-${nextId()}`,
      name: name.trim(),
      email: normalizedEmail,
      role,
      status: 'active',
      company_scope_type: scopeType,
      assigned_companies: assigned,
      mfa_enabled: true,
      mfa_enforced: Boolean(mfa_enforced),
      expires_at: expires_at ? new Date(expires_at).toISOString() : null,
      session_version: 1,
      created_at: nowIso(),
      created_by: actor.email,
      updated_at: nowIso(),
      last_login_at: null,
    };

    platformUsers.unshift(newUser);

    // Audit log
    platformAuditLogs.unshift({
      id: nextId(),
      timestamp: nowIso(),
      actor_email: actor.email,
      tenant_id: null,
      tenant_name: 'Platform Security Plane',
      action: 'PLATFORM_USER_CREATED',
      entity: 'platform_user',
      reason,
      metadata: {
        target_user_id: newUser.id,
        target_user_email: newUser.email,
        role: newUser.role,
        company_scope_type: newUser.company_scope_type,
        assigned_companies: newUser.assigned_companies,
      },
      ip_address: req.ip || '127.0.0.1',
    });

    res.status(201).json(enrichStaffUser(newUser));
  });

  // Invite platform staff user
  app.post('/api/platform/admins/invite/', authenticatePlatformStaff, requirePlatformPermission('platform.users.manage'), (req, res) => {
    const actor = req.platformUser;
    const {
      name,
      email,
      role = 'support_agent',
      company_scope_type = 'assigned',
      assigned_companies = [],
      expires_at = null,
      mfa_enforced = true,
      reason = 'Invitation issued to new platform staff member',
    } = req.body || {};

    if (!name?.trim() || !email?.trim()) {
      return res.status(400).json({ error: 'Name and email are required fields.', code: 'VALIDATION_ERROR' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = platformUsers.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (existing) {
      return res.status(400).json({ error: `An account with email "${normalizedEmail}" already exists.`, code: 'EMAIL_EXISTS' });
    }

    const scopeType = role === 'super_admin' ? 'all' : (company_scope_type || 'assigned');
    const assigned = role === 'super_admin' ? [] : (Array.isArray(assigned_companies) ? assigned_companies.map(Number) : []);
    const validation = validateRoleAssignment(actor, role, assigned, scopeType);
    if (!validation.valid) {
      return res.status(403).json(validation);
    }

    const newUser = {
      id: `pusr-${nextId()}`,
      name: name.trim(),
      email: normalizedEmail,
      role,
      status: 'invited',
      company_scope_type: scopeType,
      assigned_companies: assigned,
      mfa_enabled: true,
      mfa_enforced: Boolean(mfa_enforced),
      expires_at: expires_at ? new Date(expires_at).toISOString() : null,
      session_version: 1,
      invite_token: `inv_${Math.random().toString(36).slice(2)}`,
      created_at: nowIso(),
      created_by: actor.email,
      updated_at: nowIso(),
      last_login_at: null,
    };

    platformUsers.unshift(newUser);

    platformAuditLogs.unshift({
      id: nextId(),
      timestamp: nowIso(),
      actor_email: actor.email,
      tenant_id: null,
      tenant_name: 'Platform Security Plane',
      action: 'PLATFORM_USER_INVITED',
      entity: 'platform_user',
      reason,
      metadata: {
        target_user_id: newUser.id,
        target_user_email: newUser.email,
        role: newUser.role,
        company_scope_type: newUser.company_scope_type,
        assigned_companies: newUser.assigned_companies,
      },
      ip_address: req.ip || '127.0.0.1',
    });

    res.status(201).json(enrichStaffUser(newUser));
  });

  // Update staff role, scope, or expiration
  app.patch('/api/platform/admins/:id/', authenticatePlatformStaff, requirePlatformPermission('platform.users.manage'), (req, res) => {
    const actor = req.platformUser;
    const target = platformUsers.find((u) => u.id === req.params.id);
    if (!target) {
      return res.status(404).json({ error: 'Platform staff account not found', code: 'NOT_FOUND' });
    }

    const body = req.body || {};
    const oldRole = target.role;
    const newRole = body.role || target.role;
    const newScope = body.company_scope_type || target.company_scope_type;
    const newAssigned = body.assigned_companies !== undefined
      ? (Array.isArray(body.assigned_companies) ? body.assigned_companies.map(Number) : [])
      : target.assigned_companies;

    // Check last active Super Admin demotion protection
    if (oldRole === 'super_admin' && newRole !== 'super_admin') {
      if (isLastActiveSuperAdmin(target.id)) {
        return res.status(400).json({
          error: 'Cannot demote the last active Super Admin. At least one active Super Admin is required.',
          code: 'LAST_SUPER_ADMIN_PROTECTED',
        });
      }
    }

    // Validate privilege escalation for role change or scope change
    if (newRole !== oldRole || newScope !== target.company_scope_type) {
      const validation = validateRoleAssignment(actor, newRole, newAssigned, newScope);
      if (!validation.valid) {
        return res.status(403).json(validation);
      }
    }

    let roleOrScopeChanged = false;
    if (newRole !== oldRole || newScope !== target.company_scope_type || JSON.stringify(newAssigned) !== JSON.stringify(target.assigned_companies)) {
      roleOrScopeChanged = true;
      // Operational safeguard: Revoke sessions when access is modified or reduced
      target.session_version += 1;
    }

    if (body.name) target.name = body.name.trim();
    if (body.role) target.role = newRole;
    if (body.company_scope_type) target.company_scope_type = newScope;
    if (body.assigned_companies !== undefined) target.assigned_companies = newAssigned;
    if (body.expires_at !== undefined) target.expires_at = body.expires_at ? new Date(body.expires_at).toISOString() : null;
    if (body.mfa_enforced !== undefined) target.mfa_enforced = Boolean(body.mfa_enforced);
    target.updated_at = nowIso();

    platformAuditLogs.unshift({
      id: nextId(),
      timestamp: nowIso(),
      actor_email: actor.email,
      tenant_id: null,
      tenant_name: 'Platform Security Plane',
      action: roleOrScopeChanged ? 'PLATFORM_USER_ROLE_SCOPE_MODIFIED' : 'PLATFORM_USER_UPDATED',
      entity: 'platform_user',
      reason: body.reason || 'Platform staff account modified by administrator',
      metadata: {
        target_user_id: target.id,
        target_user_email: target.email,
        old_role: oldRole,
        new_role: target.role,
        old_scope: target.company_scope_type,
        new_scope: target.company_scope_type,
        assigned_companies: target.assigned_companies,
        session_version: target.session_version,
      },
      ip_address: req.ip || '127.0.0.1',
    });

    res.json(enrichStaffUser(target));
  });

  // Suspend staff member (operational safeguard with session revocation)
  app.post('/api/platform/admins/:id/suspend/', authenticatePlatformStaff, requirePlatformPermission('platform.users.manage'), (req, res) => {
    const actor = req.platformUser;
    const target = platformUsers.find((u) => u.id === req.params.id);
    if (!target) {
      return res.status(404).json({ error: 'Platform staff account not found', code: 'NOT_FOUND' });
    }

    if (target.status === 'suspended') {
      return res.status(400).json({ error: 'Account is already suspended.', code: 'ALREADY_SUSPENDED' });
    }

    // Operational safeguard: Protect last active Super Admin from suspension
    if (target.role === 'super_admin' && isLastActiveSuperAdmin(target.id)) {
      return res.status(400).json({
        error: 'Cannot suspend the last active Super Admin. Operational continuity requires at least one active Super Admin.',
        code: 'LAST_SUPER_ADMIN_PROTECTED',
      });
    }

    const reason = req.body?.reason || 'Account suspended by platform administrator';

    target.status = 'suspended';
    target.suspended_at = nowIso();
    target.suspended_by = actor.email;
    target.suspension_reason = reason;
    // Operational safeguard: Increment session version to instantly revoke all active tokens/sessions
    target.session_version += 1;
    target.updated_at = nowIso();

    platformAuditLogs.unshift({
      id: nextId(),
      timestamp: nowIso(),
      actor_email: actor.email,
      tenant_id: null,
      tenant_name: 'Platform Security Plane',
      action: 'PLATFORM_USER_SUSPENDED',
      entity: 'platform_user',
      reason,
      metadata: {
        target_user_id: target.id,
        target_user_email: target.email,
        new_session_version: target.session_version,
      },
      ip_address: req.ip || '127.0.0.1',
    });

    res.json({
      success: true,
      message: `Platform staff account ${target.name} has been suspended and active sessions revoked.`,
      user: enrichStaffUser(target),
    });
  });

  // Reactivate suspended staff member
  app.post('/api/platform/admins/:id/reactivate/', authenticatePlatformStaff, requirePlatformPermission('platform.users.manage'), (req, res) => {
    const actor = req.platformUser;
    const target = platformUsers.find((u) => u.id === req.params.id);
    if (!target) {
      return res.status(404).json({ error: 'Platform staff account not found', code: 'NOT_FOUND' });
    }

    if (target.status === 'active') {
      return res.status(400).json({ error: 'Account is already active.', code: 'ALREADY_ACTIVE' });
    }

    const reason = req.body?.reason || 'Account reactivated by platform administrator';

    target.status = 'active';
    target.reactivated_at = nowIso();
    target.reactivated_by = actor.email;
    target.session_version += 1;
    target.updated_at = nowIso();

    platformAuditLogs.unshift({
      id: nextId(),
      timestamp: nowIso(),
      actor_email: actor.email,
      tenant_id: null,
      tenant_name: 'Platform Security Plane',
      action: 'PLATFORM_USER_REACTIVATED',
      entity: 'platform_user',
      reason,
      metadata: {
        target_user_id: target.id,
        target_user_email: target.email,
      },
      ip_address: req.ip || '127.0.0.1',
    });

    res.json({
      success: true,
      message: `Platform staff account ${target.name} has been reactivated.`,
      user: enrichStaffUser(target),
    });
  });

  // 11. Seed & Template Presentation Endpoints
  app.post('/api/platform/seed-data/', (req, res) => {
    const { template = 'standard' } = req.body || {};
    resetAndSeedPlatformData(template);

    // Record re-seed in platform audit logs
    platformAuditLogs.unshift({
      id: nextId(),
      timestamp: nowIso(),
      actor_email: 'admin@fastmovers.com',
      tenant_id: null,
      tenant_name: 'Platform Control Plane',
      action: 'PLATFORM_DATA_RESEED',
      entity: 'platform_store',
      reason: `SaaS Platform Control Center seeded with test and presentation template dataset (${template})`,
      metadata: { template, tenants_count: db.companies.length, subscriptions_count: platformSubscriptions.length },
      ip_address: req.ip || '127.0.0.1',
    });

    res.json({
      success: true,
      message: 'SaaS Platform Control Center seeded successfully with test and presentation template data.',
      template,
      summary: {
        tenants: db.companies.length,
        subscriptions: platformSubscriptions.length,
        plans: platformPlans.length,
        features: platformFeatures.length,
        addons: platformAddons.length,
        overrides: platformOverrides.length,
        support_sessions: platformSupportSessions.length,
        admins: platformAdmins.length,
        audit_logs: platformAuditLogs.length,
      },
    });
  });

  app.post('/api/platform/reset-demo/', (req, res) => {
    resetAndSeedPlatformData('standard');
    res.json({
      success: true,
      message: 'SaaS Platform Control Center reset to standard demo presentation template data.',
    });
  });
}
