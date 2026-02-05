import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next'; // IMPORTADO
import { Check, Crown, Leaf, Zap, Info, Star, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const MembershipTimeline = ({ currentTier }) => {
  const tiers = [
    {
      name: 'Explorer',
      duration: 'Months 0-12',
      description: 'Your journey begins! All earned credits are in a 12-month cliff, building a strong foundation for your impact.',
      icon: Leaf,
      status: 'in_cliff'
    },
    {
      name: 'Designer',
      duration: 'Months 13-48',
      description: 'Your impact takes shape. 25% of credits vest at month 12, with the rest vesting monthly for 36 months.',
      icon: Star,
      status: 'vesting_linearly'
    },
    {
      name: 'Ambassador',
      duration: 'Month 49+',
      description: 'You are a true leader. All credits are fully vested, unlocking maximum impact and exclusive rewards.',
      icon: Award,
      status: 'fully_vested'
    }
  ];

  const tierOrder = ['Explorer', 'Designer', 'Ambassador'];
  const currentTierIndex = tierOrder.indexOf(currentTier);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.7 }}
      className="bg-white rounded-xl p-6 shadow-sm border border-green-100"
    >
      <h3 className="text-lg font-semibold text-forest mb-6 text-center">Your Membership Journey</h3>
      <div className="relative flex justify-between items-start pt-8">
        {/* Timeline line */}
        <div className="absolute top-10 left-8 right-8 h-1 bg-gray-200">
          <motion.div 
            className="h-1 bg-green-500"
            initial={{ width: 0 }}
            animate={{ width: `${(currentTierIndex / (tiers.length - 1)) * 100}%` }}
            transition={{ duration: 1, delay: 1 }}
          />
        </div>

        {tiers.map((tier, index) => {
          const isCompleted = index < currentTierIndex;
          const isCurrent = index === currentTierIndex;
          const Icon = tier.icon;

          return (
            <div key={tier.name} className="relative flex flex-col items-center text-center w-1/3 px-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 transition-all duration-500 ${
                isCompleted ? 'bg-green-500 text-white' : 
                isCurrent ? 'bg-green-500 text-white ring-4 ring-green-200' : 
                'bg-gray-200 text-gray-500'
              }`}>
                {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
              </div>
              <h4 className="font-bold text-forest mt-3 text-md">{tier.name}</h4>
              <p className="text-sm font-medium text-gray-500">{tier.duration}</p>
              <p className="text-xs text-gray-600 mt-2">{tier.description}</p>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};


const SubscriptionSection = () => {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const { t } = useTranslation(); // HOOK
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  const plans = [
    {
      id: 'roots',
      name: 'Roots',
      price: '€4.99',
      priceNum: 4.99,
      period: '/month',
      area: '1 m²',
      credits: 10000,
      icon: Leaf,
      color: 'green',
      features: [
        '1 m² reforested for you',
        '10,000 Impact Credits',
        'Basic carbon tracking',
        'Community access'
      ],
      stripePriceId: 'price_roots_placeholder'
    },
    {
      id: 'tree',
      name: 'Tree',
      price: '€14.99',
      priceNum: 14.99,
      period: '/month',
      area: '4 m²',
      credits: 15000,
      icon: Crown,
      color: 'blue',
      popular: true,
      features: [
        '4 m² reforested for you',
        '15,000 Impact Credits',
        'Advanced carbon tracking',
        'Priority community access',
        'Referral bonuses'
      ],
      stripePriceId: 'price_tree_placeholder'
    },
    {
      id: 'forest',
      name: 'Forest',
      price: '€49.99',
      priceNum: 49.99,
      period: '/month',
      area: '12 m²',
      credits: 25000,
      icon: Zap,
      color: 'purple',
      features: [
        '12 m² reforested for you',
        '25,000 Impact Credits',
        'Complete carbon analytics',
        'VIP community access',
        'Quest multipliers'
      ],
      stripePriceId: 'price_forest_placeholder'
    },
    {
      id: 'ecosystem',
      name: 'Ecosystem',
      price: '€149.99',
      priceNum: 149.99,
      period: '/month',
      area: '30 m²',
      credits: 35000,
      icon: Zap,
      color: 'amber',
      features: [
        '30 m² reforested for you',
        '35,000 Impact Credits',
        'Full analytics & API access',
        'Custom projects',
        'Maximum referral bonuses'
      ],
      stripePriceId: 'price_ecosystem_placeholder'
    }
  ];

  useEffect(() => {
    const fetchSubscription = async () => {
      if (!user) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['active', 'trialing'])
        .single();

      if (data) {
        setCurrentSubscription(data);
      }
      
      if (error && error.code !== 'PGRST116') {
        toast({ variant: "destructive", title: t('common.error'), description: "Could not fetch subscription." });
      }
      setLoading(false);
    };

    fetchSubscription();
  }, [user, toast, t]);

  const handleSubscribe = (plan) => {
    toast({
      title: "🚧 Stripe Checkout",
      description: t('common.feature_not_implemented')
    });
  };

  const handleManageSubscription = () => {
    toast({
      title: "🚧 Manage Subscription",
      description: t('common.feature_not_implemented')
    });
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <h2 className="text-3xl font-bold text-forest mb-4">Memberships & Subscriptions</h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Choose a plan to start your impact journey and watch your membership level grow over time.
        </p>
      </motion.div>

      <MembershipTimeline currentTier={profile?.membership_tier || 'Explorer'} />

      {loading ? (
        <div className="text-center p-6">{t('common.loading')}...</div>
      ) : currentSubscription ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-green-50 border border-green-200 rounded-xl p-6"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-forest">Current Plan: <span className="capitalize">{currentSubscription.plan_type}</span></h3>
              <p className="text-green-600">Status: <span className="capitalize">{currentSubscription.status}</span></p>
              {currentSubscription.end_date && <p className="text-sm text-gray-600">Next billing: {new Date(currentSubscription.end_date).toLocaleDateString()}</p>}
            </div>
            <Button 
              onClick={handleManageSubscription}
              variant="outline" 
              className="border-green-300 text-green-700 hover:bg-green-100 mt-4 sm:mt-0"
            >
              Manage Subscription
            </Button>
          </div>
        </motion.div>
      ) : (
         <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center"
        >
           <h3 className="text-lg font-semibold text-blue-800">You are not subscribed to any plan.</h3>
           <p className="text-blue-600">Choose a plan below to start your impact journey!</p>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan, index) => {
          const Icon = plan.icon;
          
          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
              className={`relative bg-white rounded-xl p-6 border-2 flex flex-col transition-all duration-300 card-hover ${
                plan.popular 
                  ? 'border-green-500 shadow-lg' 
                  : 'border-gray-200 hover:border-green-300'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-green-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <div className={`w-16 h-16 mx-auto mb-4 rounded-full bg-${plan.color}-100 flex items-center justify-center`}>
                  <Icon className={`w-8 h-8 text-${plan.color}-600`} />
                </div>
                <h3 className="text-xl font-bold text-forest mb-2">{plan.name}</h3>
                <div className="flex items-baseline justify-center">
                  <span className="text-3xl font-bold text-forest">{plan.price}</span>
                  <span className="text-gray-600 ml-1">{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-3 mb-6 flex-grow">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start">
                    <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-1" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => handleSubscribe(plan)}
                className={`w-full mt-auto ${
                  plan.popular 
                    ? 'btn-primary text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                disabled={currentSubscription?.plan_type === plan.id}
              >
                {currentSubscription?.plan_type === plan.id ? 'Current Plan' : 'Subscribe Now'}
              </Button>
            </motion.div>
          );
        })}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="bg-white rounded-xl p-6 shadow-sm border border-green-100"
      >
        <h3 className="text-lg font-semibold text-forest mb-4 flex items-center"><Info className="w-5 h-5 mr-2 text-blue-500"/> Impact Credits Vesting Explained</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-forest mb-2">48-Month Vesting Schedule</h4>
            <p className="text-gray-600 text-sm mb-4">
              Your Impact Credits vest over time to ensure long-term environmental commitment.
            </p>
            <ul className="space-y-2 text-sm">
                <li className="flex items-start"><strong className="w-28 font-semibold">Months 0-12:</strong> <span className="text-gray-600">In Cliff (0% vested)</span></li>
                <li className="flex items-start"><strong className="w-28 font-semibold">At Month 12:</strong> <span className="text-gray-600">25% of credits vest</span></li>
                <li className="flex items-start"><strong className="w-28 font-semibold">Months 12-48:</strong> <span className="text-gray-600">75% vests linearly (monthly)</span></li>
                <li className="flex items-start"><strong className="w-28 font-semibold">At Month 48:</strong> <span className="text-gray-600">100% fully vested</span></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-forest mb-2">Cancellation Rules (Leaver Clauses)</h4>
             <ul className="space-y-2 text-sm">
                <li className="flex items-start"><strong className="w-32 font-semibold text-red-600">During Cliff:</strong> <span className="text-gray-600">All credits from that batch are forfeited.</span></li>
                <li className="flex items-start"><strong className="w-32 font-semibold text-green-600">After Cliff:</strong> <span className="text-gray-600">Keep all vested credits, forfeit unvested.</span></li>
                <li className="flex items-start"><strong className="w-32 font-semibold text-blue-600">Good Leaver:</strong> <span className="text-gray-600">100% of credits vest immediately.</span></li>
                <li className="flex items-start"><strong className="w-32 font-semibold text-red-700">Bad Leaver:</strong> <span className="text-gray-600">All credits (vested and unvested) are forfeited.</span></li>
            </ul>
          </div>
        </div>
         <p className="text-xs text-gray-500 mt-4 text-center">A daily background process updates your vested balance automatically based on this schedule.</p>
      </motion.div>
    </div>
  );
};

export default SubscriptionSection;