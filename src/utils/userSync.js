/**
 * Utility functions for User Synchronization
 */

/**
 * Merges Auth Users (from Supabase Admin API) and DB Profiles (from public.profiles table).
 * Creates a unified view of the user state, prioritizing Pivot Table roles if available.
 * 
 * @param {Array} authUsers - List of users from auth.users
 * @param {Array} dbProfiles - List of profiles from public.profiles
 * @returns {Array} - Merged user objects
 */
export const mergeAuthAndDbUsers = (authUsers, dbProfiles) => {
    const dbMap = new Map(dbProfiles.map(p => [p.id, p]));
    const authMap = new Map(authUsers.map(u => [u.id, u]));
    
    // Start with DB profiles as the base
    const merged = dbProfiles.map(profile => {
        const authUser = authMap.get(profile.id);
        
        // Determine Role Priority:
        // 1. Pivot Table (users_roles.roles.name)
        // 2. Profile Column (legacy/backup)
        // 3. Auth Metadata (fallback)
        let effectiveRole = profile.role || 'user';
        
        if (profile.users_roles && profile.users_roles.length > 0 && profile.users_roles[0].roles) {
            effectiveRole = profile.users_roles[0].roles.name;
        } else if (authUser?.user_metadata?.role) {
            effectiveRole = authUser.user_metadata.role;
        }

        return {
            ...profile,
            role: effectiveRole, // Normalized role
            // Merge Auth data
            last_sign_in_at: authUser?.last_sign_in_at || null,
            auth_email: authUser?.email,
            auth_created_at: authUser?.created_at,
            status: authUser ? 'active' : 'db_only_anomaly',
            is_synced: !!authUser
        };
    });

    // Find Auth-only users (Ghosts)
    authUsers.forEach(authUser => {
        if (!dbMap.has(authUser.id)) {
            merged.push({
                id: authUser.id,
                email: authUser.email,
                name: authUser.user_metadata?.name || 'Unknown (Auth Only)',
                role: authUser.user_metadata?.role || 'user',
                created_at: authUser.created_at,
                last_sign_in_at: authUser.last_sign_in_at,
                status: 'auth_only_anomaly',
                is_synced: false
            });
        }
    });

    // Sort by created_at desc
    return merged.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
};

export const getStatusColor = (status) => {
    switch (status) {
        case 'active': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
        case 'db_only_anomaly': return 'bg-amber-100 text-amber-800 border-amber-200';
        case 'auth_only_anomaly': return 'bg-purple-100 text-purple-800 border-purple-200';
        default: return 'bg-gray-100 text-gray-800';
    }
};

export const getStatusLabel = (status) => {
     switch (status) {
        case 'active': return 'Active';
        case 'db_only_anomaly': return 'Missing Auth';
        case 'auth_only_anomaly': return 'Missing Profile';
        default: return status;
    }
};