export default function CompanyorPerson() {
  return (
    <section className="relative overflow-hidden">
      <div className="flex flex-col lg:flex-row">
        {/* Left Side - For Individuals */}
        <div className="w-full lg:w-1/2 bg-gradient-to-br from-green-600 to-emerald-700 relative flex items-center justify-center min-h-[400px] sm:min-h-[500px] lg:min-h-[600px]">
          <div className="relative z-10 px-6 sm:px-8 md:px-12 lg:px-16 py-8 sm:py-12 max-w-xl w-full">
            {/* Badge */}
            <div className="inline-flex items-center bg-white/20 backdrop-blur-sm text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold mb-6 sm:mb-8 shadow-lg">
              FOR INDIVIDUALS
            </div>

            {/* Content */}
            <div className="space-y-4 sm:space-y-6">
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white leading-tight tracking-tight">
                Are you a person?
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-white/95 leading-relaxed font-medium max-w-lg">
                Every gesture counts. Plant trees from your smartphone and join our community of pragmatic dreamers.
              </p>
            </div>
          </div>
        </div>

        {/* Right Side - For Companies */}
        <div className="w-full lg:w-1/2 bg-gradient-to-br from-green-100 to-emerald-50 relative flex items-center justify-center min-h-[400px] sm:min-h-[500px] lg:min-h-[600px]">
          <div className="relative z-10 px-6 sm:px-8 md:px-12 lg:px-16 py-8 sm:py-12 max-w-xl w-full">
            {/* Badge */}
            <div className="inline-flex items-center bg-green-200/80 backdrop-blur-sm text-green-800 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold mb-6 sm:mb-8 shadow-lg border border-green-300/50">
              FOR COMPANIES
            </div>

            {/* Content */}
            <div className="space-y-4 sm:space-y-6">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 leading-tight tracking-tight">
                Are you a company?
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-gray-800 leading-relaxed font-medium max-w-lg">
                Discover our services to make sustainability the competitive advantage of your business.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
