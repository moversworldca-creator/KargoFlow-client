import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { setupPlatformRoutes } from './serverPlatformRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ============================================================================
// Helper Utilities
// ============================================================================
const nowIso = () => new Date().toISOString();
const dateOffsetYmd = (daysOffset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().slice(0, 10);
};
const dateOffsetIso = (daysOffset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString();
};

const ALL_PERMISSIONS = [
  'crm.admin',
  'crm.dashboard.view',
  'crm.leads.view',
  'crm.leads.create',
  'crm.leads.edit',
  'crm.leads.assign',
  'crm.leads.change_branch',
  'crm.leads.convert',
  'crm.pipeline.view',
  'crm.reports.view',
  'crm.opportunities.view',
  'crm.opportunities.edit',
  'crm.opportunities.create',
  'crm.opportunities.duplicate',
  'crm.opportunities.book',
  'crm.opportunities.mark_lost',
  'crm.tasks.view',
  'crm.tasks.create',
  'crm.tasks.edit',
  'crm.estimates.view',
  'crm.payments.view',
  'crm.audit.view',
  'crm.settings.users.view',
  'crm.settings.users.manage',
  'crm.settings.roles.view',
  'crm.settings.roles.manage',
  'crm.settings.status_codes.view',
  'crm.settings.status_codes.manage',
  'crm.settings.integrations.view',
  'crm.settings.integrations.manage',
  'crm.settings.fleet.view',
  'crm.settings.fleet.manage',
  'crm.settings.catalog.view',
  'crm.settings.catalog.manage',
  'crm.settings.portal_templates.view',
  'crm.settings.portal_templates.manage',
  'crm.settings.customer_portals.view',
  'crm.settings.customer_portals.manage',
  'crm.settings.communication_templates.view',
  'crm.settings.communication_templates.manage',
  'crm.settings.discounts.view',
  'crm.settings.discounts.manage',
  'crm.settings.automations.view',
  'crm.settings.automations.manage',
  'crm.communications.email.send',
  'crm.communications.sms.send',
  'crm.communications.call.log',
  'crm.communications.history.view',
];

// ============================================================================
// In-Memory Seeded Store (Mocked — Ephemeral per AI Studio runtime)
// ============================================================================
let nextIdCounter = 500;
const nextId = () => ++nextIdCounter;

const db = {
  companies: [
    {
      id: 1,
      name: 'KargoFlow',
      subdomain: 'fastmovers',
      email: 'admin@fastmovers.com',
      phone: '512-555-0100',
      address_line1: '123 Moving Way',
      city: 'Austin',
      state: 'TX',
      zip_code: '78701',
      subscription_plan: 'pro',
      is_active: true,
    },
  ],
  branches: [
    {
      id: 1,
      company: 1,
      name: 'Main Branch',
      email: 'austin@fastmovers.com',
      phone: '512-555-0100',
      address_line1: '123 Moving Way',
      city: 'Austin',
      state: 'TX',
      zip_code: '78701',
      is_active: true,
      is_main: true,
      allow_booking_without_deposit: true,
      default_arrival_window: '08:00 - 10:00',
      sales_number_prefix: 'AUS-',
      deposit_type: 'fixed',
      deposit_value: '150.00',
      tax_rate: '8.25',
    },
    {
      id: 2,
      company: 1,
      name: 'Dallas Branch',
      email: 'dallas@fastmovers.com',
      phone: '214-555-0200',
      address_line1: '456 Relocation Ave',
      city: 'Dallas',
      state: 'TX',
      zip_code: '75201',
      is_active: true,
      is_main: false,
      allow_booking_without_deposit: true,
      default_arrival_window: '09:00 - 11:00',
      sales_number_prefix: 'DAL-',
      deposit_type: 'fixed',
      deposit_value: '150.00',
      tax_rate: '8.25',
    },
  ],
  roles: [
    {
      id: 1,
      name: 'Admin',
      branch: 1,
      branch_id: 1,
      branch_name: 'Main Branch',
      description: 'Full access to all modules',
      permissions: ALL_PERMISSIONS,
    },
    {
      id: 2,
      name: 'Manager',
      branch: 1,
      branch_id: 1,
      branch_name: 'Main Branch',
      description: 'Manage sales team and opportunities',
      permissions: ALL_PERMISSIONS,
    },
    {
      id: 3,
      name: 'Sales Rep',
      branch: 1,
      branch_id: 1,
      branch_name: 'Main Branch',
      description: 'Handle leads and opportunities',
      permissions: ALL_PERMISSIONS.slice(1, 20),
    },
  ],
  users: [
    {
      id: 1,
      email: 'admin@fastmovers.com',
      first_name: 'System',
      last_name: 'Administrator',
      full_name: 'System Administrator',
      phone: '512-555-0101',
      employee_type: 'System Administrator',
      is_staff: true,
      is_superuser: true,
      is_system_admin: true,
      is_company_owner: true,
      is_active: true,
      branch: 1,
      branch_id: 1,
      branches: [1, 2],
      roles: [1],
      permissions: ALL_PERMISSIONS,
    },
    {
      id: 2,
      email: 'manager@fastmovers.com',
      first_name: 'Sarah',
      last_name: 'Jenkins',
      full_name: 'Sarah Jenkins',
      phone: '512-555-0102',
      employee_type: 'Sales Manager',
      is_staff: true,
      is_superuser: false,
      is_system_admin: false,
      is_active: true,
      branch: 1,
      branch_id: 1,
      branches: [1, 2],
      roles: [2],
      permissions: ALL_PERMISSIONS,
    },
    {
      id: 3,
      email: 'rep1@fastmovers.com',
      first_name: 'Marcus',
      last_name: 'Vance',
      full_name: 'Marcus Vance',
      phone: '512-555-0103',
      employee_type: 'Senior Estimator',
      is_staff: true,
      is_superuser: false,
      is_system_admin: false,
      is_active: true,
      branch: 1,
      branch_id: 1,
      branches: [1],
      roles: [3],
      permissions: ALL_PERMISSIONS,
    },
    {
      id: 4,
      email: 'rep2@fastmovers.com',
      first_name: 'Elena',
      last_name: 'Rostova',
      full_name: 'Elena Rostova',
      phone: '214-555-0204',
      employee_type: 'Relocation Specialist',
      is_staff: true,
      is_superuser: false,
      is_system_admin: false,
      is_active: true,
      branch: 2,
      branch_id: 2,
      branches: [2],
      roles: [3],
      permissions: ALL_PERMISSIONS,
    },
  ],
  moveTypes: [
    { id: 1, name: 'Local', label: 'Local', branch: 1, description: 'Local move within metro area', is_active: true },
    { id: 2, name: 'Long Distance', label: 'Long Distance', branch: 1, description: 'Interstate or regional relocation', is_active: true },
    { id: 3, name: 'Commercial', label: 'Commercial', branch: 1, description: 'Office and commercial relocation', is_active: true },
  ],
  serviceTypes: [
    { id: 1, name: 'Moving', label: 'Moving', branch: 1, description: 'Full residential and commercial moving services', is_active: true },
    { id: 2, name: 'Packing & Moving', label: 'Packing & Moving', branch: 1, description: 'Full-service packing plus transport', is_active: true },
    { id: 3, name: 'Labor Only', label: 'Labor Only', branch: 1, description: 'Loading or unloading labor assistance', is_active: true },
  ],
  moverSizes: [
    { id: 1, name: '1 Bedroom Apartment', label: '1 Bedroom Apartment', description: 'Approx. 400-600 cu ft', is_active: true },
    { id: 2, name: '2 Bedroom Apartment', label: '2 Bedroom Apartment', description: 'Approx. 700-900 cu ft', is_active: true },
    { id: 3, name: '3 Bedroom House', label: '3 Bedroom House', description: 'Approx. 1,200-1,500 cu ft', is_active: true },
    { id: 4, name: '4+ Bedroom House', label: '4+ Bedroom House', description: 'Approx. 1,800+ cu ft', is_active: true },
    { id: 5, name: 'Commercial Office', label: 'Commercial Office', description: 'Commercial suite relocation', is_active: true },
  ],
  referralSources: [
    { id: 1, name: 'Google Ads', label: 'Google Ads', is_active: true },
    { id: 2, name: 'Organic Website', label: 'Organic Website', is_active: true },
    { id: 3, name: 'Yelp', label: 'Yelp', is_active: true },
    { id: 4, name: 'Past Customer Referral', label: 'Past Customer Referral', is_active: true },
    { id: 5, name: 'Realtor Partner', label: 'Realtor Partner', is_active: true },
  ],
  statusCodes: [
    { id: 1, code: 'new_lead', name: 'New Lead', label: 'New Lead', workflow_stage: 'new_lead', color: '#0284C7', is_active: true },
    { id: 2, code: 'attempted_contact', name: 'Attempted Contact', label: 'Attempted Contact', workflow_stage: 'lead_in_progress', color: '#6366F1', is_active: true },
    { id: 3, code: 'qualifying', name: 'Qualifying', label: 'Qualifying', workflow_stage: 'opportunity', color: '#7C3AED', is_active: true },
    { id: 4, code: 'estimate_sent', name: 'Estimate Sent', label: 'Estimate Sent', workflow_stage: 'estimate', color: '#8B5CF6', is_active: true },
    { id: 5, code: 'booked', name: 'Booked', label: 'Booked', workflow_stage: 'booked', color: '#D97706', is_active: true },
    { id: 6, code: 'confirmed', name: 'Confirmed', label: 'Confirmed', workflow_stage: 'confirmed', color: '#0D9488', is_active: true },
    { id: 7, code: 'completed', name: 'Completed', label: 'Completed', workflow_stage: 'completed', color: '#059669', is_active: true },
    { id: 8, code: 'lost', name: 'Lost', label: 'Lost', workflow_stage: 'lost', color: '#E11D48', is_active: true },
  ],
  lossReasons: [
    { id: 1, name: 'Price too high', label: 'Price too high', is_active: true },
    { id: 2, name: 'Chose another mover', label: 'Chose another mover', is_active: true },
    { id: 3, name: 'Move canceled / postponed', label: 'Move canceled / postponed', is_active: true },
    { id: 4, name: 'Dates unavailable', label: 'Dates unavailable', is_active: true },
  ],
  trucks: [
    { id: 1, name: 'Truck #101 - Freightliner 26ft', license_plate: 'TX-KGF-101', capacity_cuft: 1600, length_ft: 26, status: 'available', is_active: true, branch: 1, branch_id: 1, branch_name: 'Main Branch' },
    { id: 2, name: 'Truck #102 - Hino 26ft', license_plate: 'TX-KGF-102', capacity_cuft: 1600, length_ft: 26, status: 'available', is_active: true, branch: 1, branch_id: 1, branch_name: 'Main Branch' },
    { id: 3, name: 'Truck #103 - Isuzu 20ft', license_plate: 'TX-KGF-103', capacity_cuft: 1100, length_ft: 20, status: 'available', is_active: true, branch: 1, branch_id: 1, branch_name: 'Main Branch' },
    { id: 4, name: 'Truck #201 - Freightliner 26ft', license_plate: 'TX-KGF-201', capacity_cuft: 1600, length_ft: 26, status: 'available', is_active: true, branch: 2, branch_id: 2, branch_name: 'Dallas Branch' },
  ],
  crewMembers: [
    { id: 1, first_name: 'Carlos', last_name: 'Mendez', full_name: 'Carlos Mendez', role: 'driver', phone: '512-555-0301', email: 'carlos@fastmovers.com', hourly_rate: '28.00', is_active: true, branch: 1, branch_id: 1 },
    { id: 2, first_name: 'Devon', last_name: 'Brooks', full_name: 'Devon Brooks', role: 'mover', phone: '512-555-0302', email: 'devon@fastmovers.com', hourly_rate: '22.00', is_active: true, branch: 1, branch_id: 1 },
    { id: 3, first_name: 'Tyler', last_name: 'Hayes', full_name: 'Tyler Hayes', role: 'mover', phone: '512-555-0303', email: 'tyler@fastmovers.com', hourly_rate: '22.00', is_active: true, branch: 1, branch_id: 1 },
    { id: 4, first_name: 'Andre', last_name: 'Walsh', full_name: 'Andre Walsh', role: 'driver', phone: '214-555-0304', email: 'andre@fastmovers.com', hourly_rate: '29.00', is_active: true, branch: 2, branch_id: 2 },
    { id: 5, first_name: 'Mateo', last_name: 'Silva', full_name: 'Mateo Silva', role: 'mover', phone: '214-555-0305', email: 'mateo@fastmovers.com', hourly_rate: '23.00', is_active: true, branch: 2, branch_id: 2 },
  ],
  leads: [
    {
      id: 101,
      sales_number: 10041,
      display_number: 'AUS-10041',
      first_name: 'olivia',
      last_name: 'Hartman',
      name: 'Olivia Hartman',
      email: 'olivia.hartman@example.com',
      phone: '512-555-0811',
      branch: 1,
      branch_id: 1,
      branch_name: 'Main Branch',
      branch_state: 'TX',
      assigned_to: 3,
      assigned_user_id: 3,
      assigned_user_name: 'Marcus Vance',
      status: 'new',
      lead_status: 'new',
      lead_status_code: 1,
      lead_status_label: 'New Lead',
      custom_status_code: 1,
      custom_status_label: 'New Lead',
      workflow_stage: 'new_lead',
      workflow_stage_label: 'New Lead',
      service_type: 'Moving',
      move_type: 'Local',
      move_size: '3 Bedroom House',
      move_date: dateOffsetYmd(3),
      priority: 'hot',
      source: 'Google Ads',
      lead_cost: '1850.00',
      value: 1850,
      origin_address: '742 Evergreen Terrace',
      origin_city: 'Austin',
      origin_state: 'TX',
      origin_zip: '78704',
      origin: 'Austin, TX',
      destination_address: '1900 Barton Springs Rd',
      destination_city: 'Austin',
      destination_state: 'TX',
      destination_zip: '78701',
      destination: 'Austin, TX',
      notes: 'Customer moving from 3BR single family home, needs piano moving quote.',
      created_at: dateOffsetIso(-1),
      updated_at: dateOffsetIso(0),
      assigned_at: dateOffsetIso(-1),
      last_contacted_at: dateOffsetIso(0),
    },
    {
      id: 102,
      sales_number: 10042,
      display_number: 'AUS-10042',
      first_name: 'Liam',
      last_name: 'Callahan',
      name: 'Liam Callahan',
      email: 'liam.callahan@example.com',
      phone: '512-555-0824',
      branch: 1,
      branch_id: 1,
      branch_name: 'Main Branch',
      branch_state: 'TX',
      assigned_to: 3,
      assigned_user_id: 3,
      assigned_user_name: 'Marcus Vance',
      status: 'contacted',
      lead_status: 'contacted',
      lead_status_code: 2,
      lead_status_label: 'Attempted Contact',
      custom_status_code: 2,
      custom_status_label: 'Attempted Contact',
      workflow_stage: 'lead_in_progress',
      workflow_stage_label: 'Lead In Progress',
      service_type: 'Packing & Moving',
      move_type: 'Local',
      move_size: '2 Bedroom Apartment',
      move_date: dateOffsetYmd(6),
      priority: 'high',
      source: 'Organic Website',
      lead_cost: '1290.00',
      value: 1290,
      origin_address: '301 W 2nd St',
      origin_city: 'Austin',
      origin_state: 'TX',
      origin_zip: '78701',
      origin: 'Austin, TX',
      destination_address: '11400 Burnet Rd',
      destination_city: 'Austin',
      destination_state: 'TX',
      destination_zip: '78758',
      destination: 'Austin, TX',
      notes: '2nd floor apartment with elevator reserve available.',
      created_at: dateOffsetIso(-2),
      updated_at: dateOffsetIso(-1),
      assigned_at: dateOffsetIso(-2),
      last_contacted_at: dateOffsetIso(-1),
    },
    {
      id: 103,
      sales_number: 10043,
      display_number: 'DAL-10043',
      first_name: 'Sophia',
      last_name: 'Patel',
      name: 'Sophia Patel',
      email: 'sophia.patel@example.com',
      phone: '214-555-0912',
      branch: 2,
      branch_id: 2,
      branch_name: 'Dallas Branch',
      branch_state: 'TX',
      assigned_to: 4,
      assigned_user_id: 4,
      assigned_user_name: 'Elena Rostova',
      status: 'new',
      lead_status: 'new',
      lead_status_code: 1,
      lead_status_label: 'New Lead',
      custom_status_code: 1,
      custom_status_label: 'New Lead',
      workflow_stage: 'new_lead',
      workflow_stage_label: 'New Lead',
      service_type: 'Moving',
      move_type: 'Long Distance',
      move_size: '4+ Bedroom House',
      move_date: dateOffsetYmd(10),
      priority: '',
      source: 'Realtor Partner',
      lead_cost: '4200.00',
      value: 4200,
      origin_address: '4500 Preston Rd',
      origin_city: 'Dallas',
      origin_state: 'TX',
      origin_zip: '75205',
      origin: 'Dallas, TX',
      destination_address: '600 Congress Ave',
      destination_city: 'Austin',
      destination_state: 'TX',
      destination_zip: '78701',
      destination: 'Austin, TX',
      notes: 'Relocating from Highland Park to Austin downtown.',
      created_at: dateOffsetIso(0),
      updated_at: dateOffsetIso(0),
      assigned_at: dateOffsetIso(0),
      last_contacted_at: null,
    },
  ],
  opportunities: [
    {
      id: 201,
      lead_id: null,
      opportunity_id: 201,
      sales_number: 10035,
      opportunity_number: 'AUS-10035',
      display_number: 'AUS-10035',
      name: 'Benjamin Sterling',
      customer_name: 'Benjamin Sterling',
      email: 'ben.sterling@example.com',
      phone: '512-555-0410',
      customer: 1,
      customer_details: {
        id: 1,
        first_name: 'Benjamin',
        last_name: 'Sterling',
        email: 'ben.sterling@example.com',
        primary_phone: '512-555-0410',
      },
      branch: 1,
      branch_id: 1,
      branch_name: 'Main Branch',
      branch_state: 'TX',
      assigned_user: 3,
      assigned_user_id: 3,
      assigned_user_name: 'Marcus Vance',
      status: 'booked',
      opp_status: 'booked',
      opp_status_code: 'booked',
      opp_status_label: 'Booked',
      custom_status_code: 5,
      custom_status_label: 'Booked',
      workflow_stage: 'booked',
      workflow_stage_label: 'Booked',
      is_booked: true,
      service_type: 'Packing & Moving',
      move_type: 'Local',
      move_size: '3 Bedroom House',
      move_date: dateOffsetYmd(0),
      arrival_window: '08:00 - 10:00',
      priority: 'hot',
      source: 'Google Ads',
      lead_cost: '2680.00',
      estimate_value: 2680,
      value: 2680,
      origin: 'Austin, TX',
      destination: 'Round Rock, TX',
      origin_address_details: {
        id: 1,
        address_line1: '1408 South Congress Ave',
        city: 'Austin',
        state: 'TX',
        zip_code: '78704',
      },
      destination_address_details: {
        id: 2,
        address_line1: '2205 Creek Bend Blvd',
        city: 'Round Rock',
        state: 'TX',
        zip_code: '78681',
      },
      created_at: dateOffsetIso(-5),
      updated_at: dateOffsetIso(0),
      booked_at: dateOffsetIso(-2),
      assigned_at: dateOffsetIso(-5),
      last_contacted_at: dateOffsetIso(0),
    },
    {
      id: 202,
      lead_id: null,
      opportunity_id: 202,
      sales_number: 10036,
      opportunity_number: 'AUS-10036',
      display_number: 'AUS-10036',
      name: 'Claire Montgomery',
      customer_name: 'Claire Montgomery',
      email: 'claire.m@example.com',
      phone: '512-555-0499',
      customer: 2,
      customer_details: {
        id: 2,
        first_name: 'Claire',
        last_name: 'Montgomery',
        email: 'claire.m@example.com',
        primary_phone: '512-555-0499',
      },
      branch: 1,
      branch_id: 1,
      branch_name: 'Main Branch',
      branch_state: 'TX',
      assigned_user: 3,
      assigned_user_id: 3,
      assigned_user_name: 'Marcus Vance',
      status: 'confirmed',
      opp_status: 'confirmed',
      opp_status_code: 'confirmed',
      opp_status_label: 'Confirmed',
      custom_status_code: 6,
      custom_status_label: 'Confirmed',
      workflow_stage: 'confirmed',
      workflow_stage_label: 'Confirmed',
      is_booked: true,
      service_type: 'Moving',
      move_type: 'Local',
      move_size: '4+ Bedroom House',
      move_date: dateOffsetYmd(1),
      arrival_window: '09:00 - 11:00',
      priority: 'hot',
      source: 'Past Customer Referral',
      lead_cost: '3450.00',
      estimate_value: 3450,
      value: 3450,
      origin: 'Austin, TX',
      destination: 'Cedar Park, TX',
      origin_address_details: {
        id: 3,
        address_line1: '3800 N Lamar Blvd',
        city: 'Austin',
        state: 'TX',
        zip_code: '78756',
      },
      destination_address_details: {
        id: 4,
        address_line1: '910 Cypress Creek Rd',
        city: 'Cedar Park',
        state: 'TX',
        zip_code: '78613',
      },
      created_at: dateOffsetIso(-7),
      updated_at: dateOffsetIso(-1),
      booked_at: dateOffsetIso(-4),
      assigned_at: dateOffsetIso(-7),
      last_contacted_at: dateOffsetIso(-1),
    },
    {
      id: 203,
      lead_id: null,
      opportunity_id: 203,
      sales_number: 10037,
      opportunity_number: 'DAL-10037',
      display_number: 'DAL-10037',
      name: 'Harrison Forde',
      customer_name: 'Harrison Forde',
      email: 'harrison.forde@example.com',
      phone: '214-555-0620',
      customer: 3,
      customer_details: {
        id: 3,
        first_name: 'Harrison',
        last_name: 'Forde',
        email: 'harrison.forde@example.com',
        primary_phone: '214-555-0620',
      },
      branch: 2,
      branch_id: 2,
      branch_name: 'Dallas Branch',
      branch_state: 'TX',
      assigned_user: 4,
      assigned_user_id: 4,
      assigned_user_name: 'Elena Rostova',
      status: 'estimate_sent',
      opp_status: 'estimate_sent',
      opp_status_code: 'estimate',
      opp_status_label: 'Estimate Sent',
      custom_status_code: 4,
      custom_status_label: 'Estimate Sent',
      workflow_stage: 'estimate',
      workflow_stage_label: 'Estimate',
      is_booked: false,
      service_type: 'Packing & Moving',
      move_type: 'Long Distance',
      move_size: '3 Bedroom House',
      move_date: dateOffsetYmd(5),
      arrival_window: '08:00 - 10:00',
      priority: 'high',
      source: 'Yelp',
      lead_cost: '4890.00',
      estimate_value: 4890,
      value: 4890,
      origin: 'Dallas, TX',
      destination: 'Houston, TX',
      origin_address_details: {
        id: 5,
        address_line1: '2911 Turtle Creek Blvd',
        city: 'Dallas',
        state: 'TX',
        zip_code: '75219',
      },
      destination_address_details: {
        id: 6,
        address_line1: '1600 Smith St',
        city: 'Houston',
        state: 'TX',
        zip_code: '77002',
      },
      created_at: dateOffsetIso(-4),
      updated_at: dateOffsetIso(0),
      booked_at: null,
      assigned_at: dateOffsetIso(-4),
      last_contacted_at: dateOffsetIso(0),
    },
    {
      id: 204,
      lead_id: null,
      opportunity_id: 204,
      sales_number: 10038,
      opportunity_number: 'AUS-10038',
      display_number: 'AUS-10038',
      name: 'natalie Chen',
      customer_name: 'Natalie Chen',
      email: 'natalie.chen@example.com',
      phone: '512-555-0744',
      customer: 4,
      customer_details: {
        id: 4,
        first_name: 'Natalie',
        last_name: 'Chen',
        email: 'natalie.chen@example.com',
        primary_phone: '512-555-0744',
      },
      branch: 1,
      branch_id: 1,
      branch_name: 'Main Branch',
      branch_state: 'TX',
      assigned_user: 2,
      assigned_user_id: 2,
      assigned_user_name: 'Sarah Jenkins',
      status: 'completed',
      opp_status: 'completed',
      opp_status_code: 'completed',
      opp_status_label: 'Completed',
      custom_status_code: 7,
      custom_status_label: 'Completed',
      workflow_stage: 'completed',
      workflow_stage_label: 'Completed',
      is_booked: true,
      service_type: 'Moving',
      move_type: 'Local',
      move_size: '2 Bedroom Apartment',
      move_date: dateOffsetYmd(-2),
      arrival_window: '08:00 - 10:00',
      priority: '',
      source: 'Google Ads',
      lead_cost: '1640.00',
      estimate_value: 1640,
      value: 1640,
      origin: 'Austin, TX',
      destination: 'Austin, TX',
      origin_address_details: {
        id: 7,
        address_line1: '500 E 4th St',
        city: 'Austin',
        state: 'TX',
        zip_code: '78701',
      },
      destination_address_details: {
        id: 8,
        address_line1: '2400 Nueces St',
        city: 'Austin',
        state: 'TX',
        zip_code: '78705',
      },
      created_at: dateOffsetIso(-10),
      updated_at: dateOffsetIso(-2),
      booked_at: dateOffsetIso(-8),
      assigned_at: dateOffsetIso(-10),
      last_contacted_at: dateOffsetIso(-2),
    },
  ],
  estimates: [
    {
      id: 301,
      opportunity: 201,
      opportunity_id: 201,
      estimate_number: 'EST-10035-1',
      status: 'approved',
      method: 'manual',
      binding_type: 'binding',
      crew_size: 3,
      trucks_count: 1,
      estimated_hours: '6.0',
      hourly_rate: '195.00',
      travel_time_hours: '1.0',
      estimated_volume_cuft: 1350,
      estimated_weight_lbs: 9450,
      subtotal: '2475.00',
      tax_amount: '205.00',
      grand_total: '2680.00',
      deposit_required: '250.00',
      portal_token: 'demo-estimate-token-301',
      inventory_portal_token: 'demo-inventory-token-301',
      charges: [
        { id: 1, name: 'Moving Labor (3 Crew + 1 Truck)', category: 'labor', calculation_type: 'hourly', quantity: '6.0', rate: '195.00', amount: '1170.00' },
        { id: 2, name: 'Travel & Dispatch Fee', category: 'transportation', calculation_type: 'flat', quantity: '1', rate: '195.00', amount: '195.00' },
        { id: 3, name: 'Full Home Packing Service', category: 'packing', calculation_type: 'flat', quantity: '1', rate: '750.00', amount: '750.00' },
        { id: 4, name: 'Packing Materials Bundle', category: 'materials', calculation_type: 'flat', quantity: '1', rate: '360.00', amount: '360.00' },
      ],
      created_at: dateOffsetIso(-4),
      updated_at: dateOffsetIso(-2),
    },
    {
      id: 302,
      opportunity: 202,
      opportunity_id: 202,
      estimate_number: 'EST-10036-1',
      status: 'approved',
      method: 'manual',
      binding_type: 'binding',
      crew_size: 4,
      trucks_count: 2,
      estimated_hours: '8.0',
      hourly_rate: '245.00',
      travel_time_hours: '1.0',
      estimated_volume_cuft: 1900,
      estimated_weight_lbs: 13300,
      subtotal: '3200.00',
      tax_amount: '250.00',
      grand_total: '3450.00',
      deposit_required: '350.00',
      portal_token: 'demo-estimate-token-302',
      inventory_portal_token: 'demo-inventory-token-302',
      charges: [
        { id: 5, name: 'Moving Labor (4 Crew + 2 Trucks)', category: 'labor', calculation_type: 'hourly', quantity: '8.0', rate: '245.00', amount: '1960.00' },
        { id: 6, name: 'Valuation Protection Plan', category: 'insurance', calculation_type: 'flat', quantity: '1', rate: '290.00', amount: '290.00' },
        { id: 7, name: 'Specialty Item Handling (Grand Piano)', category: 'additional_services', calculation_type: 'flat', quantity: '1', rate: '950.00', amount: '950.00' },
      ],
      created_at: dateOffsetIso(-6),
      updated_at: dateOffsetIso(-4),
    },
    {
      id: 303,
      opportunity: 203,
      opportunity_id: 203,
      estimate_number: 'EST-10037-1',
      status: 'sent',
      method: 'manual',
      binding_type: 'binding',
      crew_size: 3,
      trucks_count: 1,
      estimated_hours: '12.0',
      hourly_rate: '210.00',
      travel_time_hours: '4.0',
      estimated_volume_cuft: 1450,
      estimated_weight_lbs: 10150,
      subtotal: '4590.00',
      tax_amount: '300.00',
      grand_total: '4890.00',
      deposit_required: '500.00',
      portal_token: 'demo-estimate-token-303',
      inventory_portal_token: 'demo-inventory-token-303',
      charges: [
        { id: 8, name: 'Long Distance Linehaul (Dallas to Houston)', category: 'transportation', calculation_type: 'flat', quantity: '1', rate: '3890.00', amount: '3890.00' },
        { id: 9, name: 'Origin & Destination Fragile Packing', category: 'packing', calculation_type: 'flat', quantity: '1', rate: '700.00', amount: '700.00' },
      ],
      created_at: dateOffsetIso(-3),
      updated_at: dateOffsetIso(-1),
    },
  ],
  jobs: [
    {
      id: 401,
      opportunity: 201,
      opportunity_id: 201,
      sales_number: 10035,
      display_number: 'AUS-10035',
      name: 'Benjamin Sterling',
      customer_name: 'Benjamin Sterling',
      customer_email: 'ben.sterling@example.com',
      customer_phone: '512-555-0410',
      status: 'booked',
      lifecycle_stage: 'scheduled',
      job_type: 'Packing & Moving',
      service_type: 'Packing & Moving',
      move_size: '3 Bedroom House',
      move_date: dateOffsetYmd(0),
      start_time: '08:00:00',
      end_time: '15:00:00',
      arrival_window_start: '08:00:00',
      arrival_window_end: '10:00:00',
      branch: 1,
      branch_id: 1,
      branch_name: 'Main Branch',
      origin: 'Austin, TX',
      destination: 'Round Rock, TX',
      origin_address: '1408 South Congress Ave, Austin, TX 78704',
      destination_address: '2205 Creek Bend Blvd, Round Rock, TX 78681',
      job_value: '2680.00',
      crew_assignments: [
        { id: 1, crew_member_id: 1, user_id: 1, full_name: 'Carlos Mendez', role: 'driver' },
        { id: 2, crew_member_id: 2, user_id: 2, full_name: 'Devon Brooks', role: 'mover' },
        { id: 3, crew_member_id: 3, user_id: 3, full_name: 'Tyler Hayes', role: 'mover' },
      ],
      truck_assignments: [
        { id: 1, truck_id: 1, truck_name: 'Truck #101 - Freightliner 26ft', license_plate: 'TX-KGF-101' },
      ],
      crew_notes: 'Gate code #4481. Bring piano board and extra shrink wrap.',
      customer_notes: 'Please call 30 minutes prior to arrival.',
      internal_notes: 'Deposit paid in full via Square.',
      created_at: dateOffsetIso(-2),
      updated_at: dateOffsetIso(0),
    },
    {
      id: 402,
      opportunity: 202,
      opportunity_id: 202,
      sales_number: 10036,
      display_number: 'AUS-10036',
      name: 'Claire Montgomery',
      customer_name: 'Claire Montgomery',
      customer_email: 'claire.m@example.com',
      customer_phone: '512-555-0499',
      status: 'confirmed',
      lifecycle_stage: 'confirmed',
      job_type: 'Moving',
      service_type: 'Moving',
      move_size: '4+ Bedroom House',
      move_date: dateOffsetYmd(1),
      start_time: '09:00:00',
      end_time: '17:00:00',
      arrival_window_start: '09:00:00',
      arrival_window_end: '11:00:00',
      branch: 1,
      branch_id: 1,
      branch_name: 'Main Branch',
      origin: 'Austin, TX',
      destination: 'Cedar Park, TX',
      origin_address: '3800 N Lamar Blvd, Austin, TX 78756',
      destination_address: '910 Cypress Creek Rd, Cedar Park, TX 78613',
      job_value: '3450.00',
      crew_assignments: [
        { id: 4, crew_member_id: 1, user_id: 1, full_name: 'Carlos Mendez', role: 'driver' },
        { id: 5, crew_member_id: 2, user_id: 2, full_name: 'Devon Brooks', role: 'mover' },
      ],
      truck_assignments: [
        { id: 2, truck_id: 2, truck_name: 'Truck #102 - Hino 26ft', license_plate: 'TX-KGF-102' },
      ],
      crew_notes: 'Large sectional and Peloton bike on 2nd floor.',
      customer_notes: 'Confirmed move schedule via phone.',
      internal_notes: 'VIP referral client.',
      created_at: dateOffsetIso(-4),
      updated_at: dateOffsetIso(-1),
    },
    {
      id: 403,
      opportunity: 204,
      opportunity_id: 204,
      sales_number: 10038,
      display_number: 'AUS-10038',
      name: 'Natalie Chen',
      customer_name: 'Natalie Chen',
      customer_email: 'natalie.chen@example.com',
      customer_phone: '512-555-0744',
      status: 'completed',
      lifecycle_stage: 'completed',
      job_type: 'Moving',
      service_type: 'Moving',
      move_size: '2 Bedroom Apartment',
      move_date: dateOffsetYmd(-2),
      start_time: '08:30:00',
      end_time: '13:30:00',
      arrival_window_start: '08:00:00',
      arrival_window_end: '10:00:00',
      branch: 1,
      branch_id: 1,
      branch_name: 'Main Branch',
      origin: 'Austin, TX',
      destination: 'Austin, TX',
      origin_address: '500 E 4th St, Austin, TX 78701',
      destination_address: '2400 Nueces St, Austin, TX 78705',
      job_value: '1640.00',
      crew_assignments: [
        { id: 6, crew_member_id: 1, user_id: 1, full_name: 'Carlos Mendez', role: 'driver' },
        { id: 7, crew_member_id: 3, user_id: 3, full_name: 'Tyler Hayes', role: 'mover' },
      ],
      truck_assignments: [
        { id: 3, truck_id: 3, truck_name: 'Truck #103 - Isuzu 20ft', license_plate: 'TX-KGF-103' },
      ],
      crew_notes: 'Completed ahead of schedule.',
      customer_notes: '5-star review left by customer.',
      internal_notes: 'Final invoice paid.',
      created_at: dateOffsetIso(-8),
      updated_at: dateOffsetIso(-2),
    },
  ],
  paymentRequests: [
    {
      id: 501,
      opportunity_id: 201,
      estimate_id: 301,
      sales_number: 'AUS-10035',
      customer_name: 'Benjamin Sterling',
      customer_email: 'ben.sterling@example.com',
      payment_option: 'deposit',
      amount: '250.00',
      currency: 'USD',
      status: 'paid',
      provider: 'square',
      checkout_url: 'https://checkout.square.site/demo-aus-10035',
      created_at: dateOffsetIso(-2),
      updated_at: dateOffsetIso(-2),
    },
    {
      id: 502,
      opportunity_id: 202,
      estimate_id: 302,
      sales_number: 'AUS-10036',
      customer_name: 'Claire Montgomery',
      customer_email: 'claire.m@example.com',
      payment_option: 'deposit',
      amount: '350.00',
      currency: 'USD',
      status: 'paid',
      provider: 'square',
      checkout_url: 'https://checkout.square.site/demo-aus-10036',
      created_at: dateOffsetIso(-4),
      updated_at: dateOffsetIso(-4),
    },
    {
      id: 503,
      opportunity_id: 203,
      estimate_id: 303,
      sales_number: 'DAL-10037',
      customer_name: 'Harrison Forde',
      customer_email: 'harrison.forde@example.com',
      payment_option: 'deposit',
      amount: '500.00',
      currency: 'USD',
      status: 'pending',
      provider: 'square',
      checkout_url: 'https://checkout.square.site/demo-dal-10037',
      created_at: dateOffsetIso(-1),
      updated_at: dateOffsetIso(-1),
    },
  ],
  payments: [
    {
      id: 601,
      payment_request_id: 501,
      opportunity_id: 201,
      estimate_id: 301,
      sales_number: 'AUS-10035',
      customer_name: 'Benjamin Sterling',
      amount: '250.00',
      currency: 'USD',
      status: 'succeeded',
      payment_method: 'card',
      provider: 'square',
      provider_payment_id: 'sq_pay_981273a',
      captured_at: dateOffsetIso(-2),
      created_at: dateOffsetIso(-2),
    },
    {
      id: 602,
      payment_request_id: 502,
      opportunity_id: 202,
      estimate_id: 302,
      sales_number: 'AUS-10036',
      customer_name: 'Claire Montgomery',
      amount: '350.00',
      currency: 'USD',
      status: 'succeeded',
      payment_method: 'card',
      provider: 'square',
      provider_payment_id: 'sq_pay_981274b',
      captured_at: dateOffsetIso(-4),
      created_at: dateOffsetIso(-4),
    },
    {
      id: 603,
      payment_request_id: null,
      opportunity_id: 204,
      estimate_id: null,
      sales_number: 'AUS-10038',
      customer_name: 'Natalie Chen',
      amount: '1640.00',
      currency: 'USD',
      status: 'succeeded',
      payment_method: 'card',
      provider: 'square',
      provider_payment_id: 'sq_pay_981275c',
      captured_at: dateOffsetIso(-2),
      created_at: dateOffsetIso(-2),
    },
  ],
  refunds: [
    {
      id: 701,
      payment_id: 603,
      sales_number: 'AUS-10038',
      customer_name: 'Natalie Chen',
      amount: '50.00',
      currency: 'USD',
      status: 'succeeded',
      reason: 'Courtesy discount for minor box delay',
      created_at: dateOffsetIso(-1),
    },
  ],
  notifications: [
    {
      id: 1,
      title: 'New Lead Assigned: Olivia Hartman',
      message: '3 Bedroom House move in Austin, TX scheduled in 3 days.',
      category: 'lead',
      entity_type: 'lead',
      entity_id: 101,
      sales_number: 10041,
      branch_name: 'Main Branch',
      assigned_to: 'Marcus Vance',
      is_read: false,
      created_at: dateOffsetIso(0),
    },
    {
      id: 2,
      title: 'Deposit Payment Captured ($250.00)',
      message: 'Benjamin Sterling paid deposit for Quote #AUS-10035.',
      category: 'update',
      entity_type: 'payment_request',
      entity_id: 201,
      sales_number: 10035,
      branch_name: 'Main Branch',
      assigned_to: 'Marcus Vance',
      is_read: false,
      created_at: dateOffsetIso(-1),
    },
    {
      id: 3,
      title: 'Inbound Email from Harrison Forde',
      message: 'Can we add 10 wardrobe boxes to Estimate #EST-10037-1?',
      category: 'email',
      entity_type: 'inbound_email',
      entity_id: 203,
      sales_number: 10037,
      branch_name: 'Dallas Branch',
      assigned_to: 'Elena Rostova',
      is_read: true,
      created_at: dateOffsetIso(-1),
    },
  ],
  tasks: [
    {
      id: 1,
      title: 'Follow up with Harrison Forde on long-distance quote',
      notes: 'Confirm wardrobe box count and lock in move date.',
      task_type: 'call',
      status: 'pending',
      due_date: dateOffsetIso(0),
      opportunity: 203,
      opportunity_id: 203,
      sales_number: 10037,
      customer_name: 'Harrison Forde',
      assigned_to: 4,
      assigned_to_name: 'Elena Rostova',
      branch_id: 2,
      branch_name: 'Dallas Branch',
      created_at: dateOffsetIso(-1),
    },
    {
      id: 2,
      title: 'Call Olivia Hartman for piano dimensions',
      notes: 'Verify upright vs baby grand piano at origin.',
      task_type: 'call',
      status: 'pending',
      due_date: dateOffsetIso(0),
      lead: 101,
      lead_id: 101,
      sales_number: 10041,
      customer_name: 'Olivia Hartman',
      assigned_to: 3,
      assigned_to_name: 'Marcus Vance',
      branch_id: 1,
      branch_name: 'Main Branch',
      created_at: dateOffsetIso(0),
    },
  ],
  activities: [
    {
      id: 1,
      activity_type: 'call',
      title: 'Outbound Call - Connected',
      description: 'Confirmed 3BR inventory and parking access with Benjamin Sterling.',
      content: 'Confirmed 3BR inventory and parking access with Benjamin Sterling.',
      status: 'completed',
      opportunity: 201,
      user: 3,
      user_name: 'Marcus Vance',
      branch: 1,
      is_pinned: true,
      created_at: dateOffsetIso(-2),
    },
    {
      id: 2,
      activity_type: 'email',
      title: 'Estimate #EST-10037-1 Sent',
      description: 'Sent binding long-distance estimate to harrison.forde@example.com.',
      content: 'Sent binding long-distance estimate to harrison.forde@example.com.',
      status: 'completed',
      opportunity: 203,
      user: 4,
      user_name: 'Elena Rostova',
      branch: 2,
      is_pinned: false,
      created_at: dateOffsetIso(-1),
    },
  ],
  workflows: [
    {
      id: 1,
      name: 'New Lead Received',
      description: 'Notify assigned sales rep immediately when a new lead arrives.',
      is_active: true,
      is_notifications: true,
      branch: 1,
      trigger: {
        event_type: 'lead.created',
        target_type: 'lead',
        notification_meta: { audience: 'sales_person', category: 'lead_intake' },
      },
      steps: [
        { id: 1, step_type: 'send_email', order: 1, config: { channels: ['email'], email_template_key: 'new_lead_rep' } },
      ],
    },
    {
      id: 2,
      name: 'Send Quote',
      description: 'Deliver interactive estimate portal link to customer via Email & SMS.',
      is_active: true,
      is_notifications: true,
      branch: 1,
      trigger: {
        event_type: 'estimate.sent',
        target_type: 'estimate',
        notification_meta: { audience: 'customer', category: 'outbound_delivery' },
      },
      steps: [
        { id: 2, step_type: 'send_multichannel', order: 1, config: { channels: ['email', 'sms'], email_template_key: 'send_quote' } },
      ],
    },
    {
      id: 3,
      name: 'Opportunity Booked (Customer)',
      description: 'Send booking confirmation and arrival window details to customer.',
      is_active: true,
      is_notifications: true,
      branch: 1,
      trigger: {
        event_type: 'opportunity.booked',
        target_type: 'opportunity',
        notification_meta: { audience: 'customer', category: 'customer_sign_off' },
      },
      steps: [
        { id: 3, step_type: 'send_email', order: 1, config: { channels: ['email'], email_template_key: 'booking_confirmed' } },
      ],
    },
    {
      id: 4,
      name: '24-Hour Quote Follow-Up Sequence',
      description: 'Automatically send SMS & Email follow-up if estimate is not approved within 24 hours.',
      is_active: true,
      is_notifications: false,
      branch: 1,
      trigger: {
        event_type: 'estimate.sent',
        target_type: 'estimate',
      },
      steps: [
        { id: 4, step_type: 'wait', order: 1, config: { delay_hours: 24 } },
        { id: 5, step_type: 'send_sms', order: 2, config: { channels: ['sms'], sms_template_key: 'quote_followup_sms' } },
      ],
    },
  ],
  automationRuns: [
    {
      id: 1,
      workflow: 2,
      workflow_name: 'Send Quote',
      target_type: 'estimate',
      target_id: 303,
      status: 'completed',
      started_at: dateOffsetIso(-1),
      completed_at: dateOffsetIso(-1),
    },
    {
      id: 2,
      workflow: 3,
      workflow_name: 'Opportunity Booked (Customer)',
      target_type: 'opportunity',
      target_id: 201,
      status: 'completed',
      started_at: dateOffsetIso(-2),
      completed_at: dateOffsetIso(-2),
    },
  ],
  communicationTemplates: [
    {
      id: 1,
      name: 'Estimate Portal Ready (Email)',
      template_key: 'send_quote',
      channel: 'email',
      category: 1,
      category_name: 'Estimates & Quotes',
      subject: 'Your Moving Estimate #{{sales_number}} from {{company_name}}',
      body: '<p>Hi {{customer_first_name}},</p><p>Your customized moving estimate is ready for review. Click below to view your quote and reserve your move date.</p>',
      is_active: true,
      branch: 1,
    },
    {
      id: 2,
      name: 'Booking Confirmation (Email)',
      template_key: 'booking_confirmed',
      channel: 'email',
      category: 2,
      category_name: 'Dispatch & Jobs',
      subject: 'Move Confirmed! Job #{{sales_number}} on {{move_date}}',
      body: '<p>Hi {{customer_first_name}},</p><p>Your move with {{company_name}} is officially booked for {{move_date}} ({{arrival_window}}).</p>',
      is_active: true,
      branch: 1,
    },
    {
      id: 3,
      name: 'Quote Follow-up (SMS)',
      template_key: 'quote_followup_sms',
      channel: 'sms',
      category: 1,
      category_name: 'Estimates & Quotes',
      subject: '',
      body: 'Hi {{customer_first_name}}, this is {{rep_name}} at {{company_name}}. Let us know if you have any questions about your moving quote #{{sales_number}}!',
      is_active: true,
      branch: 1,
    },
  ],
  communicationTemplateCategories: [
    { id: 1, name: 'Estimates & Quotes', branch: 1 },
    { id: 2, name: 'Dispatch & Jobs', branch: 1 },
    { id: 3, name: 'Lead Follow-ups', branch: 1 },
  ],
  documentTemplates: [
    {
      id: 1,
      name: 'Standard Bill of Lading & Moving Contract',
      document_type: 'contract',
      scope_type: 'branch',
      branch: 1,
      is_active: true,
      content: '<h2>Uniform Household Goods Bill of Lading</h2><p>Customer: {{customer_name}} | Move Date: {{move_date}}</p>',
      created_at: dateOffsetIso(-30),
      updated_at: dateOffsetIso(-5),
    },
    {
      id: 2,
      name: 'Valuation & High-Value Inventory Addendum',
      document_type: 'addendum',
      scope_type: 'branch',
      branch: 1,
      is_active: true,
      content: '<h2>Valuation Coverage Election</h2><p>Full Value Protection vs Released Value (60 cents/lb).</p>',
      created_at: dateOffsetIso(-30),
      updated_at: dateOffsetIso(-10),
    },
  ],
  catalogItems: [
    { id: 1, name: 'Standard Moving Box (Medium)', category: 'materials', item_type: 'material', default_rate: '4.50', unit: 'each', weight_lbs: 2, volume_cuft: 3, is_active: true, branch: 1 },
    { id: 2, name: 'Wardrobe Box with Metal Bar', category: 'materials', item_type: 'material', default_rate: '18.00', unit: 'each', weight_lbs: 8, volume_cuft: 15, is_active: true, branch: 1 },
    { id: 3, name: '3-Person Crew + 26ft Truck', category: 'labor', item_type: 'service', default_rate: '195.00', unit: 'hour', weight_lbs: 0, volume_cuft: 0, is_active: true, branch: 1 },
    { id: 4, name: 'Upright Piano Handling', category: 'additional_services', item_type: 'service', default_rate: '350.00', unit: 'flat', weight_lbs: 500, volume_cuft: 65, is_active: true, branch: 1 },
  ],
  packages: [
    {
      id: 1,
      name: '3 Bedroom Full-Service Protection Bundle',
      description: 'Includes 40 medium boxes, 6 wardrobe boxes, shrink wrap, and mattress bags.',
      branch: 1,
      is_active: true,
      items: [
        { id: 1, package: 1, catalog_item: 1, name: 'Standard Moving Box (Medium)', quantity: 40, rate: '4.50' },
        { id: 2, package: 1, catalog_item: 2, name: 'Wardrobe Box with Metal Bar', quantity: 6, rate: '18.00' },
      ],
    },
  ],
  discountPresets: [
    { id: 1, name: 'Military & First Responder Discount (10%)', discount_type: 'percentage', value: '10.00', is_active: true, branch: 1 },
    { id: 2, name: 'Mid-Week Move Special ($100 Off)', discount_type: 'fixed', value: '100.00', is_active: true, branch: 1 },
  ],
  portalTemplates: [
    {
      id: 1,
      name: 'Modern Interactive Estimate Portal',
      description: 'Default high-conversion customer estimate approval and deposit checkout layout.',
      branch: 1,
      is_default: true,
      is_active: true,
      created_at: dateOffsetIso(-20),
    },
  ],
  customerPortalSettings: [
    {
      id: 1,
      company: 1,
      branch: 1,
      estimate_esign_enabled: true,
      require_deposit_on_approval: true,
      allow_customer_inventory_edits: true,
      primary_color: '#1f7ae0',
    },
  ],
  paymentGateways: [
    {
      id: 1,
      provider: 'square',
      name: 'Square Production Gateway',
      environment: 'sandbox',
      location_id: 'L890DEMO123',
      is_active: true,
      is_verified: true,
      branch: 1,
    },
  ],
  auditLogs: [
    { id: 1, user_email: 'admin@fastmovers.com', action: 'Booked Opportunity #AUS-10035', ip_address: '192.168.1.10', created_at: dateOffsetIso(-2) },
    { id: 2, user_email: 'rep1@fastmovers.com', action: 'Sent Estimate #EST-10035-1', ip_address: '192.168.1.14', created_at: dateOffsetIso(-3) },
    { id: 3, user_email: 'rep2@fastmovers.com', action: 'Sent Estimate #EST-10037-1', ip_address: '192.168.1.22', created_at: dateOffsetIso(-1) },
  ],
};

const buildUserPayload = (user = db.users[0]) => {
  const company = db.companies[0];
  return {
    ...user,
    company,
    company_details: company,
    active_company: company,
    active_company_details: company,
    active_company_id: company.id,
    branch_details: db.branches,
    role_details: db.roles.filter((r) => user.roles.includes(r.id)),
  };
};

// ============================================================================
// Specific API Routes
// ============================================================================

app.get('/health/', (_req, res) => res.json({ status: 'ok' }));
app.get('/api/health/', (_req, res) => res.json({ status: 'ok' }));

// Auth
app.post('/api/login/', (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const matchedUser = db.users.find((u) => u.email.toLowerCase() === email) || db.users[0];
  const userPayload = buildUserPayload(matchedUser);
  res.json({
    access: 'demo-jwt-access-token',
    refresh: 'demo-jwt-refresh-token',
    user: userPayload,
    active_company: db.companies[0],
    active_company_details: db.companies[0],
    active_company_id: db.companies[0].id,
    company: db.companies[0],
  });
});

app.post('/api/switch-company/', (req, res) => {
  const userPayload = buildUserPayload(db.users[0]);
  res.json({
    access: 'demo-jwt-access-token',
    refresh: 'demo-jwt-refresh-token',
    user: userPayload,
    active_company: db.companies[0],
    active_company_id: db.companies[0].id,
    company: db.companies[0],
  });
});

app.post('/api/token/refresh/', (_req, res) => {
  res.json({ access: 'demo-jwt-access-token' });
});

app.get('/api/users/me/', (_req, res) => {
  const userPayload = buildUserPayload(db.users[0]);
  res.json({
    ...userPayload,
    user: userPayload,
  });
});

app.patch('/api/users/me/', (req, res) => {
  Object.assign(db.users[0], req.body || {});
  db.users[0].full_name = `${db.users[0].first_name || ''} ${db.users[0].last_name || ''}`.trim();
  const userPayload = buildUserPayload(db.users[0]);
  res.json({
    ...userPayload,
    user: userPayload,
  });
});

app.post('/api/users/change-password/', (_req, res) => {
  res.json({ detail: 'Password changed successfully.' });
});

// Permissions
app.get('/api/permissions/', (_req, res) => {
  const list = ALL_PERMISSIONS.map((codename, idx) => ({
    id: idx + 1,
    codename,
    name: codename.replace(/\./g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
  }));
  res.json({ count: list.length, results: list });
});

// Notifications
app.get('/api/notifications/', (_req, res) => {
  res.json({ count: db.notifications.length, results: db.notifications });
});

app.get('/api/notifications/unread-count/', (_req, res) => {
  const unread = db.notifications.filter((n) => !n.is_read).length;
  res.json({ unread });
});

app.post('/api/notifications/:id/mark-read/', (req, res) => {
  const item = db.notifications.find((n) => String(n.id) === String(req.params.id));
  if (item) item.is_read = true;
  res.json(item || { ok: true });
});

app.post('/api/notifications/:id/mark-unread/', (req, res) => {
  const item = db.notifications.find((n) => String(n.id) === String(req.params.id));
  if (item) item.is_read = false;
  res.json(item || { ok: true });
});

app.post('/api/notifications/mark-all-read/', (_req, res) => {
  db.notifications.forEach((n) => {
    n.is_read = true;
  });
  res.json({ ok: true });
});

// Universal Search
app.get('/api/search/', (req, res) => {
  const q = String(req.query.q || req.query.search || '').toLowerCase().trim();
  const results = [
    ...db.leads.map((l) => ({
      id: l.id,
      type: 'lead',
      title: l.name,
      sales_number: l.sales_number,
      email: l.email,
      phone: l.phone,
      branch_name: l.branch_name,
      assigned_to: l.assigned_user_name,
      meta: `${l.move_size} · ${l.origin} -> ${l.destination}`,
    })),
    ...db.opportunities.map((o) => ({
      id: o.id,
      type: 'opportunity',
      title: o.name,
      sales_number: o.sales_number,
      email: o.email,
      phone: o.phone,
      branch_name: o.branch_name,
      assigned_to: o.assigned_user_name,
      meta: `${o.move_size} · ${o.origin} -> ${o.destination}`,
    })),
    ...db.jobs.map((j) => ({
      id: j.id,
      type: 'job',
      title: j.customer_name,
      sales_number: j.sales_number,
      email: j.customer_email,
      phone: j.customer_phone,
      branch_name: j.branch_name,
      meta: `Job #${j.display_number} · ${j.move_date}`,
    })),
  ].filter((item) => !q || JSON.stringify(item).toLowerCase().includes(q));
  res.json({ count: results.length, results });
});

// Lookups
app.get('/api/lookups/branches/', (_req, res) => {
  res.json({ count: db.branches.length, results: db.branches.map((b) => ({ ...b, label: b.name, value: b.id })) });
});
app.get('/api/lookups/companies/', (_req, res) => {
  res.json({ count: db.companies.length, results: db.companies.map((c) => ({ ...c, label: c.name, value: c.id })) });
});
app.get('/api/lookups/users/', (_req, res) => {
  res.json({ count: db.users.length, results: db.users.map((u) => ({ ...u, label: u.full_name, value: u.id })) });
});
app.get('/api/lookups/statuses/', (_req, res) => {
  res.json({ count: db.statusCodes.length, results: db.statusCodes });
});
app.get('/api/lookups/lead-statuses/', (_req, res) => {
  res.json({ count: db.statusCodes.length, results: db.statusCodes });
});
app.get('/api/lookups/lead-sources/', (_req, res) => {
  res.json({ count: db.referralSources.length, results: db.referralSources });
});
app.get('/api/lookups/move-types/', (_req, res) => {
  res.json({ count: db.moveTypes.length, results: db.moveTypes });
});
app.get('/api/lookups/mover-sizes/', (_req, res) => {
  res.json({ count: db.moverSizes.length, results: db.moverSizes });
});
app.get('/api/lookups/services/', (_req, res) => {
  res.json({ count: db.serviceTypes.length, results: db.serviceTypes });
});
app.get('/api/lookups/opportunity-loss-reasons/', (_req, res) => {
  res.json({ count: db.lossReasons.length, results: db.lossReasons });
});

// Dashboard Summary
app.get('/api/sales/dashboard-summary/', (req, res) => {
  const branchId = req.query.branch && req.query.branch !== 'all' ? Number(req.query.branch) : null;
  const currentYear = new Date().getFullYear();
  res.json({
    branches: db.branches.map((b) => ({ id: b.id, name: b.name })),
    branch: branchId || 'all',
    generated_at: nowIso(),
    stats: {
      today: {
        revenue: branchId === 2 ? 4890 : 14850,
        revenueDelta: 18.4,
        activeJobs: branchId === 2 ? 2 : 6,
        booked: branchId === 2 ? 2 : 5,
        canceled: 0,
        yesterdayRevenue: branchId === 2 ? 4100 : 12540,
      },
      conversion: {
        rate: 42.8,
        delta: 6.2,
        quotes: branchId ? 42 : 84,
        booked: branchId ? 18 : 36,
      },
      month: {
        moves: branchId ? 24 : 48,
        value: branchId ? 84200 : 168400,
        delta: 14.5,
        target: branchId ? 30 : 60,
      },
      alerts: {
        stagnant: 2,
        pipelineRisk: 9090,
        oldest: '15 days',
        qualifiedCount: 1,
        estimateCount: 1,
      },
      revenueHistory: {
        days: [
          { d: 'Mon', full: 'Monday', v: 11200, jobs: 4, today: false },
          { d: 'Tue', full: 'Tuesday', v: 13400, jobs: 5, today: false },
          { d: 'Wed', full: 'Wednesday', v: 9800, jobs: 3, today: false },
          { d: 'Thu', full: 'Thursday', v: 15600, jobs: 6, today: false },
          { d: 'Fri', full: 'Friday', v: 18900, jobs: 7, today: false },
          { d: 'Sat', full: 'Saturday', v: 21400, jobs: 8, today: false },
          { d: 'Today', full: 'Today', v: 14850, jobs: 6, today: true },
        ],
        weeks: [
          { d: 'W1', full: 'Week 1 (1-7)', v: 38400, jobs: 11, today: false },
          { d: 'W2', full: 'Week 2 (8-14)', v: 44200, jobs: 13, today: false },
          { d: 'W3', full: 'Week 3 (15-21)', v: 41900, jobs: 12, today: false },
          { d: 'W4', full: 'Week 4 (22-28)', v: 43900, jobs: 12, today: true },
        ],
        months: [
          { d: 'Jan', full: `January ${currentYear}`, v: 112000, jobs: 34, today: false },
          { d: 'Feb', full: `February ${currentYear}`, v: 118500, jobs: 36, today: false },
          { d: 'Mar', full: `March ${currentYear}`, v: 134000, jobs: 41, today: false },
          { d: 'Apr', full: `April ${currentYear}`, v: 149000, jobs: 45, today: false },
          { d: 'May', full: `May ${currentYear}`, v: 176000, jobs: 52, today: false },
          { d: 'Jun', full: `June ${currentYear}`, v: 194000, jobs: 58, today: false },
          { d: 'Jul', full: `July ${currentYear}`, v: 205000, jobs: 61, today: false },
          { d: 'Aug', full: `August ${currentYear}`, v: 189000, jobs: 55, today: false },
          { d: 'Sep', full: `September ${currentYear}`, v: 162000, jobs: 47, today: false },
          { d: 'Oct', full: `October ${currentYear}`, v: 168400, jobs: 48, today: true },
          { d: 'Nov', full: `November ${currentYear}`, v: 0, jobs: 0, today: false },
          { d: 'Dec', full: `December ${currentYear}`, v: 0, jobs: 0, today: false },
        ],
        years: [
          { d: String(currentYear - 3), full: `Year ${currentYear - 3}`, v: 1180000, jobs: 380, today: false },
          { d: String(currentYear - 2), full: `Year ${currentYear - 2}`, v: 1450000, jobs: 460, today: false },
          { d: String(currentYear - 1), full: `Year ${currentYear - 1}`, v: 1790000, jobs: 540, today: false },
          { d: String(currentYear), full: `Year ${currentYear}`, v: 1607900, jobs: 477, today: true },
        ],
      },
      reps: [
        { id: 3, name: 'Marcus Vance', initials: 'MV', revenue: 74200, deals: 19, delta: 14.2 },
        { id: 4, name: 'Elena Rostova', initials: 'ER', revenue: 58900, deals: 15, delta: 9.8 },
        { id: 2, name: 'Sarah Jenkins', initials: 'SJ', revenue: 35300, deals: 9, delta: 5.4 },
      ],
      activity: {
        headers: ['Today', 'Week', 'Month'],
        rows: [
          { label: 'Leads', icon: 'user-plus', today: 9, week: 47, month: 186 },
          { label: 'Quotes', icon: 'file-text', today: 7, week: 34, month: 128 },
          { label: 'Booked', icon: 'calendar-check-2', today: 5, week: 18, month: 64 },
          { label: 'Canceled', icon: 'x-circle', today: 0, week: 2, month: 7 },
        ],
      },
    },
  });
});

app.get('/api/sales/dashboard-summary-lite/', (_req, res) => {
  res.json({
    emailCount: 42,
    smsCount: 29,
    phoneCallCount: 36,
    leadsCount: 18,
    paymentTotal: 48950,
    taskCount: db.tasks.length,
    wonCount: 14,
    lostCount: 2,
    emailTrend: 12,
    smsTrend: 18,
    phoneCallTrend: 8,
    leadsTrend: 15,
    paymentTrend: 22,
    taskTrend: 5,
    wonTrend: 19,
    lostTrend: -10,
    dailyBreakdown: [
      { date: dateOffsetYmd(-6), count: 3, label: '6d ago', shortLabel: 'Thu' },
      { date: dateOffsetYmd(-5), count: 4, label: '5d ago', shortLabel: 'Fri' },
      { date: dateOffsetYmd(-4), count: 2, label: '4d ago', shortLabel: 'Sat' },
      { date: dateOffsetYmd(-3), count: 5, label: '3d ago', shortLabel: 'Sun' },
      { date: dateOffsetYmd(-2), count: 6, label: '2d ago', shortLabel: 'Mon' },
      { date: dateOffsetYmd(-1), count: 4, label: 'Yesterday', shortLabel: 'Tue' },
      { date: dateOffsetYmd(0), count: 7, label: 'Today', shortLabel: 'Wed' },
    ],
  });
});

// Leads & Opportunities Queue
app.get('/api/sales/my-leads-queue/', (req, res) => {
  const leadRows = db.leads.map((l) => ({
    ...l,
    row_type: 'lead',
    lead_id: l.id,
    opportunity_id: null,
  }));
  const oppRows = db.opportunities.map((o) => ({
    ...o,
    row_type: 'opportunity',
    opportunity_id: o.id,
  }));

  let combined = [...leadRows, ...oppRows];

  const rowType = String(req.query.row_type || req.query.entity_type || '').toLowerCase();
  if (rowType === 'lead') combined = leadRows;
  else if (rowType === 'opportunity') combined = oppRows;

  const oppStatus = String(req.query.opp_status || req.query.sidebar_status || '').toLowerCase();
  if (oppStatus) {
    const allowed = oppStatus.split(',').map((s) => s.trim());
    combined = combined.filter((row) => {
      if (row.row_type !== 'opportunity') return false;
      const st = String(row.status || row.opp_status || '').toLowerCase();
      const wf = String(row.workflow_stage || '').toLowerCase();
      return allowed.some((a) => st.includes(a) || wf.includes(a));
    });
  }

  const branch = req.query.branch;
  if (branch && branch !== 'all') {
    combined = combined.filter((r) => String(r.branch_id) === String(branch));
  }

  const search = String(req.query.search || '').toLowerCase().trim();
  if (search) {
    combined = combined.filter((r) => JSON.stringify(r).toLowerCase().includes(search));
  }

  res.json({
    count: combined.length,
    next: null,
    previous: null,
    results: combined,
  });
});

// Leads CRUD & custom actions
app.get('/api/leads/leads/by-sales-number/:salesNumber/', (req, res) => {
  const sn = String(req.params.salesNumber);
  const item = db.leads.find((l) => String(l.sales_number) === sn || String(l.id) === sn) || db.leads[0];
  res.json(item);
});

app.post('/api/leads/leads/:id/convert/', (req, res) => {
  const lead = db.leads.find((l) => String(l.id) === String(req.params.id)) || db.leads[0];
  const newOpp = {
    id: nextId(),
    lead_id: lead.id,
    opportunity_id: nextIdCounter,
    sales_number: lead.sales_number,
    opportunity_number: lead.display_number,
    display_number: lead.display_number,
    name: lead.name,
    customer_name: lead.name,
    email: lead.email,
    phone: lead.phone,
    customer: lead.id,
    customer_details: {
      id: lead.id,
      first_name: lead.first_name || 'Customer',
      last_name: lead.last_name || '',
      email: lead.email,
      primary_phone: lead.phone,
    },
    branch: lead.branch_id || 1,
    branch_id: lead.branch_id || 1,
    branch_name: lead.branch_name || 'Main Branch',
    branch_state: 'TX',
    assigned_user: lead.assigned_user_id || 1,
    assigned_user_id: lead.assigned_user_id || 1,
    assigned_user_name: lead.assigned_user_name || 'System Administrator',
    status: 'active',
    opp_status: 'active',
    opp_status_code: 'opportunity',
    opp_status_label: 'Opportunity',
    workflow_stage: 'opportunity',
    workflow_stage_label: 'Opportunity',
    is_booked: false,
    service_type: lead.service_type || 'Moving',
    move_type: lead.move_type || 'Local',
    move_size: lead.move_size || '3 Bedroom House',
    move_date: lead.move_date || dateOffsetYmd(7),
    lead_cost: lead.lead_cost || '1850.00',
    estimate_value: Number(lead.value || 1850),
    value: Number(lead.value || 1850),
    origin: lead.origin || 'Austin, TX',
    destination: lead.destination || 'Austin, TX',
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  db.opportunities.unshift(newOpp);
  res.json(newOpp);
});

app.get('/api/leads/inbound-config/current/', (_req, res) => {
  res.json({
    id: 1,
    endpoint_url: '/api/public/leads/intake/',
    secret_key: 'kgf_live_inbound_9928174a',
    is_active: true,
    default_branch: 1,
  });
});

app.post('/api/leads/inbound-config/rotate-secret/', (_req, res) => {
  res.json({
    id: 1,
    endpoint_url: '/api/public/leads/intake/',
    secret_key: `kgf_live_inbound_${Math.random().toString(36).slice(2, 10)}`,
    is_active: true,
    default_branch: 1,
  });
});

// Opportunities CRUD & actions
app.get('/api/sales/opportunities/by-sales-number/:salesNumber/', (req, res) => {
  const sn = String(req.params.salesNumber);
  const item = db.opportunities.find((o) => String(o.sales_number) === sn || String(o.id) === sn) || db.opportunities[0];
  res.json(item);
});

app.get('/api/sales/opportunities/:id/availability/', (_req, res) => {
  res.json({
    available_trucks: 3,
    total_trucks: 4,
    available_crew: 5,
    booked_jobs_count: 1,
    is_available: true,
  });
});

app.get('/api/sales/opportunities/:id/accounting-summary/', (req, res) => {
  const opp = db.opportunities.find((o) => String(o.id) === String(req.params.id)) || db.opportunities[0];
  const total = Number(opp?.value || 2680);
  res.json({
    opportunity_id: opp.id,
    estimated_total: total,
    invoiced_total: total,
    paid_total: 250,
    balance_due: Math.max(total - 250, 0),
    currency: 'USD',
  });
});

app.get('/api/sales/opportunities/:id/accounting-invoice/', (req, res) => {
  const opp = db.opportunities.find((o) => String(o.id) === String(req.params.id)) || db.opportunities[0];
  res.json({
    id: 901,
    opportunity_id: opp.id,
    invoice_number: `INV-${opp.sales_number || opp.id}`,
    status: 'issued',
    subtotal: '2475.00',
    tax_amount: '205.00',
    grand_total: String(opp.value || '2680.00'),
    amount_paid: '250.00',
    balance_due: String(Math.max(Number(opp.value || 2680) - 250, 0)),
    line_items: [
      { id: 1, description: 'Moving & Relocation Services', quantity: 1, unit_price: String(opp.value || '2680.00'), amount: String(opp.value || '2680.00') },
    ],
  });
});

app.get('/api/sales/opportunities/:id/planned-sub-jobs/', (_req, res) => {
  res.json({ count: 0, results: [] });
});

app.post('/api/sales/opportunities/:id/book-job/', (req, res) => {
  const opp = db.opportunities.find((o) => String(o.id) === String(req.params.id)) || db.opportunities[0];
  opp.status = 'booked';
  opp.opp_status = 'booked';
  opp.workflow_stage = 'booked';
  opp.is_booked = true;
  res.json(opp);
});

app.post('/api/sales/opportunities/:id/confirm-job/', (req, res) => {
  const opp = db.opportunities.find((o) => String(o.id) === String(req.params.id)) || db.opportunities[0];
  opp.status = 'confirmed';
  opp.opp_status = 'confirmed';
  opp.workflow_stage = 'confirmed';
  res.json(opp);
});

app.post('/api/sales/opportunities/:id/complete-job/', (req, res) => {
  const opp = db.opportunities.find((o) => String(o.id) === String(req.params.id)) || db.opportunities[0];
  opp.status = 'completed';
  opp.opp_status = 'completed';
  opp.workflow_stage = 'completed';
  res.json(opp);
});

app.get('/api/sales/status-codes/list-status-codes', (_req, res) => {
  res.json({ count: db.statusCodes.length, results: db.statusCodes });
});

// Estimates custom routes
app.get('/api/estimates/:id/portal-inventory/', (_req, res) => {
  res.json({
    rooms: [
      {
        id: 1,
        name: 'Living Room',
        items: [
          { id: 1, name: '3-Seat Sectional Sofa', quantity: 1, volume_cuft: 85, weight_lbs: 595 },
          { id: 2, name: '65" Smart TV & Media Console', quantity: 1, volume_cuft: 35, weight_lbs: 245 },
        ],
      },
      {
        id: 2,
        name: 'Primary Bedroom',
        items: [
          { id: 3, name: 'King Bed Frame & Mattress', quantity: 1, volume_cuft: 70, weight_lbs: 490 },
          { id: 4, name: 'Double Dresser', quantity: 1, volume_cuft: 45, weight_lbs: 315 },
        ],
      },
    ],
  });
});

app.get('/api/public/estimates/portal/', (req, res) => {
  const est = db.estimates[0];
  const opp = db.opportunities[0];
  res.json({
    estimate: est,
    opportunity: opp,
    company: db.companies[0],
    branch: db.branches[0],
  });
});

app.get('/api/public/estimates/inventory/', (_req, res) => {
  res.json({
    estimate: db.estimates[0],
    opportunity: db.opportunities[0],
    rooms: [],
  });
});

app.get('/api/public/contracts/portal/', (_req, res) => {
  res.json({
    id: 1,
    status: 'pending',
    title: 'Uniform Household Goods Bill of Lading',
    html_content: db.documentTemplates[0].content,
    company: db.companies[0],
  });
});

// Jobs Accounting Summary
app.get('/api/jobs/:id/accounting/summary/', (req, res) => {
  const job = db.jobs.find((j) => String(j.id) === String(req.params.id)) || db.jobs[0];
  res.json({
    job_id: job.id,
    revenue_total: Number(job.job_value || 2680),
    payroll_total: 420,
    costs_total: 95,
    net_profit: Number(job.job_value || 2680) - 515,
    payments_collected: 250,
    balance_due: Number(job.job_value || 2680) - 250,
    payroll_entries: [
      { id: 1, crew_member_id: 1, full_name: 'Carlos Mendez', role: 'driver', hours: 6, hourly_rate: 28, total_pay: 168 },
      { id: 2, crew_member_id: 2, full_name: 'Devon Brooks', role: 'mover', hours: 6, hourly_rate: 22, total_pay: 132 },
      { id: 3, crew_member_id: 3, full_name: 'Tyler Hayes', role: 'mover', hours: 5.5, hourly_rate: 22, total_pay: 121 },
    ],
    costs: [
      { id: 1, category: 'fuel', description: 'Diesel Fuel Fill-up', amount: '95.00' },
    ],
    payments: db.payments.filter((p) => p.opportunity_id === job.opportunity_id),
  });
});

app.post('/api/jobs/:id/assign-crew/', (req, res) => {
  const job = db.jobs.find((j) => String(j.id) === String(req.params.id)) || db.jobs[0];
  const member = db.crewMembers.find((c) => String(c.id) === String(req.body?.user_id || req.body?.crew_member_id)) || db.crewMembers[0];
  const assignment = {
    id: nextId(),
    crew_member_id: member.id,
    user_id: member.id,
    full_name: member.full_name,
    role: req.body?.role || member.role || 'mover',
  };
  job.crew_assignments = [...(job.crew_assignments || []), assignment];
  res.json(job);
});

app.delete('/api/jobs/:id/assign-crew/', (req, res) => {
  const job = db.jobs.find((j) => String(j.id) === String(req.params.id)) || db.jobs[0];
  const targetId = req.body?.user_id || req.body?.crew_member_id || req.body?.id;
  if (targetId) {
    job.crew_assignments = (job.crew_assignments || []).filter(
      (a) => String(a.user_id) !== String(targetId) && String(a.crew_member_id) !== String(targetId) && String(a.id) !== String(targetId)
    );
  }
  res.json(job);
});

app.post('/api/jobs/:id/assign-truck/', (req, res) => {
  const job = db.jobs.find((j) => String(j.id) === String(req.params.id)) || db.jobs[0];
  const truck = db.trucks.find((t) => String(t.id) === String(req.body?.truck_id)) || db.trucks[0];
  const assignment = {
    id: nextId(),
    truck_id: truck.id,
    truck_name: truck.name,
    license_plate: truck.license_plate,
  };
  job.truck_assignments = [...(job.truck_assignments || []), assignment];
  res.json(job);
});

app.delete('/api/jobs/:id/assign-truck/', (req, res) => {
  const job = db.jobs.find((j) => String(j.id) === String(req.params.id)) || db.jobs[0];
  const targetId = req.body?.truck_id || req.body?.id;
  if (targetId) {
    job.truck_assignments = (job.truck_assignments || []).filter(
      (a) => String(a.truck_id) !== String(targetId) && String(a.id) !== String(targetId)
    );
  }
  res.json(job);
});

// Payments & Reports
app.get('/api/payments/health/', (_req, res) => {
  res.json({
    status: 'ok',
    event_errors_24h: 0,
    events_unprocessed_24h: 0,
  });
});

app.get('/api/payments/reports/payment-in-out/', (_req, res) => {
  res.json({
    payments: {
      count: db.payments.length,
      page: 1,
      page_size: 25,
      results: db.payments,
      rows: db.payments,
      summary: { total_in: 2240, total_out: 50, net: 2190 },
    },
    refunds: {
      count: db.refunds.length,
      page: 1,
      page_size: 25,
      results: db.refunds,
      rows: db.refunds,
    },
    results: db.payments,
  });
});

app.get('/api/payments/reports/outstanding-balances/', (_req, res) => {
  const rows = db.opportunities.map((o) => ({
    id: o.id,
    customer_name: o.name,
    quote_number: o.display_number,
    opportunity_number: o.display_number,
    service_date: o.move_date,
    invoice_sent_at: o.updated_at,
    opportunity_total: Number(o.value || 2680),
    payments: o.is_booked ? 250 : 0,
    balance: Math.max(Number(o.value || 2680) - (o.is_booked ? 250 : 0), 0),
  }));
  res.json({ count: rows.length, results: rows, rows });
});

app.get('/api/sales/reports/sales-person-performance/summary/', (_req, res) => {
  const rows = [
    {
      salesperson_id: 3,
      salesperson_name: 'Marcus Vance',
      leads_assigned: 42,
      quotes_sent: 31,
      booked_count: 19,
      lost_count: 5,
      conversion_rate: 45.2,
      booked_value: 74200,
    },
    {
      salesperson_id: 4,
      salesperson_name: 'Elena Rostova',
      leads_assigned: 38,
      quotes_sent: 27,
      booked_count: 15,
      lost_count: 6,
      conversion_rate: 39.5,
      booked_value: 58900,
    },
    {
      salesperson_id: 2,
      salesperson_name: 'Sarah Jenkins',
      leads_assigned: 21,
      quotes_sent: 16,
      booked_count: 9,
      lost_count: 2,
      conversion_rate: 42.9,
      booked_value: 35300,
    },
  ];
  res.json({ count: rows.length, results: rows, summary: { total_leads: 101, total_booked: 43, total_revenue: 168400 } });
});

app.get('/api/sales/reports/sales-person-performance/records/', (_req, res) => {
  const rows = db.opportunities.map((o) => ({
    id: o.id,
    sales_number: o.display_number,
    received_at: o.created_at,
    salesperson_name: o.assigned_user_name,
    customer_name: o.name,
    email: o.email,
    phone: o.phone,
    branch_name: o.branch_name,
    outcome: o.is_booked ? 'booked' : 'pending',
    booked_value: o.value,
    move_date: o.move_date,
  }));
  res.json({ count: rows.length, results: rows });
});

app.get('/api/sales/reports/sales-person-activity/summary/', (_req, res) => {
  const rows = [
    { user_id: 3, salesperson_name: 'Marcus Vance', calls_count: 64, emails_count: 48, sms_count: 39, notes_count: 25, booked_count: 19, total_activities: 176 },
    { user_id: 4, salesperson_name: 'Elena Rostova', calls_count: 52, emails_count: 41, sms_count: 33, notes_count: 19, booked_count: 15, total_activities: 145 },
  ];
  res.json({ count: rows.length, results: rows });
});

app.get('/api/sales/reports/sales-person-activity/details/', (_req, res) => {
  res.json({ count: db.activities.length, results: db.activities });
});

app.get('/api/sales/reports/leads/new/', (_req, res) => {
  res.json({ count: db.leads.length, results: db.leads });
});

app.get('/api/sales/reports/cancellations/details/', (_req, res) => {
  res.json({ count: 0, results: [] });
});

app.get('/api/sales/reports/opportunities/booked-by-date/', (_req, res) => {
  const booked = db.opportunities.filter((o) => o.is_booked);
  res.json({ count: booked.length, results: booked });
});

app.get('/api/jobs/reports/service-date/', (_req, res) => {
  res.json({ count: db.jobs.length, results: db.jobs });
});

app.get('/api/reports/login-history/', (_req, res) => {
  res.json({ count: db.auditLogs.length, results: db.auditLogs });
});

app.post('/api/sales/reports/sales-person-performance/email/', (_req, res) => {
  res.json({ ok: true, detail: 'Report emailed successfully.' });
});

// Automations metadata
app.get('/api/automations/workflows/fields/', (_req, res) => {
  res.json([
    { name: 'status', label: 'Status', type: 'string' },
    { name: 'branch_id', label: 'Branch', type: 'number' },
    { name: 'move_size', label: 'Move Size', type: 'string' },
  ]);
});

app.get('/api/automations/workflows/step-types/', (_req, res) => {
  res.json([
    { value: 'send_email', label: 'Send Email' },
    { value: 'send_sms', label: 'Send SMS' },
    { value: 'send_multichannel', label: 'Send Email & SMS' },
    { value: 'wait', label: 'Wait / Delay' },
    { value: 'create_task', label: 'Create Follow-Up Task' },
  ]);
});

app.get('/api/automations/workflows/variables/', (_req, res) => {
  res.json([
    { key: '{{customer_first_name}}', label: 'Customer First Name' },
    { key: '{{customer_name}}', label: 'Customer Full Name' },
    { key: '{{sales_number}}', label: 'Sales / Quote Number' },
    { key: '{{move_date}}', label: 'Move Date' },
    { key: '{{company_name}}', label: 'Company Name' },
    { key: '{{portal_url}}', label: 'Customer Estimate Portal Link' },
  ]);
});

app.get('/api/documents/variables/', (_req, res) => {
  res.json([
    { key: '{{customer_name}}', label: 'Customer Name', category: 'Customer' },
    { key: '{{move_date}}', label: 'Move Date', category: 'Move' },
    { key: '{{origin_address}}', label: 'Origin Address', category: 'Move' },
    { key: '{{destination_address}}', label: 'Destination Address', category: 'Move' },
    { key: '{{grand_total}}', label: 'Estimate Grand Total', category: 'Financials' },
  ]);
});

app.get('/api/integrations/communication-templates/variables/', (_req, res) => {
  res.json([
    { key: '{{customer_first_name}}', label: 'Customer First Name' },
    { key: '{{sales_number}}', label: 'Sales Number' },
    { key: '{{move_date}}', label: 'Move Date' },
    { key: '{{company_name}}', label: 'Company Name' },
  ]);
});

app.get('/api/integrations/communication-templates/template-keys/', (_req, res) => {
  res.json([
    { key: 'send_quote', label: 'Send Quote' },
    { key: 'booking_confirmed', label: 'Booking Confirmation' },
    { key: 'quote_followup_sms', label: 'Quote Follow-up SMS' },
  ]);
});

// ============================================================================
// Generic REST Collection & Item Router for All Mapped Collections
// ============================================================================
const collectionMap = {
  users: db.users,
  roles: db.roles,
  branches: db.branches,
  companies: db.companies,
  'audit-logs': db.auditLogs,
  'move-types': db.moveTypes,
  'leads/leads': db.leads,
  'leads/referral-sources': db.referralSources,
  'leads/lead-status-codes': db.statusCodes,
  'leads/lead-activities': db.activities,
  'leads/customers': db.opportunities.map((o) => o.customer_details).filter(Boolean),
  'sales/opportunities': db.opportunities,
  'sales/sales-activities': db.activities,
  'sales/timeline-events': db.activities,
  'sales/tasks': db.tasks,
  'sales/status-codes': db.statusCodes,
  'sales/opportunity-loss-reasons': db.lossReasons,
  'sales/service-types': db.serviceTypes,
  'sales/mover-sizes': db.moverSizes,
  'payments/payment-requests': db.paymentRequests,
  'payments/payments': db.payments,
  'payments/refunds': db.refunds,
  jobs: db.jobs,
  'jobs/trucks': db.trucks,
  crew: db.crewMembers,
  estimates: db.estimates,
  'customer-portal-settings': db.customerPortalSettings,
  'estimate-discount-presets': db.discountPresets,
  'catalog-items': db.catalogItems,
  'portal-templates': db.portalTemplates,
  packages: db.packages,
  'documents/templates': db.documentTemplates,
  'integrations/payment-gateways': db.paymentGateways,
  'integrations/communication-templates': db.communicationTemplates,
  'integrations/communication-template-categories': db.communicationTemplateCategories,
  'automations/workflows': db.workflows,
  'automations/runs': db.automationRuns,
};

for (const [routeKey, storeArray] of Object.entries(collectionMap)) {
  app.get(`/api/${routeKey}/`, (req, res) => {
    let list = [...storeArray];
    if (routeKey === 'estimates' && req.query.opportunity) {
      list = list.filter((e) => String(e.opportunity || e.opportunity_id) === String(req.query.opportunity));
    }
    res.json({ count: list.length, next: null, previous: null, results: list });
  });

  app.post(`/api/${routeKey}/`, (req, res) => {
    const newItem = {
      id: nextId(),
      created_at: nowIso(),
      updated_at: nowIso(),
      ...(req.body || {}),
    };
    if (routeKey === 'leads/leads') {
      newItem.sales_number = newItem.sales_number || 10000 + newItem.id;
      newItem.display_number = newItem.display_number || `AUS-${newItem.sales_number}`;
      newItem.name = newItem.name || `${newItem.first_name || ''} ${newItem.last_name || ''}`.trim() || 'New Lead';
      newItem.branch_id = newItem.branch_id || newItem.branch || 1;
      newItem.branch_name = newItem.branch_name || 'Main Branch';
      newItem.status = newItem.status || 'new';
      newItem.lead_status = newItem.lead_status || 'new';
      newItem.workflow_stage = newItem.workflow_stage || 'new_lead';
    }
    storeArray.unshift(newItem);
    res.status(201).json(newItem);
  });

  app.get(`/api/${routeKey}/:id/`, (req, res) => {
    const item = storeArray.find((row) => String(row.id) === String(req.params.id)) || storeArray[0] || { id: req.params.id };
    res.json(item);
  });

  app.patch(`/api/${routeKey}/:id/`, (req, res) => {
    const item = storeArray.find((row) => String(row.id) === String(req.params.id));
    if (item) {
      Object.assign(item, req.body || {}, { updated_at: nowIso() });
      return res.json(item);
    }
    res.json({ id: req.params.id, ...(req.body || {}) });
  });

  app.put(`/api/${routeKey}/:id/`, (req, res) => {
    const item = storeArray.find((row) => String(row.id) === String(req.params.id));
    if (item) {
      Object.assign(item, req.body || {}, { updated_at: nowIso() });
      return res.json(item);
    }
    res.json({ id: req.params.id, ...(req.body || {}) });
  });

  app.delete(`/api/${routeKey}/:id/`, (req, res) => {
    const idx = storeArray.findIndex((row) => String(row.id) === String(req.params.id));
    if (idx !== -1) storeArray.splice(idx, 1);
    res.status(204).send();
  });
}

// ============================================================================
// SaaS Platform Control Plane - Super Admin Routes
// ============================================================================
setupPlatformRoutes(app, db, nextId, nowIso);

// Fallback for any other /api/* requests so no UI action fails with 404
app.all('/api/*', (req, res) => {
  if (req.method === 'GET') {
    return res.json({ count: 0, next: null, previous: null, results: [] });
  }
  if (req.method === 'DELETE') {
    return res.status(204).send();
  }
  return res.json({ id: nextId(), ok: true, status: 'success', ...(req.body || {}) });
});

// ============================================================================
// Static Platform Admin Serving (Standalone SPA)
// ============================================================================
const platformDistDir = path.join(__dirname, 'platform-admin-dist');
const platformIndexHtml = path.join(platformDistDir, 'index.html');

if (!fs.existsSync(platformIndexHtml)) {
  try {
    console.log('[KargoFlow] Building platform-admin dist...');
    execSync('npm run build --workspace=platform-admin', { cwd: __dirname, stdio: 'inherit' });
  } catch (err) {
    console.warn('[KargoFlow] Platform admin build warning:', err?.message);
  }
}

app.use('/platform-admin', express.static(platformDistDir));
app.get(['/platform-admin', '/platform-admin/*'], (_req, res) => {
  if (fs.existsSync(platformIndexHtml)) {
    return res.sendFile(platformIndexHtml);
  }
  res.status(200).send('<!doctype html><html><body><h1>KargoFlow Platform Admin building...</h1></body></html>');
});

// ============================================================================
// Static Frontend Serving (SPA Fallback)
// ============================================================================
const distDir = path.join(__dirname, 'frontend', 'dist');
const indexHtmlPath = path.join(distDir, 'index.html');

if (!fs.existsSync(indexHtmlPath)) {
  try {
    console.log('[KargoFlow] Building frontend dist...');
    execSync('npm run build --workspace=frontend', { cwd: __dirname, stdio: 'inherit' });
  } catch (err) {
    console.warn('[KargoFlow] Frontend build warning:', err?.message);
  }
}

app.use(express.static(distDir));

app.get('*', (_req, res) => {
  if (fs.existsSync(indexHtmlPath)) {
    return res.sendFile(indexHtmlPath);
  }
  res.status(200).send('<!doctype html><html><body><h1>KargoFlow CRM starting...</h1></body></html>');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[KargoFlow CRM] Server running on http://0.0.0.0:${PORT}`);
});
