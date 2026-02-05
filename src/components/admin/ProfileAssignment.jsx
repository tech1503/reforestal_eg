import React, { useState, useEffect, useCallback } from 'react';
import { Search, Award, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Leaf, Shield, Users } from 'lucide-react';

const ProfileAssignment = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const profileIcons = {
    Lena: Leaf,
    Markus: Shield,
    David: Users,
  };

  const profileColors = {
    Lena: 'green',
    Markus: 'blue',
    David: 'orange',
  };

  // ENVUELTO EN useCallback PARA EVITAR EL WARNING DEL useEffect
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    // Join user_profiles to see current assignment
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email, user_profiles(profile)')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch users' });
    } else {
      // Map data to flatten the structure for display
      const mappedUsers = (data || []).map(u => ({
        ...u,
        genesis_profile: u.user_profiles?.[0]?.profile || null
      }));
      setUsers(mappedUsers);
    }
    setLoading(false);
  }, [toast]); // Dependencia necesaria

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]); // Ahora es seguro incluirla

  const handleAssignProfile = async (userId, profileName) => {
    // Safer approach: Delete existing assignment for this user then insert new
    await supabase.from('user_profiles').delete().eq('user_id', userId);
    
    const { error } = await supabase
      .from('user_profiles')
      .insert({ user_id: userId, profile: profileName });

    if (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to assign profile' });
    } else {
      toast({ title: 'Success', description: `Profile ${profileName} assigned successfully!` });
      fetchUsers();
    }
  };

  const filteredUsers = users.filter(u =>
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl p-6 border border-teal-200">
        <h3 className="text-lg font-semibold text-teal-900 mb-2 flex items-center">
          <Award className="w-5 h-5 mr-2" />
          Genesis Quest Profile Assignment
        </h3>
        <p className="text-teal-700 text-sm">
          Assign Genesis Quest profiles (Lena, Markus, David) to users manually. This updates the <code>user_profiles</code> table.
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input
          type="text"
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-4 font-semibold text-gray-700">User</th>
                <th className="text-left p-4 font-semibold text-gray-700">Current Profile</th>
                <th className="text-right p-4 font-semibold text-gray-700">Assign Profile</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan="3" className="text-center p-8 text-gray-500"><Loader className="animate-spin mx-auto"/></td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan="3" className="text-center p-8 text-gray-500">No users found</td></tr>
              ) : (
                filteredUsers.map((user) => {
                  const ProfileIcon = user.genesis_profile ? profileIcons[user.genesis_profile] : null;
                  const color = user.genesis_profile ? profileColors[user.genesis_profile] : 'gray';
                  
                  return (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="p-4">
                        <div>
                          <p className="font-medium">{user.name || 'N/A'}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        {user.genesis_profile ? (
                          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-${color}-100 text-${color}-800`}>
                            {ProfileIcon && <ProfileIcon className="w-4 h-4 mr-1" />}
                            {user.genesis_profile}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">Not assigned</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end gap-2">
                          {['Lena', 'Markus', 'David'].map(profile => {
                            const Icon = profileIcons[profile];
                            const isActive = user.genesis_profile === profile;
                            return (
                              <Button
                                key={profile}
                                onClick={() => handleAssignProfile(user.id, profile)}
                                variant={isActive ? 'default' : 'outline'}
                                size="sm"
                                className={isActive ? `bg-${profileColors[profile]}-500 text-white` : ''}
                              >
                                <Icon className="w-4 h-4 mr-1" />
                                {profile}
                              </Button>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProfileAssignment;