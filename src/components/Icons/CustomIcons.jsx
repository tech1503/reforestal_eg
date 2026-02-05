import React from 'react';
import { motion } from 'framer-motion';

// --- Helper for consistent SVG props ---
const IconBase = ({ className, children, viewBox = "0 0 24 24" }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox={viewBox} 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="1.5" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    {children}
  </svg>
);

// --- Explorer Variant Icons ---

export const IconMountainSpring = ({ className }) => (
  <IconBase className={className}>
    <path d="M8 3l4 8 5-5 5 15H2L8 3z" />
    <path d="M12 11l-2 4h4l-2-4" className="text-blue-400 fill-blue-100/50" />
    <path d="M12 3v3" strokeDasharray="2 2" />
  </IconBase>
);

export const IconMountainStream = ({ className }) => (
  <IconBase className={className}>
    <path d="M3 20l5-10 4 6 5-8 4 12H3z" />
    <path d="M8 20c0-4 3-6 4-6s4 2 4 6" className="text-blue-500" />
    <path d="M12 14c0-2 1-3 2-3" />
  </IconBase>
);

export const IconRiverbed = ({ className }) => (
  <IconBase className={className}>
    <path d="M3 18c0-5 4-8 9-8s9 3 9 8" className="text-blue-600 fill-blue-50" />
    <path d="M3 21h18" />
    <path d="M6 13l-3-5 5-3 4 5" opacity="0.5" />
    <path d="M18 13l3-5-5-3-4 5" opacity="0.5" />
  </IconBase>
);

export const IconLifeline = ({ className }) => (
  <IconBase className={className}>
    <path d="M12 21c0-6-4-9-4-15h8c0 6-4 9-4 15z" className="fill-emerald-100 text-emerald-600" />
    <path d="M12 21v-8" />
    <path d="M12 16c2 0 3-1 3-3" />
    <path d="M12 18c-2 0-3-1-3-3" />
    <circle cx="12" cy="5" r="3" className="text-amber-500 fill-amber-100" />
  </IconBase>
);

// --- Benefit Icons ---

export const IconImpactCredit = ({ className }) => (
  <IconBase className={className}>
    <circle cx="12" cy="12" r="9" className="fill-amber-50 text-amber-500" />
    <path d="M12 16v-8" className="text-amber-600" />
    <path d="M9 12h6" className="text-amber-600" />
    <path d="M12 8l3-2" />
    <path d="M12 8l-3-2" />
  </IconBase>
);

export const IconDigitalLandDollar = ({ className }) => (
  <IconBase className={className}>
    <rect x="4" y="2" width="16" height="20" rx="2" className="fill-emerald-50 text-emerald-600" />
    <path d="M8 6h8" />
    <path d="M8 10h8" />
    <rect x="8" y="14" width="8" height="4" className="fill-white" />
    <path d="M12 14v4" />
    <path d="M8 16h8" />
  </IconBase>
);

export const IconPhysicalLandDollar = ({ className }) => (
  <IconBase className={className}>
    <rect x="2" y="6" width="20" height="12" rx="2" className="fill-amber-50 text-amber-700" />
    <circle cx="12" cy="12" r="3" className="fill-white/50" />
    <path d="M6 12h.01" strokeWidth="3" />
    <path d="M18 12h.01" strokeWidth="3" />
  </IconBase>
);

export const IconPioneerKey = ({ className }) => (
  <IconBase className={className}>
    <circle cx="13.5" cy="6.5" r="3.5" className="text-violet-500" />
    <path d="M11 9L5 20l3.5 1.5L13 11.5" className="text-violet-500" />
    <path d="M7.5 17.5L9 19" />
  </IconBase>
);

export const IconHarvestTrust = ({ className }) => (
  <IconBase className={className}>
    <path d="M12 3a9 9 0 0 0-9 9c0 4.5 3.5 8.5 8 9h2c4.5-.5 8-4.5 8-9a9 9 0 0 0-9-9z" className="text-amber-800 fill-amber-100" />
    <path d="M12 3c0 6-3 9-3 18" opacity="0.6" />
  </IconBase>
);

export const IconAsamblea = ({ className }) => (
  <IconBase className={className}>
    <circle cx="12" cy="12" r="10" className="text-blue-500 opacity-20" />
    <circle cx="12" cy="7" r="2" className="text-blue-600 fill-blue-100" />
    <circle cx="7" cy="16" r="2" className="text-blue-600 fill-blue-100" />
    <circle cx="17" cy="16" r="2" className="text-blue-600 fill-blue-100" />
    <path d="M12 9v3l-2.5 4" opacity="0.5" />
    <path d="M12 12l2.5 4" opacity="0.5" />
  </IconBase>
);

export const IconEBook = ({ className }) => (
  <IconBase className={className}>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" className="fill-slate-50 text-slate-700" />
    <path d="M12 6l-4 4 4 4" opacity="0.5" />
    <path d="M16 6l-4 4 4 4" opacity="0.5" />
  </IconBase>
);

export const IconVote = ({ className }) => (
  <IconBase className={className}>
    <path d="M5 12h14" />
    <path d="M12 5v14" />
    <rect x="3" y="3" width="18" height="18" rx="2" className="text-purple-500 stroke-purple-500" />
  </IconBase>
);

export const IconTreeDedication = ({ className }) => (
  <IconBase className={className}>
    <path d="M12 21c-3.5 0-6.5-3-6.5-8a6.5 6.5 0 1 1 13 0c0 5-3 8-6.5 8z" className="fill-green-100 text-green-700" />
    <path d="M12 21v-9" />
    <path d="M12 15l-2-2" />
    <path d="M12 17l2-2" />
  </IconBase>
);

// --- Mapper Function ---

export const getBenefitIcon = (description = "", type = "digital", icon_name = null) => {
  const desc = description.toLowerCase();
  
  // 1. Explicit Icon Name Match (Database Driven)
  if (icon_name === 'credit') return <IconImpactCredit className="w-6 h-6" />;
  if (icon_name === 'land_dollar') {
      if(type === 'physical') return <IconPhysicalLandDollar className="w-6 h-6" />;
      return <IconDigitalLandDollar className="w-6 h-6" />;
  }
  if (icon_name === 'pioneer') return <IconPioneerKey className="w-6 h-6" />;
  if (icon_name === 'harvest') return <IconHarvestTrust className="w-6 h-6" />;
  if (icon_name === 'asamblea') return <IconAsamblea className="w-6 h-6" />;
  if (icon_name === 'vote') return <IconVote className="w-6 h-6" />;
  if (icon_name === 'tree') return <IconTreeDedication className="w-6 h-6" />;

  // 2. Fallback: String Matching (Legacy Compatibility)
  if (desc.includes('harvest') || desc.includes('ernte') || desc.includes('cocoa')) return <IconHarvestTrust className="w-6 h-6" />;
  if (desc.includes('asamblea') || desc.includes('group call') || desc.includes('gruppenanruf')) return <IconAsamblea className="w-6 h-6" />;
  if (desc.includes('1:1') || desc.includes('personal')) return <IconAsamblea className="w-6 h-6 text-purple-600" />;
  if (desc.includes('pioneer') || desc.includes('pionier')) return <IconPioneerKey className="w-6 h-6" />;
  if (desc.includes('e-book') || desc.includes('book')) return <IconEBook className="w-6 h-6" />;
  
  // Land Dollars
  if ((desc.includes('land dollar') || desc.includes('land-dollar')) && (desc.includes('physical') || desc.includes('physisch'))) return <IconPhysicalLandDollar className="w-6 h-6" />;
  if (desc.includes('land dollar') || desc.includes('land-dollar')) return <IconDigitalLandDollar className="w-6 h-6" />;

  // Impact Credits
  if (desc.includes('impact credits') || desc.includes('credits')) return <IconImpactCredit className="w-6 h-6" />;

  // 3. Fallback: Type Matching
  if (type === 'physical') return <IconHarvestTrust className="w-6 h-6 text-amber-500" />;
  if (type === 'experience') return <IconAsamblea className="w-6 h-6 text-blue-500" />;
  
  return <IconMountainSpring className="w-6 h-6 text-emerald-500" />;
};

export const getVariantIcon = (slug = "") => {
  if (slug.includes('spring') || slug.includes('quelle')) return <IconMountainSpring className="w-full h-full" />;
  if (slug.includes('stream') || slug.includes('bach')) return <IconMountainStream className="w-full h-full" />;
  if (slug.includes('river') || slug.includes('fluss')) return <IconRiverbed className="w-full h-full" />;
  if (slug.includes('lifeline') || slug.includes('lebensader')) return <IconLifeline className="w-full h-full" />;
  return <IconMountainSpring className="w-full h-full" />; // Default
};