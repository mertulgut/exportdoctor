import { useState, useEffect } from 'react';

const STEPS = [
  { label: 'Reading file', icon: '📂' },
  { label: 'Extracting metadata', icon: '⚙' },
  { label: 'Running compliance checks', icon: '✓' },
  { label: 'Generating report', icon: '📊' },
];

export default function AnalysisProgress() {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setCurrentStep(1), 600),
      setTimeout(() => setCurrentStep(2), 1400),
      setTimeout(() => setCurrentStep(3), 2000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="flex justify-center animate-fade-in">
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto rounded-full bg-indigo-500/10 flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-indigo-400 animate-spin-slow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          </div>
          <p className="text-sm font-medium text-white">Analyzing video...</p>
        </div>

        <div className="space-y-3">
          {STEPS.map((step, i) => {
            const isActive = i === currentStep;
            const isDone = i < currentStep;
            return (
              <div
                key={i}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 ${
                  isActive ? 'bg-indigo-500/[0.06] border border-indigo-500/20' :
                  isDone ? 'bg-white/[0.02] border border-white/[0.05]' :
                  'border border-transparent opacity-40'
                }`}
              >
                <span className={`text-base ${isActive ? 'animate-progress-pulse' : ''}`}>{step.icon}</span>
                <span className={`text-xs font-medium ${isActive ? 'text-white' : isDone ? 'text-[#9ca3af]' : 'text-[#4b5563]'}`}>
                  {step.label}
                </span>
                {isDone && (
                  <svg className="ml-auto w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
