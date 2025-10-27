export default function Banner() {
  return (
    <section className="py-12 sm:py-16 md:py-20 bg-gradient-to-r from-green-500 to-emerald-600">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-6">
            Start Your Green Journey Today
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-green-100 max-w-2xl sm:max-w-3xl mx-auto mb-6 sm:mb-8 px-4">
            Join thousands of individuals who are making a difference by adopting trees and contributing to a sustainable future.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center px-4">
            <button className="w-full sm:w-auto bg-white text-green-600 px-6 sm:px-8 py-3 sm:py-4 rounded-full text-base sm:text-lg font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
              Get Started Now
            </button>
            <button className="w-full sm:w-auto border-2 border-white text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full text-base sm:text-lg font-semibold hover:bg-white/20 transition-all duration-300 shadow-lg hover:scale-105">
              Learn More
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
