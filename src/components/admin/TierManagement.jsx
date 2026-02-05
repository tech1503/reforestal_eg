import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Layers, Users } from 'lucide-react';
import SupportLevelsManager from './tiers/SupportLevelsManager';
import UserTierAssignmentView from './tiers/UserTierAssignmentView';

const TierManagement = () => {
  return (
    <div className="space-y-6">
       <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Tiers & Benefits</h2>
            <p className="text-slate-500">Manage support levels, multilingual translations, and user assignments.</p>
       </div>

       <Tabs defaultValue="levels" className="space-y-6">
           <TabsList>
               <TabsTrigger value="levels" className="px-4"><Layers className="w-4 h-4 mr-2"/> Levels & Benefits</TabsTrigger>
               <TabsTrigger value="assignments" className="px-4"><Users className="w-4 h-4 mr-2"/> User Assignments</TabsTrigger>
           </TabsList>

           <TabsContent value="levels">
               <Card>
                   <CardHeader>
                       <CardTitle>Support Levels</CardTitle>
                       <CardDescription>Configure tiers and their associated benefits across all languages.</CardDescription>
                   </CardHeader>
                   <CardContent>
                       <SupportLevelsManager />
                   </CardContent>
               </Card>
           </TabsContent>

           <TabsContent value="assignments">
               <Card>
                   <CardHeader>
                       <CardTitle>Global Assignments</CardTitle>
                       <CardDescription>View and manage tier assignments for all users.</CardDescription>
                   </CardHeader>
                   <CardContent>
                       <UserTierAssignmentView />
                   </CardContent>
               </Card>
           </TabsContent>
       </Tabs>
    </div>
  );
};

export default TierManagement;