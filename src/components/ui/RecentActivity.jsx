import React from 'react';
import { motion } from 'framer-motion';
import { TreePine, Coins, Users, Award, Clock } from 'lucide-react';

const RecentActivity = () => {
  const activities = [
    {
      id: 1,
      type: 'tree_planted',
      title: 'Trees Planted',
      description: '10 trees planted in Amazon rainforest',
      time: '2 hours ago',
      icon: TreePine,
      color: 'green'
    },
    {
      id: 2,
      type: 'credits_earned',
      title: 'Credits Earned',
      description: 'Completed daily quest: +25 credits',
      time: '5 hours ago',
      icon: Coins,
      color: 'blue'
    },
    {
      id: 3,
      type: 'referral',
      title: 'New Referral',
      description: 'Alice Johnson joined using your code',
      time: '1 day ago',
      icon: Users,
      color: 'purple'
    },
    {
      id: 4,
      type: 'achievement',
      title: 'Achievement Unlocked',
      description: 'Eco Warrior: 100 trees planted',
      time: '2 days ago',
      icon: Award,
      color: 'yellow'
    },
    {
      id: 5,
      type: 'credits_spent',
      title: 'Credits Exchanged',
      description: 'Purchased eco-friendly water bottle',
      time: '3 days ago',
      icon: Coins,
      color: 'red'
    }
  ];

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-green-100">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-forest">Recent Activity</h3>
          <p className="text-gray-600 text-sm">Your latest environmental actions</p>
        </div>
        <Clock className="w-5 h-5 text-gray-400" />
      </div>

      <div className="space-y-4">
        {activities.map((activity, index) => {
          const Icon = activity.icon;
          
          return (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className={`w-10 h-10 bg-${activity.color}-100 rounded-full flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-5 h-5 text-${activity.color}-600`} />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-forest">{activity.title}</p>
                <p className="text-sm text-gray-600">{activity.description}</p>
                <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-100">
        <button className="w-full text-center text-sm text-green-600 hover:text-green-700 font-medium">
          View All Activity
        </button>
      </div>
    </div>
  );
};

export default RecentActivity;