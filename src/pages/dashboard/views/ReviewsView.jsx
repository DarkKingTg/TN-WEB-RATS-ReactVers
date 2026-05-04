import { useState, useEffect } from 'react';
import { Star, MessageSquare, Box, Calendar, User, UserCheck } from 'lucide-react';
import { db } from '../../../config/firebase';
import { collection, query, getDocs, orderBy, where } from 'firebase/firestore';
import { useAuth } from '../../../context/AuthContext';

const ReviewsView = () => {
  const { user, userData } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, avg: 0, top: 0 });

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      let q;
      if (userData?.role === 'worker') {
        q = query(collection(db, "reviews"), where("workerAssigned", "==", user.uid), orderBy("createdAt", "desc"));
      } else {
        q = query(collection(db, "reviews"), orderBy("createdAt", "desc"));
      }
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setReviews(data);
      
      const total = data.length;
      const sum = data.reduce((acc, r) => acc + (r.rating || 0), 0);
      const avg = total > 0 ? (sum / total).toFixed(1) : 0;
      const top = data.filter(r => (r.rating || 0) >= 4).length;
      
      setStats({ total, avg, top });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating) => {
    return Array(5).fill(0).map((_, i) => (
      <Star 
        key={i} 
        size={14} 
        className={i < rating ? 'text-cyan-primary fill-cyan-primary' : 'text-white/10'} 
      />
    ));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black text-white italic">Customer <span className="text-cyan-primary not-italic font-mono uppercase text-sm tracking-[0.2em] ml-2">Feedbacks</span></h2>
          <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest mt-1">Live ratings, service reviews, and quality metrics</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { label: 'Total Reviews', val: stats.total, icon: <MessageSquare />, color: 'text-cyan-primary' },
          { label: 'Avg Rating', val: stats.avg, icon: <Star />, color: 'text-yellow-500' },
          { label: '4-5 Star Ratings', val: stats.top, icon: <UserCheck />, color: 'text-green-500' },
        ].map((s, i) => (
          <div key={i} className="bg-[#1B241A] border border-white/5 p-6 rounded-3xl flex items-center gap-6 group hover:border-cyan-primary/20 transition-all">
             <div className={`w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center ${s.color} group-hover:scale-110 transition-transform`}>
                {s.icon}
             </div>
             <div>
                <div className="text-2xl font-black text-white font-mono">{s.val}</div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-white/20">{s.label}</div>
             </div>
          </div>
        ))}
      </div>

      <div className="bg-[#1B241A] border border-white/5 rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white/5 border-b border-white/5 text-[10px] font-mono uppercase tracking-widest text-white/30">
              <tr>
                <th className="px-6 py-5">Metric / Rating</th>
                <th className="px-6 py-5">Customer Voice</th>
                <th className="px-6 py-5">Associated Service</th>
                <th className="px-6 py-5">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan="4" className="px-6 py-20 text-center text-white/20 font-mono text-xs animate-pulse tracking-[0.2em] uppercase">Aggregating Feedback Stream...</td></tr>
              ) : reviews.length === 0 ? (
                <tr><td colSpan="4" className="px-6 py-20 text-center text-white/20 font-mono text-xs uppercase tracking-widest">No customer feedback yet</td></tr>
              ) : (
                reviews.map(r => (
                  <tr key={r.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-8">
                       <div className="flex gap-1 mb-2">{renderStars(r.rating || 0)}</div>
                       <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-primary/40 group-hover:text-cyan-primary transition-colors">Digital Signature</div>
                    </td>
                    <td className="px-6 py-8 max-w-md">
                       <p className="text-sm text-white/80 leading-relaxed italic border-l-2 border-cyan-primary/20 pl-4 py-1">
                         "{r.comment || "The client chose not to leave a written memo."}"
                       </p>
                       <div className="mt-3 flex items-center gap-2 text-[10px] font-mono text-white/20 uppercase tracking-widest">
                          <User size={10} /> {r.customerName || 'Anonymous Client'}
                       </div>
                    </td>
                    <td className="px-6 py-8">
                       <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/5 rounded-full">
                          <Box size={12} className="text-white/20" />
                          <span className="text-[10px] font-bold text-white/60 lowercase tracking-widest">{r.service || 'Legacy Order'}</span>
                       </div>
                    </td>
                    <td className="px-6 py-8 font-mono text-[10px] text-white/20 uppercase">
                       <div className="flex items-center gap-2">
                          <Calendar size={12} />
                          {r.createdAt?.toDate?.().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) || '—'}
                       </div>
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

export default ReviewsView;
