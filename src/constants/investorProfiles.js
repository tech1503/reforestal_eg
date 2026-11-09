export const INVESTOR_PROFILES = {
  ambiente: {
    id: "ambiente",
    slug: "ambiente",
    title: "Ambiente (A)",
    legacy_title: "Ambiente",
    color: "emerald",
    gradient: "from-emerald-400 to-teal-500",
    description: "Ecosistemas, biodiversidad y protección del Amazonas. Tu impacto es verde, tangible y duradero."
  },
  colaboracion: {
    id: "colaboracion",
    slug: "colaboracion",
    title: "Colaboración (C)",
    legacy_title: "Colaboración",
    color: "blue",
    gradient: "from-blue-400 to-indigo-500",
    description: "Referidos, comunidad Micelio y construcción colectiva. Tu impacto crece con cada alianza."
  },
  datos_solidos: {
    id: "datos_solidos",
    slug: "datos_solidos",
    title: "Datos Sólidos (D)",
    legacy_title: "Datos Sólidos",
    color: "violet",
    gradient: "from-violet-400 to-fuchsia-500",
    description: "Transparencia, gobernanza y evidencia. Tu impacto es medible, auditable y verificable."
  }
};

export const investorProfiles = Object.values(INVESTOR_PROFILES);

export const getInvestorProfileBySlug = (slugOrId) => {
  if (!slugOrId) return INVESTOR_PROFILES['ambiente'];
  const normalizedKey = slugOrId.charAt(0).toUpperCase() + slugOrId.slice(1).toLowerCase();
  return INVESTOR_PROFILES[slugOrId] ||
    INVESTOR_PROFILES[normalizedKey] ||
    Object.values(INVESTOR_PROFILES).find(p => p.slug === slugOrId?.toLowerCase()) ||
    INVESTOR_PROFILES['ambiente'];
};

export const getInvestorProfileName = (slugOrId) => {
  const profile = getInvestorProfileBySlug(slugOrId);
  return profile ? profile.title : 'Unknown Profile';
};

export const getProfileByInternalName = (internalName) => {
  return INVESTOR_PROFILES[internalName] || INVESTOR_PROFILES['ambiente'];
};
