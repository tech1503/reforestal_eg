
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Card } from '@/components/ui/card';
import { X, Loader2, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

const ImpactCreditsHistoryModal = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && user?.id) {
      fetchHistory();
    }
  }, [isOpen, user?.id]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('gamification_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getSourceLabel = (source) => {
    // Map internal source keys to translation keys
    const sourceMap = {
      'profile_update': 'profile_update',
      'quest_completion': 'quest_completion',
      'startnext_contribution': 'startnext_contribution',
      'referral_signup': 'referral_signup',
      'mlm_direct_quest': 'mlm_direct',
      'mlm_indirect_quest': 'mlm_indirect',
      'manual': 'manual'
    };
    
    // Attempt translation, fallback to raw source string
    const key = sourceMap[source] || source;
    return t(`gamification.sources.${key}`, source);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <Card className="w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden shadow-2xl border-0">
        <div className="flex justify-between items-center p-5 border-b border-border bg-slate-50 dark:bg-slate-900">
          <div className="flex items-center gap-2">
             <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
             </div>
             <h2 className="text-xl font-bold">{t('dashboard.impact_credits_history')}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                <span>{t('common.loading')}</span>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center text-slate-400 py-12">
                {t('dashboard.no_history')}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 z-10">
                <tr>
                  <th className="p-4 text-left font-medium text-slate-500">{t('dashboard.action')}</th>
                  <th className="p-4 text-right font-medium text-slate-500">{t('dashboard.amount')}</th>
                  <th className="p-4 text-left font-medium text-slate-500">{t('dashboard.source')}</th>
                  <th className="p-4 text-right font-medium text-slate-500">{t('dashboard.date')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {history.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="p-4 font-medium">
                        {item.action_name || item.action_id || t('dashboard.system_action')}
                        {item.notes && <p className="text-xs text-slate-400 font-normal mt-0.5">{item.notes}</p>}
                    </td>
                    <td className="p-4 text-right">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded">
                            +{item.points_earned}
                        </span>
                    </td>
                    <td className="p-4">
                        <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">
                            {getSourceLabel(item.source)}
                        </span>
                    </td>
                    <td className="p-4 text-right text-xs text-slate-400 font-mono">
                      {format(new Date(item.created_at), 'MMM d, yyyy')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        
        <div className="p-4 border-t border-border bg-slate-50 dark:bg-slate-900 text-xs text-center text-slate-400">
            Total Credits: <span className="font-bold text-emerald-600">{history.reduce((a,b)=>a+(b.points_earned||0),0)}</span>
        </div>
      </Card>
    </div>
  );
};

export default ImpactCreditsHistoryModal;
