import { pgTable, text, integer, boolean, timestamp, jsonb, doublePrecision, bigint } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(), // Firebase Auth UID
  fullName: text('full_name').notNull(),
  email: text('email').notNull(),
  role: text('role').notNull().default('Business Development Officer'),
  department: text('department'),
  avatarUrl: text('avatar_url'),
  status: text('status').notNull().default('Pending'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const prospects = pgTable('prospects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  industry: text('industry').notNull(),
  orgType: text('org_type').notNull(),
  location: text('location').notNull(),
  website: text('website'),
  phone: text('phone'),
  email: text('email'),
  source: text('source'),
  assignedOfficerId: text('assigned_officer_id').references(() => users.id, { onDelete: 'set null' }),
  assignedOfficerName: text('assigned_officer_name'),
  status: text('status').notNull().default('Lead'),
  priority: text('priority').notNull().default('Medium'),
  notes: text('notes'),
  conversionProbability: integer('conversion_probability').notNull().default(20),
  opportunityValue: doublePrecision('opportunity_value').notNull().default(0),
  treasuryPotential: text('treasury_potential'),
  mmfPotential: text('mmf_potential'),
  wealthPotential: text('wealth_potential'),
  literacyPotential: text('literacy_potential'),
  opportunityScore: integer('opportunity_score').notNull().default(50),
  primaryContactId: text('primary_contact_id'),
  stageEnteredDate: text('stage_entered_date'),
  stageUpdatedDate: text('stage_updated_date'),
  actualRevenue: doublePrecision('actual_revenue'),
  lastActivityDate: text('last_activity_date'),
  nextAction: text('next_action'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const contacts = pgTable('contacts', {
  id: text('id').primaryKey(),
  prospectId: text('prospect_id').notNull().references(() => prospects.id, { onDelete: 'cascade' }),
  prospectName: text('prospect_name'),
  fullName: text('full_name').notNull(),
  position: text('position').notNull(),
  department: text('department'),
  email: text('email'),
  phone: text('phone'),
  linkedin: text('linkedin'),
  influenceLevel: text('influence_level').notNull().default('Medium'),
  isDecisionMaker: boolean('is_decision_maker').notNull().default(false),
  notes: text('notes'),
  validationLevel: text('validation_level').default('Unverified'),
  createdAt: text('created_at').notNull(),
});

export const activities = pgTable('activities', {
  id: text('id').primaryKey(),
  prospectId: text('prospect_id').notNull().references(() => prospects.id, { onDelete: 'cascade' }),
  prospectName: text('prospect_name'),
  date: text('date').notNull(),
  time: text('time').notNull(),
  officerId: text('officer_id').references(() => users.id, { onDelete: 'set null' }),
  officerName: text('officer_name'),
  activityType: text('activity_type').notNull(),
  outcome: text('outcome'),
  notes: text('notes'),
  status: text('status').notNull().default('Completed'),
  createdAt: text('created_at').notNull(),
});

export const meetings = pgTable('meetings', {
  id: text('id').primaryKey(),
  prospectId: text('prospect_id').notNull().references(() => prospects.id, { onDelete: 'cascade' }),
  prospectName: text('prospect_name'),
  officerId: text('officer_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  officerName: text('officer_name').notNull(),
  date: text('date').notNull(),
  time: text('time').notNull(),
  durationMinutes: integer('duration_minutes').notNull().default(45),
  purpose: text('purpose').notNull(),
  outcome: text('outcome'),
  nextAction: text('next_action'),
  createdAt: text('created_at').notNull(),
});

export const tasks = pgTable('tasks', {
  id: text('id').primaryKey(),
  prospectId: text('prospect_id').references(() => prospects.id, { onDelete: 'cascade' }),
  prospectName: text('prospect_name'),
  title: text('title').notNull(),
  dueDate: text('due_date').notNull(),
  assignedStaff: text('assigned_staff').notNull(),
  officerId: text('officer_id').references(() => users.id, { onDelete: 'set null' }),
  priority: text('priority').notNull().default('Medium'),
  isCompleted: boolean('is_completed').notNull().default(false),
  notes: text('notes'),
});

export const newsArticles = pgTable('news_articles', {
  id: text('id').primaryKey(),
  companyName: text('company_name').notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  category: text('category').notNull(),
  date: text('date').notNull(),
  severity: text('severity').notNull().default('Low'),
});

export const discoveredLeads = pgTable('discovered_leads', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  name: text('name').notNull(),
  industry: text('industry').notNull(),
  size: text('size').notNull(),
  website: text('website').notNull(),
  location: text('location').notNull(),
  opportunityScore: integer('opportunity_score').notNull(),
  confidenceScore: integer('confidence_score').default(85),
  reason: text('reason').notNull(),
  alreadyimported: boolean('already_imported').notNull().default(false),
  businessFit: text('business_fit').default('High Fit'),
  treasuryPotential: text('treasury_potential'),
  estimatedRevenueValue: bigint('estimated_revenue_value', { mode: 'number' }).default(2500000000),
  recommendedProducts: jsonb('recommended_products'),
  decisionMakers: jsonb('decision_makers'),
  latestNews: text('latest_news'),
  source: text('source'),
  revenueRange: text('revenue_range'),
  createdAt: text('created_at'),
});

export const discoverySessions = pgTable('discovery_sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  userEmail: text('user_email'),
  source: text('source').notNull(),
  industry: text('industry').notNull(),
  location: text('location').notNull(),
  sizeTier: text('size_tier').notNull(),
  revenueRange: text('revenue_range').notNull(),
  targetProduct: text('target_product').notNull(),
  evalCount: integer('eval_count').notNull().default(0),
  recCount: integer('rec_count').notNull().default(0),
  savedCount: integer('saved_count').notNull().default(0),
  createdAt: text('created_at').notNull(),
});

export const discoveryQueues = pgTable('discovery_queues', {
  userId: text('user_id').primaryKey(),
  servedCompanyNames: jsonb('served_company_names').default([]),
  dismissedCompanyNames: jsonb('dismissed_company_names').default([]),
  lastScanAt: text('last_scan_at'),
  updatedAt: text('updated_at'),
});

export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey(),
  timestamp: text('timestamp').notNull(),
  searchTerm: text('search_term').notNull(),
  user: text('user').notNull(),
  userId: text('user_id'),
  userEmail: text('user_email'),
  status: text('status').notNull(),
  sourcesUsed: jsonb('sources_used'),
  confidenceScore: integer('confidence_score').notNull(),
  actionTaken: text('action_taken').notNull(),
  failures: jsonb('failures'),
});

export const savedSessions = pgTable('saved_sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  userEmail: text('user_email').notNull(),
  title: text('title').notNull(),
  type: text('type').notNull(),
  targetCompany: text('target_company').notNull(),
  userInput: text('user_input').notNull(),
  content: text('content').notNull(),
  productScoring: jsonb('product_scoring'),
  createdAt: text('created_at').notNull(),
  notes: text('notes'),
});

export const serenaAuditLogs = pgTable('serena_audit_logs', {
  id: text('id').primaryKey(),
  userEmail: text('user_email').notNull(),
  prompt: text('prompt').notNull(),
  timestamp: text('timestamp').notNull(),
  modelUsed: text('model_used').notNull(),
  tokensConsumed: integer('tokens_consumed').notNull(),
  responseTimeMs: integer('response_time_ms').notNull(),
  module: text('module').notNull(),
});

export const reminders = pgTable('reminders', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'meeting', 'activity', 'task'
  sourceId: text('source_id').notNull(),
  prospectId: text('prospect_id'),
  prospectName: text('prospect_name'),
  title: text('title').notNull(),
  reminderTimeText: text('reminder_time_text').notNull(), // '1 Hour Before', '24 Hours Before', '7 Days Before'
  reminderDateTime: text('reminder_date_time').notNull(),
  sent: boolean('sent').notNull().default(false),
  createdAt: text('created_at').notNull(),
});

export const systemAuditLogs = pgTable('system_audit_logs', {
  id: text('id').primaryKey(),
  timestamp: text('timestamp').notNull(),
  userId: text('user_id'),
  userEmail: text('user_email'),
  userName: text('user_name'),
  action: text('action').notNull(),
  target: text('target'),
  status: text('status').notNull(),
  metadata: jsonb('metadata'),
});

export const weeklyReports = pgTable('weekly_reports', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  userName: text('user_name').notNull(),
  userEmail: text('user_email').notNull(),
  weekStartDate: text('week_start_date').notNull(),
  weekEndDate: text('week_end_date').notNull(),
  summary: text('summary').notNull(),
  prospectsAdded: integer('prospects_added').notNull().default(0),
  meetingsHeld: integer('meetings_held').notNull().default(0),
  followUpsCompleted: integer('follow_ups_completed').notNull().default(0),
  fundsSecured: doublePrecision('funds_secured').notNull().default(0),
  productsSold: text('products_sold').notNull(),
  challenges: text('challenges').notNull(),
  nextWeekPlan: text('next_week_plan').notNull(),
  status: text('status').notNull().default('Draft'), // 'Draft', 'Submitted', 'Reviewed'
  submittedAt: text('submitted_at'),
  updatedAt: text('updated_at').notNull(),
});

export const workspaces = pgTable('workspaces', {
  id: text('id').primaryKey(),
  prospectId: text('prospect_id').references(() => prospects.id, { onDelete: 'set null' }),
  ownerUserId: text('owner_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  companyName: text('company_name').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  status: text('status').notNull().default('Active'), // 'Active', 'Archived', 'Closed'
  apolloFindings: text('apollo_findings'),
  companyProfile: text('company_profile'),
  industryAnalysis: text('industry_analysis'),
  executiveInsights: text('executive_insights'),
  investmentOpportunities: text('investment_opportunities'),
  researchSummaries: text('research_summaries'),
});

export const workspaceNotes = pgTable('workspace_notes', {
  id: text('id').primaryKey(), // noteId
  prospectId: text('prospect_id').references(() => prospects.id, { onDelete: 'set null' }),
  workspaceId: text('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content').notNull(),
  createdBy: text('created_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  visibility: text('visibility').notNull().default('private'), // 'private', 'public'
  isPinned: boolean('is_pinned').notNull().default(false),
  isArchived: boolean('is_archived').notNull().default(false),
});

export const workspaceProposals = pgTable('workspace_proposals', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content').notNull(),
  version: text('version').notNull().default('1.0'),
  approvalStatus: text('approval_status').notNull().default('Draft'), // 'Draft', 'Pending Approval', 'Approved', 'Rejected'
  createdBy: text('created_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const workspacePresentations = pgTable('workspace_presentations', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  type: text('type').notNull(), // 'Pitch Deck', 'Treasury Deck', 'Investment Deck', 'Client Presentation'
  content: text('content').notNull(),
  createdBy: text('created_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').notNull(),
});

export const workspaceAiConversations = pgTable('workspace_ai_conversations', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  userPrompt: text('user_prompt').notNull(),
  responseText: text('response_text').notNull(),
  modelUsed: text('model_used').notNull().default('gemini-2.5-flash'),
  tokens: integer('tokens').notNull().default(0),
  createdAt: text('created_at').notNull(),
});

export const workspaceSearchHistory = pgTable('workspace_search_history', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  searchTerm: text('search_term').notNull(),
  source: text('source').notNull(), // 'Apollo', 'SEC Registry', etc.
  response: text('response').notNull(),
  tokens: integer('tokens').notNull().default(0),
  createdAt: text('created_at').notNull(),
});

export const aiSearchHistory = pgTable('ai_search_history', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  userName: text('user_name').notNull(),
  userEmail: text('user_email').notNull(),
  companyName: text('company_name'),
  searchQuery: text('search_query').notNull(),
  searchType: text('search_type').notNull(), // e.g. 'Apollo Search', 'Company Research', 'Executive Research', 'Serena Research', 'Proposal Generation', 'Email Generation', 'Meeting Brief', 'Follow-Up Recommendation', 'Custom Search'
  timestamp: text('timestamp').notNull(),
  modelUsed: text('model_used'),
  tokensConsumed: integer('tokens_consumed').default(0),
  estimatedCost: doublePrecision('estimated_cost').default(0),
  responseTime: integer('response_time').default(0), // response time in ms
  workspaceId: text('workspace_id'),
  searchResult: text('search_result'),
  status: text('status').notNull().default('Success'),
});

export const notifications = pgTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  timestamp: text('timestamp').notNull(),
  isRead: boolean('is_read').notNull().default(false),
  category: text('category'),
  priority: text('priority'),
  isLegacy: boolean('is_legacy').default(false),
  createdAt: text('created_at'),
  readStatus: text('read_status').default('unread'),
});

export const pushSubscriptions = pgTable('push_subscriptions', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  endpoint: text('endpoint').notNull().unique(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const apolloEnrichmentCache = pgTable('apollo_enrichment_cache', {
  apolloOrgId: text('apollo_org_id').primaryKey(),
  companyName: text('company_name').notNull(),
  domain: text('domain'),
  website: text('website'),
  industry: text('industry'),
  employeeCount: text('employee_count'),
  revenueEstimate: text('revenue_estimate'),
  headquarters: text('headquarters'),
  linkedinUrl: text('linkedin_url'),
  executivesJson: jsonb('executives_json').default([]),
  rawApolloData: jsonb('raw_apollo_data').default({}),
  cacheStatus: text('cache_status').notNull().default('Active'),
  lastSyncedAt: text('last_synced_at').notNull(),
  createdAt: text('created_at').notNull(),
});





