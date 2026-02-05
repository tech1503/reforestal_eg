import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next'; 
import { Clock, CheckCircle, Ban } from 'lucide-react';

const FoundingPioneerNotification = ({ status, className = "" }) => {
    const { t } = useTranslation(); // Faltaba inicializar el hook

    // Configuración por defecto (Evaluación / Pendiente)
    let config = {
        icon: Clock,
        bg: "bg-blue-50 dark:bg-blue-900/20",
        border: "border-blue-100 dark:border-blue-800",
        text: "text-blue-800 dark:text-blue-200",
        iconColor: "text-blue-500",
        title: t('pioneer.notification.evaluation_title'),
        message: t('pioneer.notification.evaluation_message')
    };

    if (status === 'approved') {
        config = {
            icon: CheckCircle,
            bg: "bg-emerald-50 dark:bg-emerald-900/20",
            border: "border-emerald-100 dark:border-emerald-800",
            text: "text-emerald-800 dark:text-emerald-200",
            iconColor: "text-emerald-600",
            title: t('pioneer.notification.approved_title', 'Access Granted'),
            message: t('pioneer.notification.approved_message', 'Welcome to Founding Pioneer. Your participation and impact are being monitored.')
        };
    } else if (status === 'revoked' || status === 'rejected') {
        config = {
            icon: Ban,
            bg: "bg-red-50 dark:bg-red-900/20",
            border: "border-red-100 dark:border-red-800",
            text: "text-red-800 dark:text-red-200",
            iconColor: "text-red-500",
            title: t('pioneer.notification.revoked_title', 'Access Restricted'),
            message: t('pioneer.notification.revoked_message', 'Your access was not approved at this time. Thank you for your interest.')
        };
    }

    const Icon = config.icon;

    return (
        <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-start gap-4 p-4 rounded-xl border shadow-sm ${config.bg} ${config.border} ${className}`}
        >
            <div className={`p-2 rounded-full bg-white dark:bg-slate-950 shadow-sm ${config.iconColor}`}>
                <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1">
                <h4 className={`font-bold text-sm mb-1 ${config.text}`}>{config.title}</h4>
                <p className={`text-xs leading-relaxed opacity-90 ${config.text}`}>
                    {config.message}
                </p>
            </div>
        </motion.div>
    );
};

export default FoundingPioneerNotification;