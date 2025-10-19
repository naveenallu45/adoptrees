export default function Banner() {
  return (
    <section className="py-20 bg-gradient-to-r from-purple-500 to-pink-600">
      <div className="container mx-auto px-4">
        <div className="text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Join Our Mission
          </h2>
          <p className="text-xl text-purple-100 max-w-3xl mx-auto mb-8">
            Together, we can create a sustainable future for generations to come. Every tree planted is a step towards a greener tomorrow.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button className="bg-white text-purple-600 px-8 py-4 rounded-full text-lg font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
              Get Involved
            </button>
            <button className="border-2 border-white text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-white/20 transition-all duration-300 shadow-lg hover:scale-105">
              Contact Us
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
