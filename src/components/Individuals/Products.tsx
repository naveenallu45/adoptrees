export default function Products() {
  const products = [
    {
      id: 1,
      name: "Mango Tree",
      price: "₹299",
      description: "Adopt a mango tree and enjoy fresh mangoes every season",
      image: "Mango tree with green leaves and fruits",
      features: ["Fresh mangoes", "Annual harvest", "Care updates"]
    },
    {
      id: 2,
      name: "Neem Tree",
      price: "₹199",
      description: "Plant a neem tree for its medicinal properties and air purification",
      image: "Neem tree with small green leaves",
      features: ["Medicinal benefits", "Air purification", "Low maintenance"]
    },
    {
      id: 3,
      name: "Banyan Tree",
      price: "₹499",
      description: "Adopt a majestic banyan tree for generations to come",
      image: "Large banyan tree with aerial roots",
      features: ["Long lifespan", "Cultural significance", "Wildlife habitat"]
    },
    {
      id: 4,
      name: "Flowering Tree",
      price: "₹349",
      description: "Beautiful flowering tree that blooms throughout the year",
      image: "Colorful flowering tree with pink and white flowers",
      features: ["Year-round blooms", "Beautiful flowers", "Pollinator friendly"]
    }
  ];

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Choose Your Tree
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Select from our variety of trees and start your journey towards a greener future
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {products.map((product) => (
            <div key={product.id} className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 border border-gray-100 overflow-hidden">
              <div className="aspect-square bg-gradient-to-br from-green-100 to-emerald-200 flex items-center justify-center">
                <div className="text-center p-8">
                  <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-white text-2xl font-bold">🌳</span>
                  </div>
                  <p className="text-sm text-gray-600">{product.image}</p>
                </div>
              </div>
              
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{product.name}</h3>
                <p className="text-gray-600 mb-4 text-sm">{product.description}</p>
                
                <div className="mb-4">
                  <ul className="space-y-1">
                    {product.features.map((feature, index) => (
                      <li key={index} className="text-sm text-gray-500 flex items-center">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2"></span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-green-600">{product.price}</span>
                  <button className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-2 rounded-lg font-semibold hover:from-green-600 hover:to-emerald-700 transition-all duration-300 hover:scale-105">
                    Adopt Now
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
