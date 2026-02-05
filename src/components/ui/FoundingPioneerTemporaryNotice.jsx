
import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Clock } from 'lucide-react';
import FoundingPioneerEvaluationIcon from './FoundingPioneerEvaluationIcon';

const FoundingPioneerTemporaryNotice = ({ status = 'pending' }) => {
  const isApproved = status === 'approved';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-xl border p-4 mb-6 shadow-sm ${
        isApproved 
          ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-100' 
          : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100'
      }`}
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
            <FoundingPioneerEvaluationIcon className="w-10 h-10" />
        </div>
        
        <div className="flex-1">
           <h4 className={`font-bold text-sm mb-1 ${isApproved ? 'text-emerald-800' : 'text-blue-800'}`}>
               {isApproved ? 'Access Granted (Evaluation Period)' : 'Access Under Evaluation'}
           </h4>
           <p className={`text-xs leading-relaxed ${isApproved ? 'text-emerald-600' : 'text-blue-600'}`}>
              {isApproved 
                ? "Your Founding Pioneer status is active but subject to ongoing performance review. Maintain high activity to secure your spot in the top 100."
                : "Your application to the Founding Pioneer program is currently being reviewed by our administration team. Your platform activity and contributions will determine your eligibility."
              }
           </p>
           
           <div className="mt-3 flex items-center gap-2 text-[10px] uppercase tracking-wider font-semibold opacity-70">
              <Clock className="w-3 h-3" />
              <span>Review in progress</span>
           </div>
        </div>
      </div>
    </motion.div>
  );
};

export default FoundingPioneerTemporaryNotice;
