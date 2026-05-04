

const WizardProgress = ({ steps, currentStep }) => {
  return (
    <div className="flex justify-center items-start gap-0 mx-auto mb-16 max-w-2xl px-4">
      {steps.map((step, idx) => {
        const isDone = idx + 1 < currentStep;
        const isActive = idx + 1 === currentStep;
        
        return (
          <div key={idx} className="flex flex-col items-center gap-2 flex-1 relative group">
            {/* Line */}
            {idx < steps.length - 1 && (
              <div className={`absolute top-[17px] left-1/2 w-full h-[2px] z-0 transition-colors duration-500 ${isDone ? 'bg-cyan-primary/50' : 'bg-white/5'}`} />
            )}
            
            {/* Dot */}
            <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center font-mono text-xs relative z-10 transition-all duration-500 ${
              isActive ? 'border-cyan-primary bg-cyan-primary/10 text-cyan-primary shadow-[0_0_15px_rgba(155, 255, 87,0.3)]' :
              isDone ? 'border-teal-primary bg-teal-primary/10 text-teal-primary' :
              'border-white/10 bg-secondary-dark text-white/20'
            }`}>
              {idx + 1}
            </div>
            
            {/* Label */}
            <span className={`text-[10px] uppercase font-mono tracking-widest transition-colors duration-500 ${
              isActive ? 'text-cyan-primary' :
              isDone ? 'text-teal-primary' :
              'text-white/20'
            }`}>
              {step}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default WizardProgress;
