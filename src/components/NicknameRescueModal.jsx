import React, { useEffect, useState } from 'react';
import { AlertCircle, Loader } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const NicknameRescueModal = () => {
  const { needsNickname, updateNickname, profile, loading } = useAuth();
  const { toast } = useToast();
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const isPrivilegedRole = profile?.role === 'admin' || profile?.role === 'vorstand';
  const hasNickname = Boolean(String(profile?.referral_code || '').trim());
  const shouldShowNicknameModal = Boolean(needsNickname) && !isPrivilegedRole && !hasNickname && !loading;

  useEffect(() => {
    if (!shouldShowNicknameModal) {
      setNickname('');
      setError('');
      setSaving(false);
    }
  }, [shouldShowNicknameModal]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const cleanNickname = nickname.replace(/[^a-z0-9]/g, '').toLowerCase();

    if (cleanNickname.length < 3) {
      setError('Mínimo 3 caracteres');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await updateNickname(cleanNickname);
      toast({
        title: 'Apodo guardado',
        description: 'Tu enlace de referidos ya está listo.',
        className: 'bg-emerald-50 border-emerald-200 text-emerald-800'
      });
    } catch (err) {
      setError(
        err?.message === 'NICKNAME_TAKEN'
          ? 'Este apodo ya está en uso.'
          : 'No se pudo guardar tu apodo. Inténtalo de nuevo.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (!shouldShowNicknameModal) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/95 backdrop-blur-sm p-4">
      <div className="bg-[#04241d] border border-emerald-900/50 p-6 md:p-8 rounded-3xl shadow-2xl w-full max-w-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-[40px] pointer-events-none" />

        <div className="relative z-10">
          <h2 className="text-2xl font-bold text-white mb-2">Elige tu apodo único</h2>
          <p className="text-emerald-100/60 text-sm mb-6 leading-relaxed">
            Necesitamos un apodo para crear tu enlace de referidos. No podrás continuar sin él.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label className="text-emerald-500 text-xs font-bold uppercase tracking-wider block mb-1" htmlFor="rescue-nickname">
                Tu Apodo Único (URL)
              </Label>
              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600/50 font-bold group-focus-within:text-emerald-500 transition-colors">@</span>
                <Input
                  id="rescue-nickname"
                  onChange={(event) => {
                    setNickname(event.target.value.replace(/[^a-z0-9]/g, '').toLowerCase());
                    setError('');
                  }}
                  value={nickname}
                  placeholder="peter123"
                  className="w-full bg-black/40 border-2 border-emerald-900/50 rounded-xl py-6 pl-10 pr-4 text-white focus-visible:ring-0 focus-visible:border-emerald-500 transition-all shadow-inner"
                  autoFocus
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  disabled={saving}
                />
              </div>

              {error ? (
                <p className="text-xs font-bold text-red-500 mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {error}
                </p>
              ) : (
                <p className="text-xs text-emerald-100/40 mt-2 font-medium">
                  reforest.al/rfr.st/{nickname || '...'}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className={`w-full font-bold h-12 rounded-xl shadow-lg transition-all ${
                nickname.length >= 3
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-emerald-900/40 text-emerald-700/50 cursor-not-allowed hover:bg-emerald-900/40'
              }`}
              disabled={saving || nickname.length < 3}
            >
              {saving ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : null}
              Guardar y continuar
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default NicknameRescueModal;
