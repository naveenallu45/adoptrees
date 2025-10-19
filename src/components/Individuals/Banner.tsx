export default function Banner() {
  return (
    <section className="py-20 bg-gradient-to-r from-green-500 to-emerald-600">
      <div className="container mx-auto px-4">
        <div className="text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Start Your Green Journey Today
          </h2>
          <p className="text-xl text-green-100 max-w-3xl mx-auto mb-8">
            Join thousands of individuals who are making a difference by adopting trees and contributing to a sustainable future.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button className="bg-white text-green-600 px-8 py-4 rounded-full text-lg font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
              Get Started Now
            </button>
            <button className="border-2 border-white text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-white/20 transition-all duration-300 shadow-lg hover:scale-105">
              Learn More
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
