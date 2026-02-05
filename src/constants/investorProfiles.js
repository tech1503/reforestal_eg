export const INVESTOR_PROFILES = {
  Lena: {
    id: "Lena",
    slug: "lena",
    title: "Verified Impact Partner",
    legacy_title: "Impact Partner",
    color: "emerald", 
    gradient: "from-emerald-400 to-teal-500",
    description: "Driven by sustainability and long-term preservation. You believe in the power of nature."
  },
  Markus: {
    id: "Markus",
    slug: "markus",
    title: "Sustainable Risk-Controlled Partner",
    legacy_title: "Conservative Partner",
    color: "blue",
    gradient: "from-blue-400 to-indigo-500",
    description: "Focused on systems, innovation, and calculated growth. You build the future with precision."
  },
  David: {
    id: "David",
    slug: "david",
    title: "Digital Participative Partner",
    legacy_title: "Community Partner",
    color: "orange",
    gradient: "from-amber-400 to-orange-500",
    description: "You care about people and community impact. You drive change where it is needed most."
  }
};

export const investorProfiles = Object.values(INVESTOR_PROFILES);

export const getInvestorProfileBySlug = (slugOrId) => {
  if (!slugOrId) return INVESTOR_PROFILES['Markus']; // Default
  
  const normalizedKey = slugOrId.charAt(0).toUpperCase() + slugOrId.slice(1).toLowerCase();

  // Try to find by Key (Lena), ID (Lena), Slug (lena), or matching slug in values
  return INVESTOR_PROFILES[slugOrId] ||
    INVESTOR_PROFILES[normalizedKey] ||
    Object.values(INVESTOR_PROFILES).find(p => p.slug === slugOrId?.toLowerCase()) ||
    INVESTOR_PROFILES['Markus'];
};

export const getInvestorProfileName = (slugOrId) => {
  const profile = getInvestorProfileBySlug(slugOrId);
  return profile ? profile.title : 'Unknown Profile';
};

export const getProfileByInternalName = (internalName) => {
  return INVESTOR_PROFILES[internalName] || INVESTOR_PROFILES['Markus'];
};
