import React, { useState, Children, useRef, useLayoutEffect } from 'react';
import BackButton from './BackButton';

export default function Stepper({
  children,
  currentStep = 1,
  direction = 0,
  onStepChange = () => {},
  onFinalStepCompleted = () => {},
  stepCircleContainerClassName = '',
  stepContainerClassName = '',
  contentClassName = '',
  footerClassName = '',
  backButtonProps = {},
  nextButtonProps = {},
  backButtonText = 'Back',
  nextButtonText = 'Continue',
  disableStepIndicators = false,
  showButtons = true,
  renderStepIndicator,
  ...rest
}) {
  const stepsArray = Children.toArray(children);
  const totalSteps = stepsArray.length;
  const isCompleted = currentStep > totalSteps;
  const isLastStep = currentStep === totalSteps;

  const updateStep = (newStep, newDirection) => {
    if (newStep > totalSteps) onFinalStepCompleted();
    else onStepChange(newStep, newDirection);
  };

  const handleBack = () => {
    if (currentStep > 1) {
      updateStep(currentStep - 1, -1);
    }
  };

  const handleNext = () => {
    if (!isLastStep) {
      updateStep(currentStep + 1, 1);
    }
  };

  const handleComplete = () => {
    updateStep(totalSteps + 1, 1);
  };

  return (
    <div
      className={`flex min-h-full flex-1 flex-col items-center justify-center p-4 ${rest.className || ''}`}
      {...rest}
    >
      <div
        className={`mx-auto w-full max-w-4xl rounded-3xl bg-secondary-dark/50 border border-white/5 shadow-2xl overflow-hidden ${stepCircleContainerClassName}`}
      >
        <div className={`${stepContainerClassName} flex w-full items-center px-4 py-6 sm:p-8 bg-primary-dark/30 border-b border-white/5 overflow-x-auto scrollbar-hide`}>
          {stepsArray.map((_, index) => {
            const stepNumber = index + 1;
            const isNotLastStep = index < totalSteps - 1;
            return (
              <React.Fragment key={stepNumber}>
                {renderStepIndicator ? (
                  renderStepIndicator({
                    step: stepNumber,
                    currentStep,
                    onStepClick: clicked => {
                      updateStep(clicked, clicked > currentStep ? 1 : -1);
                    }
                  })
                ) : (
                  <StepIndicator
                    step={stepNumber}
                    disableStepIndicators={disableStepIndicators}
                    currentStep={currentStep}
                    onClickStep={clicked => {
                      updateStep(clicked, clicked > currentStep ? 1 : -1);
                    }}
                  />
                )}
                {isNotLastStep && <StepConnector isComplete={currentStep > stepNumber} />}
              </React.Fragment>
            );
          })}
        </div>
        
        <StepContentWrapper
          isCompleted={isCompleted}
          currentStep={currentStep}
          direction={direction}
          className={`relative min-h-[400px] ${contentClassName}`}
        >
          {stepsArray[currentStep - 1]}
        </StepContentWrapper>

        {showButtons && !isCompleted && (
          <div className={`px-8 pb-8 ${footerClassName}`}>
            <div className={`mt-10 flex ${currentStep !== 1 ? 'justify-between' : 'justify-end'} gap-4`}>
              {currentStep !== 1 && (
                <BackButton
                  onClick={handleBack}
                  label={backButtonText}
                  className="min-w-[160px] h-12"
                  {...backButtonProps}
                />
              )}
              <button
                type="button"
                onClick={isLastStep ? handleComplete : handleNext}
                className="px-8 py-2 rounded-full font-bold bg-cyan-primary text-primary-dark hover:shadow-[0_0_20px_rgba(155,255,87,0.4)] transition-all duration-300 flex items-center gap-2"
                {...nextButtonProps}
              >
                {isLastStep ? 'Complete' : nextButtonText}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StepContentWrapper({ isCompleted, currentStep, children, className }) {
  return (
    <div
      style={{ position: 'relative', overflow: 'hidden' }}
      className={className}
    >
      {!isCompleted && (
        <div key={currentStep} className="w-full p-0" style={{ position: 'relative' }}>
          {children}
        </div>
      )}
    </div>
  );
}

export function Step({ children, className = '' }) {
  return <div className={`p-8 ${className}`}>{children}</div>;
}

function StepIndicator({ step, currentStep, onClickStep, disableStepIndicators }) {
  const status = currentStep === step ? 'active' : currentStep < step ? 'inactive' : 'complete';

  const handleClick = () => {
    if (step !== currentStep && !disableStepIndicators) onClickStep(step);
  };

  const bgColor =
    status === 'active' ? '#66FCF1' :
    status === 'complete' ? '#66FCF1' :
    'rgba(255,255,255,0.05)';
  const textColor =
    status === 'active' || status === 'complete' ? '#0B0C10' : 'rgba(255,255,255,0.3)';

  return (
    <div
      onClick={handleClick}
      className="relative cursor-pointer outline-none focus:outline-none"
    >
      <div
        className="flex h-10 w-10 items-center justify-center rounded-full font-bold text-sm shadow-xl transition-colors duration-300"
        style={{ backgroundColor: bgColor, color: textColor }}
      >
        {status === 'complete' ? (
          <CheckIcon className="h-5 w-5" />
        ) : (
          <span>{step}</span>
        )}
      </div>
      {status === 'active' && (
        <div
          className="absolute -inset-1 rounded-full border border-cyan-primary/50"
        />
      )}
    </div>
  );
}

function StepConnector({ isComplete }) {
  return (
    <div className="relative mx-4 h-[1px] flex-1 bg-white/10 overflow-hidden">
      <div
        className="absolute left-0 top-0 h-full transition-[width] duration-400"
        style={{
          width: isComplete ? '100%' : '0%',
          backgroundColor: isComplete ? '#66FCF1' : 'transparent',
        }}
      />
    </div>
  );
}

function CheckIcon(props) {
  return (
    <svg {...props} fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}
