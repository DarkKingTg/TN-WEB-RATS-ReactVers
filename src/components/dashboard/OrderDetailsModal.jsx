import { useState } from 'react';
import { 
  X, Check, Clock3, ExternalLink, Download, Star, 
  Info, CreditCard, Calendar, User,
  LayoutDashboard
} from 'lucide-react';
import { Button, Card } from '../ui/Primitives';
import { 
  getOrderDisplayId, 
  getOrderProgress, 
  getOrderStatusLabel,
  getOrderStatusBadgeClass,
  getOrderPriorityLabel,
  getOrderPriorityBadgeClass,
  getCustomerTypeLabel
} from '../../utils/orderHelpers';

/**
 * Shared OrderDetailsModal for Clients and Staff
 */
const OrderDetailsModal = ({
  order,
  userRole = 'client',
  onClose,
  onContact,
  onDownload,
  onReorder,
  onReview,
  onUpdateStatus,
}) => {
  const [activeTab, setActiveTab] = useState('details');
  const progress = getOrderProgress(order.status);
  const isCompleted = order.status === 'completed' || order.status === 'closed';
  const reviewDone = order.reviewDone || order.review?.rating;

  // Permissions
  const isStaff = ['owner', 'admin', 'worker'].includes(userRole);

  const formatCurrency = (val) => Number(val || 0).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  });

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 p-4 md:p-10 backdrop-blur-md">
      <div className="relative w-full max-w-6xl h-full max-h-[90vh] bg-[#0B0F13] border border-white/10 rounded-[40px] shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 p-8 border-b border-white/5 bg-white/[0.02]">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[10px] font-mono font-black uppercase tracking-[0.3em] text-cyan-primary/60">
                {getOrderDisplayId(order)}
              </span>
              <span className={`px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-widest ${getOrderStatusBadgeClass(order.status)}`}>
                {order.status}
              </span>
            </div>
            <h2 className="text-2xl md:text-4xl font-black text-white italic leading-tight">
              {order.service}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-black/40 p-1 rounded-2xl border border-white/5 flex">
                {[
                  { id: 'details', label: 'Details', icon: Info },
                ].map(tab => (
                <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-mono uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-cyan-primary text-black font-black shadow-lg shadow-cyan-primary/20' : 'text-white/40 hover:text-white'}`}
                >
                  <tab.icon size={14} />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>
            <button 
              type="button"
              aria-label="Close order panel"
              onClick={onClose}
              className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 transition-all flex items-center justify-center text-white/40 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {activeTab === 'details' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Stats & Progress */}
              <div className="lg:col-span-4 space-y-6">
                <Card hoverEffect={false} className="bg-white/[0.02] border-white/5 p-6 rounded-[32px]">
                  <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/30 mb-6 flex items-center gap-2">
                    <LayoutDashboard size={14} /> Project Pulse
                  </h4>
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between text-[10px] font-mono uppercase tracking-widest mb-3">
                        <span className="text-white/40">Completion</span>
                        <span className="text-cyan-primary font-black">{progress}%</span>
                      </div>
                      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-cyan-primary shadow-[0_0_15px_rgba(6,182,212,0.5)] transition-[width] duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-2xl bg-black/40 border border-white/5">
                        <div className="text-[8px] font-mono uppercase text-white/20 mb-1">Priority</div>
                        <div className={`text-[10px] font-black uppercase ${getOrderPriorityBadgeClass(order)} border-none p-0 bg-transparent`}>
                          {getOrderPriorityLabel(order)}
                        </div>
                      </div>
                      <div className="p-4 rounded-2xl bg-black/40 border border-white/5">
                        <div className="text-[8px] font-mono uppercase text-white/20 mb-1">Deadline</div>
                        <div className="text-[10px] font-black text-white uppercase">{order.deadline || 'Flexible'}</div>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card hoverEffect={false} className="bg-white/[0.02] border-white/5 p-6 rounded-[32px]">
                  <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/30 mb-6 flex items-center gap-2">
                    <CreditCard size={14} /> Financial Ledger
                  </h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-white/40">Total Value</span>
                      <span className="text-sm font-black text-white">{formatCurrency(order.totalPrice || order.price)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-white/40">Paid to date</span>
                      <span className="text-sm font-black text-accent">{formatCurrency(order.totalPaid || 0)}</span>
                    </div>
                    <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                      <span className="text-xs font-bold text-white/60">Balance Due</span>
                      <span className="text-lg font-black text-cyan-primary">{formatCurrency((order.totalPrice || order.price) - (order.totalPaid || 0))}</span>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Right Column: Requirements */}
              <div className="lg:col-span-8 space-y-6">
                <Card hoverEffect={false} className="bg-white/2 border-white/5 p-8 rounded-4xl">
                  <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/30 mb-8 flex items-center gap-2 wrap-break-word">
                    <Info size={14} /> Brief & Requirements
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                    <div>
                      <div className="text-[8px] font-mono uppercase text-white/20 mb-2 tracking-widest wrap-break-word">Project Summary</div>
                      <p className="text-sm leading-relaxed text-white/70 italic wrap-break-word">
                        "{order.projectDescription || order.requirements?.projectDescription || 'No description provided.'}"
                      </p>
                    </div>
                    <div className="space-y-6">
                      <div>
                        <div className="text-[8px] font-mono uppercase text-white/20 mb-2 tracking-widest wrap-break-word">Key Deliverables</div>
                        <p className="text-xs text-white/60 font-medium wrap-break-word">
                          {order.features || order.requirements?.features || 'Standard project features.'}
                        </p>
                      </div>
                      <div>
                        <div className="text-[8px] font-mono uppercase text-white/20 mb-2 tracking-widest flex wrap-break-word">External Assets</div>
                        {order.references || order.requirements?.references ? (
                          <a href={order.references || order.requirements?.references} target="_blank" rel="noreferrer" className="text-xs text-cyan-primary underline underline-offset-4 flex items-center gap-2">
                            <ExternalLink size={12} /> Open Reference Link
                          </a>
                        ) : (
                          <span className="text-xs text-white/20">No external links provided.</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-white/5 flex flex-wrap gap-4">
                    {isStaff ? (
                      <div className="w-full flex flex-col md:flex-row gap-4 justify-between items-center">
                         <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-cyan-primary">
                               <User size={18} />
                            </div>
                            <div>
                               <div className="text-[8px] font-mono uppercase text-white/20 tracking-widest">Client Identity</div>
                               <div className="text-xs font-bold text-white">{order.customerName || order.name}</div>
                            </div>
                         </div>
                         <div className="flex gap-3">
                            <Button variant="outline" onClick={onContact}>Contact Client</Button>
                            {onUpdateStatus && (
                              <select 
                                className="bg-cyan-primary text-black px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer"
                                value={order.status}
                                onChange={(e) => onUpdateStatus(order, e.target.value)}
                              >
                                <option value={order.status}>Update Status</option>
                                <option value="assigned">Assigned</option>
                                <option value="in_progress">In Progress</option>
                                <option value="delivered_preview">Preview Ready</option>
                                <option value="completed">Completed</option>
                              </select>
                            )}
                         </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-3">
                        <Button variant="outline" onClick={onContact}>Contact Support</Button>
                        {isCompleted && <Button onClick={onReorder}>Reorder Service</Button>}
                        {isCompleted && (
                          <Button 
                            variant="outline" 
                            onClick={onReview}
                            disabled={Boolean(reviewDone)}
                          >
                            {reviewDone ? 'Review Saved' : 'Leave Review'}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsModal;
