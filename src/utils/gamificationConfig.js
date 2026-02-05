
export const GAMIFICATION_ACTIONS = {
  PROFILE_UPDATE: {
    slug: 'profile_update',
    points: 50,
    is_mlm_trigger: false,
    allowed_roles: ['user', 'startnext_user', 'admin']
  },
  STARTNEXT_CONTRIBUTION: {
    slug: 'startnext_contribution',
    points: 100,
    is_mlm_trigger: true,
    allowed_roles: ['startnext_user', 'admin']
  },
  QUEST_COMPLETION: {
    slug: 'quest_completion',
    points: 25,
    is_mlm_trigger: true,
    allowed_roles: ['user', 'startnext_user', 'admin']
  },
  REFERRAL_SIGNUP: {
    slug: 'referral_signup',
    points: 150,
    is_mlm_trigger: true,
    allowed_roles: ['user', 'startnext_user', 'admin']
  },
  // Additional system actions
  GENESIS_QUEST: {
    slug: 'genesis_quest',
    points: 1000,
    is_mlm_trigger: false,
    allowed_roles: ['user', 'startnext_user', 'admin']
  }
};

export const getActionsForRole = (role) => {
  return Object.values(GAMIFICATION_ACTIONS).filter(action => 
    action.allowed_roles.includes(role) || action.allowed_roles.includes('all')
  );
};

export const getMLMActions = () => {
  return Object.values(GAMIFICATION_ACTIONS).filter(action => action.is_mlm_trigger);
};
