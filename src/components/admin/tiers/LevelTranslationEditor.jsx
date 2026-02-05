import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

const LevelTranslationEditor = ({ level, isOpen, onClose, onSave }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [translations, setTranslations] = useState({});
  const [activeTab, setActiveTab] = useState('en');

  useEffect(() => {
    const fetchTranslations = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('support_level_translations')
          .select('*')
          .eq('support_level_id', level.id);

        if (error) throw error;

        const transMap = {};
        LANGUAGES.forEach(lang => {
          const found = data.find(t => t.language_code === lang.code);
          transMap[lang.code] = {
            name: found?.name || (lang.code === 'en' ? level.slug : ''),
            description: found?.description || '',
            id: found?.id 
          };
        });
        setTranslations(transMap);
      } catch (err) {
        console.error(err);
        toast({ variant: "destructive", title: "Error", description: "Failed to load translations" });
      } finally {
        setLoading(false);
      }
    };

    if (isOpen && level) {
      fetchTranslations();
    }
  }, [isOpen, level, toast]); // Hook corregido

  const handleSave = async () => {
    setLoading(true);
    try {
      const upserts = Object.entries(translations).map(([code, data]) => ({
        support_level_id: level.id,
        language_code: code,
        name: data.name,
        description: data.description,
        ...(data.id ? { id: data.id } : {})
      }));

      const { error } = await supabase
        .from('support_level_translations')
        .upsert(upserts, { onConflict: 'support_level_id,language_code' });

      if (error) throw error;

      toast({ title: "Success", description: "Translations updated successfully" });
      onSave?.();
      onClose();
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const updateTrans = (field, value) => {
    setTranslations(prev => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        [field]: value
      }
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Level Translations: {level?.slug}</DialogTitle>
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
                  <Label>Level Name ({lang.code.toUpperCase()})</Label>
                  <Input 
                    value={translations[lang.code]?.name || ''} 
                    onChange={e => updateTrans('name', e.target.value)}
                    placeholder={`e.g. ${level?.slug}`}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description ({lang.code.toUpperCase()})</Label>
                  <Textarea 
                    value={translations[lang.code]?.description || ''} 
                    onChange={e => updateTrans('description', e.target.value)}
                    placeholder="Describe the perks of this tier..."
                    className="h-32"
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
            Save Translations
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LevelTranslationEditor;