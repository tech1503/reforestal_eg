import React, { useState } from 'react';
import { Eye, Trash2, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/contexts/I18nContext';
import { format } from 'date-fns';

const ContributionTable = ({ contributions, onDelete }) => {
  const { currentLanguage } = useI18n();

  // Helper to extract tier name for current language
  const getTierName = (c) => {
      // Logic assumes 'v_startnext_contributions_with_tiers' view or similar structure
      // If using raw Supabase join, structure might be c.support_levels.support_level_translations
      if (c.tier_name_en) return c.tier_name_en; // From View
      
      // Fallback for direct query structure
      if (c.support_levels?.support_level_translations) {
          const t = c.support_levels.support_level_translations.find(x => x.language_code === currentLanguage)
                 || c.support_levels.support_level_translations.find(x => x.language_code === 'en');
          return t?.name || c.support_levels.slug;
      }
      return c.benefit_level || 'Legacy';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b text-slate-700">
                    <tr>
                        <th className="text-left p-4 font-semibold">Contributor</th>
                        <th className="text-left p-4 font-semibold">Amount</th>
                        <th className="text-left p-4 font-semibold">Tier</th>
                        <th className="text-left p-4 font-semibold">Date</th>
                        <th className="text-left p-4 font-semibold">Assets</th>
                        <th className="text-right p-4 font-semibold">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {contributions.length === 0 ? (
                        <tr><td colSpan="6" className="p-8 text-center text-slate-500">No contributions found.</td></tr>
                    ) : contributions.map(c => (
                        <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-4">
                                <div className="font-medium text-slate-900">{c.contributor_name || c.profiles?.name || c.imported_user?.full_name}</div>
                                <div className="text-xs text-slate-500">{c.contributor_email || c.profiles?.email || c.imported_user?.email}</div>
                            </td>
                            <td className="p-4">
                                <span className="font-bold text-emerald-700">€{parseFloat(c.contribution_amount).toFixed(2)}</span>
                            </td>
                            <td className="p-4">
                                <Badge variant="secondary" className="bg-violet-50 text-violet-700 hover:bg-violet-100 border-violet-100">
                                    {getTierName(c)}
                                </Badge>
                            </td>
                            <td className="p-4 text-slate-600">
                                {format(new Date(c.contribution_date), 'MMM d, yyyy')}
                            </td>
                            <td className="p-4">
                                {c.land_dollar_image_url ? (
                                    <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => window.open(c.land_dollar_image_url, '_blank')}>
                                        <ImageIcon className="w-3.5 h-3.5"/> View PNG
                                    </Button>
                                ) : <span className="text-xs text-slate-400 italic">Generating...</span>}
                            </td>
                            <td className="p-4 text-right">
                                <div className="flex justify-end gap-1">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50" onClick={() => onDelete(c.id)}>
                                        <Trash2 className="w-4 h-4"/>
                                    </Button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
  );
};

export default ContributionTable;