export default function CompanyorPerson() {
  return (
    <section className="relative overflow-hidden">
      <div className="flex flex-col lg:flex-row">
        {/* Left Side - For Individuals */}
        <div className="w-full lg:w-1/2 bg-gradient-to-br from-green-600 to-emerald-700 relative flex items-center justify-center">
          <div className="relative z-10 px-8 sm:px-12 lg:px-16 py-12 max-w-xl w-full">
            {/* Badge */}
            <div className="inline-flex items-center bg-white/20 backdrop-blur-sm text-white px-5 py-2.5 rounded-full text-sm font-semibold mb-8 shadow-lg">
              FOR INDIVIDUALS
            </div>

            {/* Content */}
            <div className="space-y-6">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight tracking-tight">
                Are you a person?
              </h2>
              <p className="text-lg sm:text-xl text-white/95 leading-relaxed font-medium max-w-lg">
                Every gesture counts. Plant trees from your smartphone and join our community of pragmatic dreamers.
              </p>
            </div>
          </div>
        </div>

        {/* Right Side - For Companies */}
        <div className="w-full lg:w-1/2 bg-gradient-to-br from-green-100 to-emerald-50 relative flex items-center justify-center">
          <div className="relative z-10 px-8 sm:px-12 lg:px-16 py-12 max-w-xl w-full">
            {/* Badge */}
            <div className="inline-flex items-center bg-green-200/80 backdrop-blur-sm text-green-800 px-5 py-2.5 rounded-full text-sm font-semibold mb-8 shadow-lg border border-green-300/50">
              FOR COMPANIES
            </div>

            {/* Content */}
            <div className="space-y-6">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-gray-900 leading-tight tracking-tight whitespace-nowrap">
                Are you a company?
              </h2>
              <p className="text-lg sm:text-xl text-gray-700 leading-relaxed font-medium max-w-lg">
                Discover our services to make sustainability the competitive advantage of your business.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
