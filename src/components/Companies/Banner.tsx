export default function Banner() {
  return (
    <section className="py-20 bg-gradient-to-r from-blue-500 to-indigo-600">
      <div className="container mx-auto px-4">
        <div className="text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Lead the Green Revolution
          </h2>
          <p className="text-xl text-blue-100 max-w-3xl mx-auto mb-8">
            Join leading companies in creating a sustainable future. Partner with us to make a meaningful impact on the environment and your brand.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button className="bg-white text-blue-600 px-8 py-4 rounded-full text-lg font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
              Start Partnership
            </button>
            <button className="border-2 border-white text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-white/20 transition-all duration-300 shadow-lg hover:scale-105">
              Schedule Demo
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
