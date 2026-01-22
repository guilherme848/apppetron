// =============================================
// ROLE VISIBILITY - CONTROLS WHAT EACH ROLE CAN SEE
// =============================================

import { PermissionKey } from '@/types/permissions';
import { RoleKey } from '@/lib/accountTeam';

// Module visibility configuration per role
export interface ModuleVisibility {
  content: boolean;
  traffic: boolean;
  cs: boolean;
  crm: boolean;
  dashboard: boolean;
}

// Specific feature visibility
export interface FeatureVisibility {
  // Content
  contentPosts: boolean;
  contentExtras: boolean;
  contentProduction: boolean;
  
  // Traffic
  trafficTasks: boolean;
  trafficCreatives: boolean;
  trafficBalances: boolean;
  
  // CS
  csOnboarding: boolean;
  csMeetings: boolean;
  csNps: boolean;
  csRisk: boolean;
  
  // CRM
  crmClients: boolean;
  crmTasks: boolean;
}

// Role visibility configuration
export interface RoleVisibilityConfig {
  modules: ModuleVisibility;
  features: FeatureVisibility;
  taskSources: TaskSource[];
}

// Task sources for counting
export type TaskSource = 
  | 'content_posts' 
  | 'content_extra_requests' 
  | 'traffic_tasks'
  | 'traffic_creative_requests'
  | 'cs_client_onboarding_tasks'
  | 'cs_meeting_actions'
  | 'cs_risk_action_items';

// Default visibility - can see everything (admin/gestão)
const fullVisibility: RoleVisibilityConfig = {
  modules: {
    content: true,
    traffic: true,
    cs: true,
    crm: true,
    dashboard: true,
  },
  features: {
    contentPosts: true,
    contentExtras: true,
    contentProduction: true,
    trafficTasks: true,
    trafficCreatives: true,
    trafficBalances: true,
    csOnboarding: true,
    csMeetings: true,
    csNps: true,
    csRisk: true,
    crmClients: true,
    crmTasks: true,
  },
  taskSources: [
    'content_posts',
    'content_extra_requests',
    'traffic_tasks',
    'traffic_creative_requests',
    'cs_client_onboarding_tasks',
    'cs_meeting_actions',
    'cs_risk_action_items',
  ],
};

// Role-specific visibility configurations
export const ROLE_VISIBILITY: Record<RoleKey | 'admin', RoleVisibilityConfig> = {
  // Designer - Content production + Traffic creatives
  designer: {
    modules: {
      content: true,
      traffic: true,
      cs: false,
      crm: false,
      dashboard: false,
    },
    features: {
      contentPosts: true,
      contentExtras: false,
      contentProduction: true,
      trafficTasks: false,
      trafficCreatives: true,
      trafficBalances: false,
      csOnboarding: false,
      csMeetings: false,
      csNps: false,
      csRisk: false,
      crmClients: false,
      crmTasks: false,
    },
    taskSources: ['content_posts', 'traffic_creative_requests'],
  },

  // Videomaker - Similar to designer
  videomaker: {
    modules: {
      content: true,
      traffic: true,
      cs: false,
      crm: false,
      dashboard: false,
    },
    features: {
      contentPosts: true,
      contentExtras: false,
      contentProduction: true,
      trafficTasks: false,
      trafficCreatives: true,
      trafficBalances: false,
      csOnboarding: false,
      csMeetings: false,
      csNps: false,
      csRisk: false,
      crmClients: false,
      crmTasks: false,
    },
    taskSources: ['content_posts', 'traffic_creative_requests'],
  },

  // Social Media - Posts, extras, content production
  social: {
    modules: {
      content: true,
      traffic: false,
      cs: false,
      crm: true,
      dashboard: false,
    },
    features: {
      contentPosts: true,
      contentExtras: true,
      contentProduction: true,
      trafficTasks: false,
      trafficCreatives: false,
      trafficBalances: false,
      csOnboarding: false,
      csMeetings: false,
      csNps: false,
      csRisk: false,
      crmClients: true,
      crmTasks: false,
    },
    taskSources: ['content_posts', 'content_extra_requests'],
  },

  // Gestor de Tráfego - Traffic tasks, creatives, balances
  traffic: {
    modules: {
      content: false,
      traffic: true,
      cs: false,
      crm: true,
      dashboard: false,
    },
    features: {
      contentPosts: false,
      contentExtras: false,
      contentProduction: false,
      trafficTasks: true,
      trafficCreatives: true,
      trafficBalances: true,
      csOnboarding: false,
      csMeetings: false,
      csNps: false,
      csRisk: false,
      crmClients: true,
      crmTasks: false,
    },
    taskSources: ['traffic_tasks', 'traffic_creative_requests'],
  },

  // Atendimento/Support - Extras, basic client view, CS alerts
  support: {
    modules: {
      content: true,
      traffic: false,
      cs: true,
      crm: true,
      dashboard: false,
    },
    features: {
      contentPosts: false,
      contentExtras: true,
      contentProduction: false,
      trafficTasks: false,
      trafficCreatives: false,
      trafficBalances: false,
      csOnboarding: true,
      csMeetings: false,
      csNps: true,
      csRisk: false,
      crmClients: true,
      crmTasks: true,
    },
    taskSources: ['content_extra_requests', 'cs_client_onboarding_tasks'],
  },

  // CS - Full CS module access
  cs: {
    modules: {
      content: false,
      traffic: false,
      cs: true,
      crm: true,
      dashboard: true,
    },
    features: {
      contentPosts: false,
      contentExtras: false,
      contentProduction: false,
      trafficTasks: false,
      trafficCreatives: false,
      trafficBalances: false,
      csOnboarding: true,
      csMeetings: true,
      csNps: true,
      csRisk: true,
      crmClients: true,
      crmTasks: false,
    },
    taskSources: [
      'cs_client_onboarding_tasks',
      'cs_meeting_actions',
      'cs_risk_action_items',
    ],
  },

  // Admin - Full access
  admin: fullVisibility,
};

/**
 * Get visibility config for a role name (matches against job_roles.name)
 */
export function getVisibilityForRoleName(roleName: string | null | undefined): RoleVisibilityConfig {
  if (!roleName) return ROLE_VISIBILITY.admin;
  
  const normalized = roleName.toLowerCase().trim();
  
  // Map common role names to role keys
  if (normalized.includes('designer')) return ROLE_VISIBILITY.designer;
  if (normalized.includes('videomaker') || normalized.includes('video')) return ROLE_VISIBILITY.videomaker;
  if (normalized.includes('social') || normalized.includes('redes')) return ROLE_VISIBILITY.social;
  if (normalized.includes('tráfego') || normalized.includes('traffic') || normalized.includes('gestor')) return ROLE_VISIBILITY.traffic;
  if (normalized.includes('atendimento') || normalized.includes('suporte') || normalized.includes('support')) return ROLE_VISIBILITY.support;
  if (normalized.includes('cs') || normalized.includes('customer') || normalized.includes('sucesso')) return ROLE_VISIBILITY.cs;
  if (normalized.includes('admin') || normalized.includes('gestão') || normalized.includes('diretor')) return ROLE_VISIBILITY.admin;
  
  // Default to admin (full access) for unknown roles
  return ROLE_VISIBILITY.admin;
}

/**
 * Check if a role can see a specific module
 */
export function canSeeModule(roleName: string | null | undefined, module: keyof ModuleVisibility): boolean {
  return getVisibilityForRoleName(roleName).modules[module];
}

/**
 * Check if a role can see a specific feature
 */
export function canSeeFeature(roleName: string | null | undefined, feature: keyof FeatureVisibility): boolean {
  return getVisibilityForRoleName(roleName).features[feature];
}

/**
 * Get task sources that should be counted for a role
 */
export function getTaskSourcesForRole(roleName: string | null | undefined): TaskSource[] {
  return getVisibilityForRoleName(roleName).taskSources;
}
