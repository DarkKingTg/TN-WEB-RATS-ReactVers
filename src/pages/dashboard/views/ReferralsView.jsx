import { useState, useEffect } from 'react';
import { 
  Ticket, User, Clock, CheckCircle, 
  ChevronRight, TrendingUp, HelpCircle, Plus,
  ShieldCheck, Loader2, X
} from 'lucide-react';
import { db } from '../../../config/firebase';
import { collection, getDocs, doc, getDoc, setDoc, serverTimestamp, query, where, limit } from 'firebase/firestore';
import { useAuth } from '../../../context/AuthContext';
import { makeReferralCode, ROLE_REFERRAL_CONFIG, STAFF_ROLES } from '../../../utils/systemRules';

const ReferralsView = () => {
  const { user: currentUser, userData: currentUserData } = useAuth();
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ownerNames, setOwnerNames] = useState({});
  
  // Create Form State
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    targetEmail: '',
    role: 'worker',
    customDiscount: ''
  });
  const [formFeedback, setFormDataFeedback] = useState({ type: '', msg: '' });

  const isOwner = currentUserData?.role === 'owner';

  useEffect(() => {
    fetchCodes();
  }, []);

  const fetchCodes = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "referralCodes"));
      const codeData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setCodes(codeData);
      
      // Fetch owners
      const uids = [...new Set(codeData.map(c => c.ownerUid))].filter(Boolean);
      const names = {};
      await Promise.all(uids.map(async uid => {
        const uSnap = await getDoc(doc(db, "users", uid));
        names[uid] = uSnap.exists() ? uSnap.data().name : 'System Generated';
      }));
      setOwnerNames(names);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCode = async (e) => {
    e.preventDefault();
    if (!isOwner) return;
    
    setCreating(true);
    setFormDataFeedback({ type: '', msg: '' });

    try {
      let ownerUid = 'system';
      let ownerName = 'Manual Protocol';

      // If target email is provided, find the user
      if (formData.targetEmail) {
        const uQuery = query(
          collection(db, "users"), 
          where("email", "==", formData.targetEmail.toLowerCase().trim()),
          limit(1)
        );
        const uSnap = await getDocs(uQuery);
        if (uSnap.empty) {
          throw new Error("No user found with that email address.");
        }
        ownerUid = uSnap.docs[0].id;
        ownerName = uSnap.docs[0].data().name;
      }

      const tier = ROLE_REFERRAL_CONFIG[formData.role] || ROLE_REFERRAL_CONFIG.worker;
      const discount = formData.customDiscount ? Number(formData.customDiscount) : tier.pct;
      const newCode = makeReferralCode();

      await setDoc(doc(db, "referralCodes", newCode), {
        ownerUid,
        role: formData.role,
        discountPercent: discount,
        timesUsed: 0,
        createdAt: serverTimestamp(),
        manualCreation: true,
        createdBy: currentUser.uid
      });

      // Update user if we found one
      if (ownerUid !== 'system') {
        const userRef = doc(db, "users", ownerUid);
        await setDoc(userRef, {
          referralCode: newCode,
          discountPercent: discount
        }, { merge: true });
      }

      setFormDataFeedback({ type: 'success', msg: `Token ${newCode} deployed successfully.` });
      setTimeout(() => {
        setShowCreate(false);
        setFormData({ targetEmail: '', role: 'worker', customDiscount: '' });
        setFormDataFeedback({ type: '', msg: '' });
        fetchCodes();
      }, 2000);

    } catch (err) {
      setFormDataFeedback({ type: 'error', msg: err.message || "Failed to generate token." });
    } finally {
      setCreating(false);
    }
  };

  const getRoleColor = (role) => {
    switch(role) {
      case 'owner': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'admin': return 'text-secondary-dark bg-secondary-dark/10 border-blue-500/20';
      case 'worker': return 'text-cyan-primary bg-cyan-primary/10 border-cyan-primary/20';
      default: return 'text-white/40 bg-white/5 border-white/10';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black text-white italic">Referral <span className="text-cyan-primary not-italic font-mono uppercase text-sm tracking-[0.2em] ml-2">Registry</span></h2>
          <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest mt-1">Live tracking of active discount tokens and distribution analytics</p>
        </div>
        
        <div className="flex items-center gap-4">
          {isOwner && (
            <button 
              onClick={() => setShowCreate(!showCreate)}
              className="bg-cyan-primary/10 border border-cyan-primary/20 hover:bg-cyan-primary/20 text-cyan-primary px-5 py-2.5 rounded-xl text-[10px] font-mono uppercase tracking-widest transition-all flex items-center gap-2"
            >
              {showCreate ? <X size={14} /> : <Plus size={14} />}
              {showCreate ? 'Close Terminal' : 'Generate Token'}
            </button>
          )}
          
          <div className="hidden lg:flex bg-[#1B241A] border border-white/5 px-6 py-3 rounded-2xl items-center gap-6 divide-x divide-white/5 shadow-xl">
             <div className="flex items-center gap-3">
                <div className="text-xl font-black text-cyan-primary font-mono">{codes.length}</div>
                <div className="text-[8px] font-mono uppercase tracking-[0.2em] text-white/20">Active<br/>Tokens</div>
             </div>
             <div className="flex items-center gap-3 pl-6">
                <div className="text-xl font-black text-teal-primary font-mono">{codes.reduce((acc, c) => acc + (c.timesUsed || 0), 0)}</div>
                <div className="text-[8px] font-mono uppercase tracking-[0.2em] text-white/20">Total<br/>Conversions</div>
             </div>
          </div>
        </div>
      </div>

      {/* Manual Creation Form */}
      {showCreate && (
        <div className="bg-[#1B241A] border border-cyan-primary/20 rounded-3xl p-8 shadow-2xl animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3 mb-6">
            <ShieldCheck className="text-cyan-primary" size={20} />
            <h3 className="text-sm font-black text-white uppercase tracking-widest">Manual Token Deployment</h3>
          </div>
          
          <form onSubmit={handleCreateCode} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            <div className="space-y-2">
              <label className="text-[9px] font-mono uppercase text-white/30 ml-1">Target Member Email (Optional)</label>
              <input 
                type="email"
                placeholder="user@example.com"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-cyan-primary outline-none transition-all"
                value={formData.targetEmail}
                onChange={e => setFormData({...formData, targetEmail: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-[9px] font-mono uppercase text-white/30 ml-1">Token Tier / Role</label>
              <select 
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-cyan-primary outline-none transition-all appearance-none"
                value={formData.role}
                onChange={e => setFormData({...formData, role: e.target.value})}
              >
                {STAFF_ROLES.map(role => (
                  <option key={role} value={role}>{role.toUpperCase()}</option>
                ))}
                <option value="client">CLIENT</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-mono uppercase text-white/30 ml-1">Custom Discount % (Optional)</label>
              <div className="flex gap-3">
                <input 
                  type="number"
                  placeholder="Default for role"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-cyan-primary outline-none transition-all"
                  value={formData.customDiscount}
                  onChange={e => setFormData({...formData, customDiscount: e.target.value})}
                />
                <button 
                  disabled={creating}
                  className="bg-cyan-primary text-black px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
                >
                  {creating ? <Loader2 size={16} className="animate-spin" /> : 'Deploy'}
                </button>
              </div>
            </div>
          </form>
          
          {formFeedback.msg && (
            <div className={`mt-6 p-4 rounded-xl text-[10px] font-mono uppercase tracking-widest border ${
              formFeedback.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-green-500/10 border-green-500/20 text-green-400'
            }`}>
              {formFeedback.msg}
            </div>
          )}
        </div>
      )}

      <div className="bg-[#1B241A] border border-white/5 rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white/2 border-b border-white/5 text-[10px] font-mono uppercase tracking-widest text-white/30">
              <tr>
                <th className="px-6 py-5">Token Code</th>
                <th className="px-6 py-5">Owner / Origin</th>
                <th className="px-6 py-5">Assigned Role</th>
                <th className="px-6 py-5">Benefit</th>
                <th className="px-6 py-5">Usage Count</th>
                <th className="px-6 py-5">Genesis Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan="6" className="px-6 py-20 text-center text-white/20 font-mono text-xs animate-pulse tracking-[0.2em] uppercase">Decrypting Token Network...</td></tr>
              ) : codes.length === 0 ? (
                <tr><td colSpan="6" className="px-6 py-20 text-center text-white/20 font-mono text-xs uppercase tracking-widest">No active referrals found</td></tr>
              ) : (
                codes.map(c => (
                  <tr key={c.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4">
                       <span className="font-mono text-xs font-black text-cyan-primary bg-cyan-primary/5 border border-cyan-primary/10 px-3 py-1.5 rounded-lg tracking-widest uppercase">
                         {c.id}
                       </span>
                    </td>
                    <td className="px-6 py-4">
                       <div className="text-sm font-bold text-white/80">{ownerNames[c.ownerUid] || '...'}</div>
                       <div className="text-[10px] text-white/20 font-mono italic">UID: {c.ownerUid?.slice(0, 8)}...</div>
                    </td>
                    <td className="px-6 py-4">
                       <span className={`px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-widest ${getRoleColor(c.role)}`}>
                         {c.role || 'worker'}
                       </span>
                    </td>
                    <td className="px-6 py-4">
                       <div className="flex items-center gap-2">
                          <span className="text-sm font-black italic text-teal-primary">{c.discountPercent}%</span>
                          <span className="text-[8px] font-mono text-white/20 uppercase tracking-widest">OFF</span>
                       </div>
                    </td>
                    <td className="px-6 py-4">
                       <div className="flex items-center gap-2">
                          <div className="text-lg font-black text-white py-1 transition-all group-hover:scale-110">{c.timesUsed || 0}</div>
                          <TrendingUp size={14} className="text-green-500/30 group-hover:text-green-500 transition-colors" />
                       </div>
                    </td>
                    <td className="px-6 py-4 text-white/20 font-mono text-[10px] uppercase truncate">
                       {c.createdAt?.toDate?.().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Legend / Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <div className="p-6 bg-[#1B241A]/50 border border-white/5 rounded-2xl flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-cyan-primary/5 border border-cyan-primary/20 flex items-center justify-center text-cyan-primary shrink-0">
               <HelpCircle size={20} />
            </div>
            <div>
               <h4 className="text-sm font-bold text-white mb-2 underline underline-offset-4 decoration-cyan-primary/30">Referral Protocol</h4>
               <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest leading-relaxed">
                 Tokens are automatically generated for live staff roles only. Worker codes default to 5 percent, admin codes to 15 percent, and owner codes to 25 percent. Owners can still override the discount when a manual campaign needs a different rate.
               </p>
            </div>
         </div>
      </div>
    </div>
  );
};

export default ReferralsView;
