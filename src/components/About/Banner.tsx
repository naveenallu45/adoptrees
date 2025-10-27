export default function Banner() {
  return (
    <section className="py-12 sm:py-16 md:py-20 bg-gradient-to-r from-purple-500 to-pink-600">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-6">
            Join Our Mission
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-purple-100 max-w-2xl sm:max-w-3xl mx-auto mb-6 sm:mb-8 px-4">
            Together, we can create a sustainable future for generations to come. Every tree planted is a step towards a greener tomorrow.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center px-4">
            <button className="w-full sm:w-auto bg-white text-purple-600 px-6 sm:px-8 py-3 sm:py-4 rounded-full text-base sm:text-lg font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
              Get Involved
            </button>
            <button className="w-full sm:w-auto border-2 border-white text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full text-base sm:text-lg font-semibold hover:bg-white/20 transition-all duration-300 shadow-lg hover:scale-105">
              Contact Us
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
