import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Save } from 'lucide-react';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
];

const BenefitTranslationEditor = ({ benefit, isOpen, onClose, onSave }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [translations, setTranslations] = useState({});
  const [activeTab, setActiveTab] = useState('en');

  useEffect(() => {
    const fetchTranslations = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('support_benefit_translations')
          .select('*')
          .eq('support_benefit_id', benefit.id);

        if (error) throw error;

        const transMap = {};
        LANGUAGES.forEach(lang => {
          const found = data.find(t => t.language_code === lang.code);
          transMap[lang.code] = {
            description: found?.description || '',
            id: found?.id
          };
        });
        setTranslations(transMap);
      } catch (err) {
        toast({ variant: "destructive", title: "Error", description: "Failed to load translations" });
      } finally {
        setLoading(false);
      }
    };

    if (isOpen && benefit) {
      fetchTranslations();
    }
  }, [isOpen, benefit, toast]); // Lógica encapsulada

  const handleSave = async () => {
    setLoading(true);
    try {
      const upserts = Object.entries(translations).map(([code, data]) => ({
        support_benefit_id: benefit.id,
        language_code: code,
        description: data.description,
        ...(data.id ? { id: data.id } : {})
      }));

      const { error } = await supabase
        .from('support_benefit_translations')
        .upsert(upserts, { onConflict: 'support_benefit_id,language_code' });

      if (error) throw error;

      toast({ title: "Success", description: "Benefit translations saved" });
      onSave?.();
      onClose();
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit Benefit Description</DialogTitle>
        </DialogHeader>

        {loading && !translations.en ? (
          <div className="py-8 flex justify-center"><Loader2 className="animate-spin" /></div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-4 mb-4">
              {LANGUAGES.map(lang => (
                <TabsTrigger key={lang.code} value={lang.code}>{lang.label}</TabsTrigger>
              ))}
            </TabsList>

            {LANGUAGES.map(lang => (
              <TabsContent key={lang.code} value={lang.code} className="space-y-4">
                <div className="space-y-2">
                  <Label>Description ({lang.code.toUpperCase()})</Label>
                  <Textarea 
                    value={translations[lang.code]?.description || ''} 
                    onChange={e => setTranslations(prev => ({ ...prev, [lang.code]: { ...prev[lang.code], description: e.target.value } }))}
                    placeholder="Enter benefit details..."
                    className="h-24"
                  />
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Save className="w-4 h-4 mr-2"/>}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BenefitTranslationEditor;