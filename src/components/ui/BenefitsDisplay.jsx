import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import PropTypes from 'prop-types';
import { getBenefitIcon } from '@/components/Icons/CustomIcons';
import { animations } from '@/styles/designSystem'; // Se eliminó 'theme'

const BenefitsDisplay = ({ benefits, tierName, loading }) => {
  // Logs eliminados para producción, solo mantener si es necesario debug
  // React.useEffect(() => { ... }, [benefits, tierName]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-accent/20 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!benefits || benefits.length === 0) {
    return (
      <Card className="border-dashed bg-accent/10 border-border">
        <CardContent className="pt-6 text-center text-muted-foreground py-8">
          <p>No specific benefits active.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {tierName && (
          <motion.div 
            key="tier-header" // CLAVE AÑADIDA
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 mb-6"
          >
            <div className="h-px bg-gradient-to-r from-primary to-transparent flex-1" />
            <span className="text-xs font-bold uppercase tracking-widest text-primary">
              {tierName} Rewards
            </span>
          </motion.div>
        )}
      </AnimatePresence>
      
      <motion.div 
        variants={animations.container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        {benefits.map((benefit, index) => (
          <motion.div 
            key={benefit.id || `benefit-${index}`} // CLAVE MÁS ROBUSTA
            variants={animations.item}
            className={`
              relative group flex items-start gap-4 p-4 rounded-xl border border-border bg-card
              transition-all duration-300 hover:shadow-lg hover:border-primary/30 hover:-translate-y-1
            `}
          >
            <div className="relative p-2.5 rounded-xl bg-accent group-hover:bg-primary/10 transition-colors duration-300">
              {/* Pass icon_name if available, otherwise fallback to description mapping */}
              {getBenefitIcon(benefit.translated_desc, benefit.benefit_type, benefit.icon_name)}
            </div>
            
            <div className="flex-1">
              <h4 className="font-semibold text-foreground text-sm leading-snug group-hover:text-primary transition-colors">
                {benefit.translated_desc}
              </h4>
              <div className="flex items-center gap-2 mt-2">
                <Badge 
                  variant="outline" 
                  className={`
                    text-[10px] uppercase tracking-wider border-0 px-1.5 py-0.5
                    ${benefit.benefit_type === 'physical' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 
                      benefit.benefit_type === 'experience' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'bg-primary/10 text-primary'}
                  `}
                >
                  {benefit.benefit_type}
                </Badge>
              </div>
            </div>
            
            {/* Decoration */}
            <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-bl from-accent/20 to-transparent rounded-tr-xl -z-10 group-hover:from-primary/10 transition-all opacity-50" />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

BenefitsDisplay.propTypes = {
  benefits: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string,
    benefit_type: PropTypes.string,
    icon_name: PropTypes.string,
    translated_desc: PropTypes.string
  })),
  tierName: PropTypes.string,
  loading: PropTypes.bool
};

export default BenefitsDisplay;