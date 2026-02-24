import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const AdminGamificationActionModal = ({ isOpen, onClose, actionToEdit, onSuccess }) => {
    const { toast } = useToast();
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        action_name: '',
        action_title: '',
        action_type: 'Custom',
        system_binding: 'custom',
        impact_credits_value: 0,
        description: '',
        admin_notes: '',
        trigger_event: '',
        is_active: true
    });

    const isBaseAction = actionToEdit && [
        'profile_updated', 'contribution_initial', 'contribution_upgrade', 
        'referral_completed', 'monthly_activity', 'initial_profile_quest'
    ].includes(actionToEdit.action_name);

    useEffect(() => {
        if (actionToEdit) {
            setFormData({
                action_name: actionToEdit.action_name,
                action_title: actionToEdit.action_title || '',
                action_type: actionToEdit.action_type || 'Custom',
                system_binding: actionToEdit.system_binding || 'custom',
                impact_credits_value: actionToEdit.impact_credits_value || 0,
                description: actionToEdit.description || '',
                admin_notes: actionToEdit.admin_notes || '',
                trigger_event: actionToEdit.trigger_event || '',
                is_active: actionToEdit.is_active
            });
        } else {
            setFormData({
                action_name: '',
                action_title: '',
                action_type: 'Custom',
                system_binding: 'custom',
                impact_credits_value: 0,
                description: '',
                admin_notes: '',
                trigger_event: '',
                is_active: true
            });
        }
    }, [actionToEdit, isOpen]);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        if (!formData.action_name || !formData.action_title) {
            return toast({ variant: "destructive", title: t('common.error'), description: "Name and Title are required." });
        }
        if (formData.impact_credits_value < 0) {
            return toast({ variant: "destructive", title: t('common.error'), description: "Credits cannot be negative." });
        }

        setLoading(true);
        try {
            const payload = { ...formData };
            let error;
            if (actionToEdit) {
                const { error: updateError } = await supabase
                    .from('gamification_actions')
                    .update(payload)
                    .eq('id', actionToEdit.id);
                error = updateError;
            } else {
                const { error: insertError } = await supabase
                    .from('gamification_actions')
                    .insert([payload]);
                error = insertError;
            }

            if (error) throw error;

            toast({ title: t('common.success'), description: `Action ${actionToEdit ? 'updated' : 'created'} successfully.` });
            onSuccess();
            onClose();
        } catch (err) {
            toast({ variant: "destructive", title: t('common.error'), description: err.message });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm(t('gamification_admin.action_modal.delete_warning', "Are you sure? This action cannot be undone and may affect historical logs display."))) return;
        setLoading(true);
        try {
            const { error } = await supabase.from('gamification_actions').delete().eq('id', actionToEdit.id);
            if (error) throw error;
            toast({ title: t('common.success'), description: "Action removed." });
            onSuccess();
            onClose();
        } catch (err) {
            toast({ variant: "destructive", title: t('common.error'), description: err.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{actionToEdit ? t('gamification_admin.action_modal.title_edit', 'Edit Action') : t('gamification_admin.action_modal.title_new', 'Create New Action')}</DialogTitle>
                    <DialogDescription>{t('gamification_admin.action_modal.desc', 'Configure scoring rules and trigger bindings.')}</DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>{t('gamification_admin.action_modal.fields.action_name', 'Action Name (Unique ID)')}</Label>
                            <Input 
                                value={formData.action_name} 
                                onChange={(e) => handleChange('action_name', e.target.value)} 
                                disabled={isBaseAction}
                                placeholder={t('gamification_admin.action_modal.fields.action_name_placeholder', 'e.g., custom_event_x')}
                            />
                            {isBaseAction && <p className="text-xs text-muted-foreground">{t('gamification_admin.action_modal.fields.action_name_desc', 'System action names cannot be changed.')}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label>{t('gamification_admin.action_modal.fields.display_title', 'Display Title')}</Label>
                            <Input 
                                value={formData.action_title} 
                                onChange={(e) => handleChange('action_title', e.target.value)} 
                                placeholder={t('gamification_admin.action_modal.fields.display_title_placeholder', 'e.g., Custom Event X')}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>{t('gamification_admin.action_modal.fields.type', 'Type')}</Label>
                            <Select 
                                value={formData.action_type} 
                                onValueChange={(val) => handleChange('action_type', val)}
                                disabled={isBaseAction}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Custom">Custom</SelectItem>
                                    <SelectItem value="Contribution">Contribution</SelectItem>
                                    <SelectItem value="Referral (MLM)">Referral (MLM)</SelectItem>
                                    <SelectItem value="Profile">Profile</SelectItem>
                                    <SelectItem value="Gamification">Gamification</SelectItem>
                                    <SelectItem value="Quest">Quest</SelectItem>
                                    <SelectItem value="Mission Quest">Mission Quest</SelectItem>
                                    <SelectItem value="Genesis Quest">Genesis Quest</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>{t('gamification_admin.action_modal.fields.system_binding', 'System Binding')}</Label>
                            <Select 
                                value={formData.system_binding} 
                                onValueChange={(val) => handleChange('system_binding', val)}
                                disabled={isBaseAction}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="custom">Custom</SelectItem>
                                    <SelectItem value="contribution">Contribution</SelectItem>
                                    <SelectItem value="referral_mlm">Referral MLM</SelectItem>
                                    <SelectItem value="profile">Profile</SelectItem>
                                    <SelectItem value="gamification">Gamification</SelectItem>
                                    <SelectItem value="quest">Quest</SelectItem>
                                    <SelectItem value="mission_quest">Mission Quest</SelectItem>
                                    <SelectItem value="genesis_quest">Genesis Quest</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>{t('dashboard.impact_credits')} Value</Label>
                            <Input 
                                type="number" 
                                min="0" 
                                value={formData.impact_credits_value} 
                                onChange={(e) => handleChange('impact_credits_value', e.target.value)} 
                            />
                        </div>
                        <div className="space-y-2 flex flex-col justify-end pb-2">
                            <div className="flex items-center space-x-2">
                                <Switch 
                                    checked={formData.is_active} 
                                    onCheckedChange={(checked) => handleChange('is_active', checked)}
                                />
                                <Label>{t('gamification_admin.action_modal.fields.active', 'Action Active')}</Label>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>{t('gamification_admin.action_modal.fields.description', 'Description')}</Label>
                        <Textarea 
                            value={formData.description} 
                            onChange={(e) => handleChange('description', e.target.value)} 
                            placeholder={t('gamification_admin.action_modal.fields.description_placeholder', 'Public facing description or tooltip...')}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>{t('gamification_admin.action_modal.fields.trigger', 'Trigger Event (Optional)')}</Label>
                        <Input 
                            value={formData.trigger_event} 
                            onChange={(e) => handleChange('trigger_event', e.target.value)} 
                            placeholder={t('gamification_admin.action_modal.fields.trigger_placeholder', 'e.g., user_signup')}
                        />
                        <p className="text-xs text-muted-foreground">{t('gamification_admin.action_modal.fields.trigger_desc', 'Technical hook identifier for external systems.')}</p>
                    </div>

                    <div className="space-y-2">
                        <Label>{t('gamification_admin.action_modal.fields.admin_notes', 'Admin Notes')}</Label>
                        <Textarea 
                            value={formData.admin_notes} 
                            onChange={(e) => handleChange('admin_notes', e.target.value)} 
                            placeholder={t('gamification_admin.action_modal.fields.admin_notes_placeholder', 'Internal notes...')}
                        />
                    </div>
                </div>

                <DialogFooter className="justify-between">
                    <div>
                        {actionToEdit && !isBaseAction && (
                            <Button variant="destructive" onClick={handleDelete} disabled={loading}>{t('common.cancel').replace('Cancel', 'Delete')}</Button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onClose} disabled={loading}>{t('common.cancel')}</Button>
                        <Button onClick={handleSave} disabled={loading}>
                            {loading && <Loader2 className="w-4 h-4 animate-spin mr-2"/>} {t('common.save')}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default AdminGamificationActionModal;