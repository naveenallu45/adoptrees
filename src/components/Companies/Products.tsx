export default function Products() {
  const programs = [
    {
      id: 1,
      name: "Corporate Forest Program",
      price: "₹50,000",
      description: "Plant a dedicated forest for your company with 100+ trees",
      image: "Large corporate forest with multiple tree species",
      features: ["100+ trees", "Dedicated forest", "CSR certification", "Impact reports"]
    },
    {
      id: 2,
      name: "Employee Tree Adoption",
      price: "₹15,000",
      description: "Let your employees adopt trees as part of their benefits",
      image: "Employees planting trees together",
      features: ["Employee engagement", "Team building", "Personal adoption", "Progress tracking"]
    },
    {
      id: 3,
      name: "Carbon Offset Program",
      price: "₹25,000",
      description: "Offset your company's carbon footprint with our tree planting program",
      image: "Carbon offset visualization with trees and CO2 symbols",
      features: ["Carbon calculation", "Offset certification", "Environmental impact", "Sustainability goals"]
    },
    {
      id: 4,
      name: "Green Office Initiative",
      price: "₹10,000",
      description: "Transform your office space with indoor and outdoor green initiatives",
      image: "Modern office with green plants and trees",
      features: ["Indoor plants", "Outdoor landscaping", "Air quality improvement", "Employee wellness"]
    }
  ];

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Corporate Programs
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Choose from our range of corporate sustainability programs designed for businesses of all sizes
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {programs.map((program) => (
            <div key={program.id} className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 border border-gray-100 overflow-hidden">
              <div className="aspect-square bg-gradient-to-br from-blue-100 to-indigo-200 flex items-center justify-center">
                <div className="text-center p-8">
                  <div className="w-24 h-24 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-white text-2xl font-bold">🏢</span>
                  </div>
                  <p className="text-sm text-gray-600">{program.image}</p>
                </div>
              </div>
              
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{program.name}</h3>
                <p className="text-gray-600 mb-4 text-sm">{program.description}</p>
                
                <div className="mb-4">
                  <ul className="space-y-1">
                    {program.features.map((feature, index) => (
                      <li key={index} className="text-sm text-gray-500 flex items-center">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-blue-600">{program.price}</span>
                  <button className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 hover:scale-105">
                    Learn More
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
