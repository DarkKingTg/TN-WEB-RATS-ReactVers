import { useState, useEffect } from 'react';
import { 
  Search, User, Mail, Smartphone, Shield, 
  Ticket, MoreVertical, Edit3, Trash2, Check,
  AlertCircle
} from 'lucide-react';
import { db } from '../../../config/firebase';
import { 
  collection, query, getDocs, orderBy
} from 'firebase/firestore';
import { useAuth } from '../../../context/AuthContext';
import { useDashboard } from '../../../context/DashboardContext';
import { canManageRole, getRoleRank, normalizeRole } from '../../../utils/systemRules';
import { apiRequest } from '../../../services/apiClient';

const UsersView = () => {
  const { user: currentUser, userData: currentUserData } = useAuth();
  const { searchQuery, setSearchQuery } = useDashboard();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "users"), orderBy("createdAt", "desc")));
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handlePromote = async (uid, newRole) => {
    if (!currentUser?.uid) return;

    // Rule 1: Cannot change own role
    if (uid === currentUser.uid) {
      alert('You cannot change your own role.');
      return;
    }

    const targetUser = users.find((u) => u.id === uid);
    if (!targetUser) return;

    const actorRole = normalizeRole(currentUserData?.role);
    const targetCurrentRole = normalizeRole(targetUser.role);

    // Rule 2: Frontend rank check (backend also validates — this is UX protection)
    if (!canManageRole(actorRole, targetCurrentRole)) {
      alert(`You do not have permission to manage a ${targetCurrentRole}.`);
      return;
    }

    // Rule 3: Cannot assign a role equal to or above your own rank
    if (getRoleRank(newRole) >= getRoleRank(actorRole)) {
      alert(`You cannot assign the ${newRole} role.`);
      return;
    }

    // Confirm before changing
    const confirmed = window.confirm(
      `Change ${targetUser.name || targetUser.email}'s role from ${targetCurrentRole} to ${newRole}?`
    );
    if (!confirmed) return;

    try {
      // Send to BACKEND — not directly to Firestore
      await apiRequest('/users/set-role', {
        method: 'POST',
        authMode: 'required',
        body: { targetUid: uid, newRole },
      });

      // Update local state only after backend confirms
      setUsers((prev) =>
        prev.map((u) => (u.id === uid ? { ...u, role: newRole } : u))
      );

    } catch (err) {
      console.error('Role update failed:', err);
      alert(err.message || 'Failed to update role. Please try again.');
    }
  };

  const filteredUsers = users.filter(u => {
    const matchSearch = !searchQuery || 
      (u.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
      (u.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchRole = !roleFilter || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const getRoleColor = (role) => {
    switch(role) {
      case 'owner': return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'admin': return 'text-secondary-dark bg-secondary-dark/10 border-blue-500/20';
      case 'worker': return 'text-cyan-primary bg-cyan-primary/10 border-cyan-primary/20';
      case 'client': return 'text-white/40 bg-white/5 border-white/10';
      default: return 'text-white/40 bg-white/5 border-white/10';
    }
  };

  // Returns assignable roles given actor role AND target's current role
  const getAssignableRoles = (actorRole, targetCurrentRole) => {
    // Actor must outrank target's current role
    if (!canManageRole(actorRole, targetCurrentRole)) {
      return []; // Actor cannot manage this user at all
    }

    const ROLE_HIERARCHY_LIST = ['client', 'worker', 'admin'];
    const actorRank = getRoleRank(actorRole);

    // Actor can only assign roles strictly below their own rank
    return ROLE_HIERARCHY_LIST.filter(
      (role) => getRoleRank(role) < actorRank
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black text-white italic">User <span className="text-cyan-primary not-italic font-mono uppercase text-sm tracking-[0.2em] ml-2">Management</span></h2>
          <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest mt-1">Promote roles, view team IDs, manage referral eligibility</p>
        </div>
        <div className="flex flex-wrap gap-3">
           <div className="hidden md:block relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-cyan-primary transition-colors" size={16} />
              <input 
                type="text" 
                placeholder="Name or email..." 
                className="bg-[#1B241A] border border-white/5 hover:border-white/10 focus:border-cyan-primary outline-none px-10 py-2.5 rounded-xl text-xs w-64 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
           </div>
           <select 
             className="bg-[#1B241A] border border-white/5 px-4 py-2.5 rounded-xl text-[10px] font-mono uppercase tracking-widest outline-none focus:border-cyan-primary"
             value={roleFilter}
             onChange={(e) => setRoleFilter(e.target.value)}
           >
              <option value="">All Roles</option>
              <option value="client">Client</option>
              <option value="worker">Worker</option>
              <option value="admin">Admin</option>
              <option value="owner">Owner</option>
           </select>
        </div>
      </div>

      <div className="bg-[#1B241A] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white/2 border-b border-white/5 text-[10px] font-mono uppercase tracking-widest text-white/30">
              <tr>
                <th className="px-6 py-5">Identities</th>
                <th className="px-6 py-5">Communication</th>
                <th className="px-6 py-5">Status / Role</th>
                <th className="px-6 py-5">Market Token</th>
                <th className="px-6 py-5">Discount</th>
                <th className="px-6 py-5">Hierarchy Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan="6" className="px-6 py-20 text-center text-white/20 font-mono text-xs animate-pulse tracking-[0.2em] uppercase">Fetching Global Registry...</td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan="6" className="px-6 py-20 text-center text-white/20 font-mono text-xs uppercase tracking-widest italic">No search results found</td></tr>
              ) : (
                filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-white/1 transition-colors group">
                    <td className="px-6 py-4">
                       <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs border ${getRoleColor(u.role)}`}>
                             {u.name?.charAt(0) || '?'}
                          </div>
                          <div>
                             <div className="text-sm font-bold text-white group-hover:text-cyan-primary transition-colors">{u.name || "Anonymous User"}</div>
                             <div className="text-[10px] text-white/20 font-mono">ID: {u.id.slice(0, 12)}...</div>
                          </div>
                       </div>
                    </td>
                    <td className="px-6 py-4">
                       <div className="text-sm flex items-center gap-2 text-white/60"><Mail size={12} className="text-white/20" /> {u.email}</div>
                       <div className="text-[10px] flex items-center gap-2 text-white/40 font-mono mt-1"><Smartphone size={12} className="text-white/20" /> {u.phone || "No phone"}</div>
                    </td>
                    <td className="px-6 py-4">
                       <span className={`px-2.5 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest ${getRoleColor(u.role)}`}>
                         {u.role || 'customer'}
                       </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-[10px] tracking-tighter">
                       {u.referralCode ? (
                         <span className="bg-primary-dark border border-white/5 px-2 py-1 rounded-md text-cyan-primary opacity-80">{u.referralCode}</span>
                       ) : (
                         <span className="text-white/10 italic">unassigned</span>
                       )}
                    </td>
                    <td className="px-6 py-4 font-black italic text-teal-primary text-xs">
                       {u.discountPercent || 0}%
                    </td>
                    <td className="px-6 py-4">
                       {(() => {
                         const actorRole = normalizeRole(currentUserData?.role);
                         const targetRole = normalizeRole(u.role);
                         const assignable = getAssignableRoles(actorRole, targetRole);
                         const canManage = canManageRole(actorRole, targetRole) && u.id !== currentUser.uid;

                         return (
                           <select
                             disabled={!canManage}
                             className="bg-[#2F5E22] border border-white/10 rounded-lg px-3 py-1.5 text-[9px] font-mono uppercase tracking-widest outline-none focus:border-cyan-primary cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed"
                             value={u.role}
                             onChange={(e) => handlePromote(u.id, e.target.value)}
                           >
                             <option value={u.role}>{u.role}</option>
                             {assignable
                               .filter((r) => r !== u.role)
                               .map((r) => (
                                 <option key={r} value={r}>{r}</option>
                               ))}
                           </select>
                         );
                       })()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UsersView;
