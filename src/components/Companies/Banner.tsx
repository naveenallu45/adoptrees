'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

export default function Banner() {
  const [showInput, setShowInput] = useState(false);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when it appears
  useEffect(() => {
    if (showInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showInput]);

  const handleScheduleDemo = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!email || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setSubmitStatus('idle');

    try {
      // TODO: Replace with actual API endpoint when available
      // For now, simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Here you would typically call an API endpoint like:
      // const response = await fetch('/api/demo-request', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ email }),
      // });
      
      setSubmitStatus('success');
      setEmail('');
      
      // Reset after 2 seconds
      setTimeout(() => {
        setShowInput(false);
        setSubmitStatus('idle');
      }, 2000);
    } catch (_error) {
      setSubmitStatus('error');
      setErrorMessage('Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="py-16 sm:py-20 md:py-24 bg-gradient-to-br from-teal-600 via-cyan-600 to-teal-700 relative overflow-hidden">
      {/* Decorative Background */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-white rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block mb-6">
            <span className="text-sm font-semibold text-teal-100 uppercase tracking-wider bg-white/20 px-4 py-2 rounded-full backdrop-blur-sm">
              Corporate Partnership
            </span>
          </div>
          
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 sm:mb-8 drop-shadow-lg">
            Create Impact That Outlives Your Brand
          </h2>
          
          <p className="text-lg sm:text-xl md:text-2xl text-teal-50 max-w-3xl mx-auto mb-8 sm:mb-10 leading-relaxed font-light">
            Work with us to make your CSR truly meaningful. 
            Each tree your company plants becomes a contribution to cleaner air, restored nature, and a healthier tomorrow.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link 
              href="/companies#trees"
              className="inline-flex bg-white text-teal-700 px-5 py-2.5 sm:px-8 sm:py-4 rounded-full text-base sm:text-lg font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
            >
              Start Partnership
            </Link>
            
            {!showInput ? (
              <button 
                onClick={() => setShowInput(true)}
                className="inline-flex border-2 border-white text-white px-5 py-2.5 sm:px-8 sm:py-4 rounded-full text-base sm:text-lg font-semibold hover:bg-white/20 transition-all duration-300 shadow-lg hover:scale-105 backdrop-blur-sm"
              >
                Schedule Demo
              </button>
            ) : (
              <form onSubmit={handleScheduleDemo} className="inline-flex items-center gap-2">
                {submitStatus === 'success' ? (
                  <div className="inline-flex items-center gap-2 border-2 border-white text-white px-5 py-2.5 sm:px-8 sm:py-4 rounded-full text-base sm:text-lg font-semibold backdrop-blur-sm">
                    <svg className="w-5 h-5 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Request Submitted!</span>
                  </div>
                ) : (
                  <>
                    <input
                      ref={inputRef}
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setErrorMessage('');
                      }}
                      placeholder="Enter your email"
                      className="px-5 py-2.5 sm:px-8 sm:py-4 rounded-full text-base sm:text-lg font-semibold border-2 border-white bg-white/10 backdrop-blur-sm text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50 min-w-[200px] sm:min-w-[250px]"
                      required
                    />
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex border-2 border-white bg-white text-teal-700 px-5 py-2.5 sm:px-8 sm:py-4 rounded-full text-base sm:text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit'}
                    </button>
                  </>
                )}
                {errorMessage && (
                  <span className="absolute top-full mt-2 text-red-200 text-sm whitespace-nowrap">{errorMessage}</span>
                )}
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
