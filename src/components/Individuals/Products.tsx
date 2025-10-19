"use client";

export default function Products() {
  const trees = [
    {
      id: 1,
      name: "Mango Tree",
      price: "₹299",
      image: "Mango tree with green leaves and fruits",
      oxygenContribution: "22 kg/year"
    },
    {
      id: 2,
      name: "Neem Tree",
      price: "₹199",
      image: "Neem tree with small green leaves",
      oxygenContribution: "18 kg/year"
    },
    {
      id: 3,
      name: "Banyan Tree",
      price: "₹499",
      image: "Large banyan tree with aerial roots",
      oxygenContribution: "35 kg/year"
    },
    {
      id: 4,
      name: "Flowering Tree",
      price: "₹349",
      image: "Colorful flowering tree with pink and white flowers",
      oxygenContribution: "25 kg/year"
    },
    {
      id: 5,
      name: "Oak Tree",
      price: "₹399",
      image: "Majestic oak tree with broad leaves",
      oxygenContribution: "30 kg/year"
    },
    {
      id: 6,
      name: "Pine Tree",
      price: "₹249",
      image: "Evergreen pine tree with needle leaves",
      oxygenContribution: "20 kg/year"
    },
    {
      id: 7,
      name: "Coconut Tree",
      price: "₹179",
      image: "Tall coconut tree with coconuts",
      oxygenContribution: "15 kg/year"
    },
    {
      id: 8,
      name: "Rosewood Tree",
      price: "₹599",
      image: "Premium rosewood tree with dark bark",
      oxygenContribution: "40 kg/year"
    }
  ];

  const handleInfoClick = (treeName: string) => {
    alert(`Information about ${treeName}:\n\nThis tree contributes significantly to oxygen production and environmental sustainability. Click "Add to Cart" to adopt this tree and make a positive impact on our planet.`);
  };

  const handleAddToCart = (treeName: string, price: string) => {
    alert(`${treeName} (${price}) has been added to your cart! Thank you for contributing to a greener future.`);
  };

  return (
    <section className="py-20 bg-gradient-to-br from-gray-50 to-green-50">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {trees.map((tree) => (
            <div key={tree.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-200">
              {/* Tree Image */}
              <div className="relative aspect-square bg-gradient-to-br from-green-50 to-emerald-100">
                <div className="absolute inset-0 flex items-center justify-center p-4">
                  <div className="text-center">
                    <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-md">
                      <span className="text-white text-3xl font-bold">🌳</span>
                    </div>
                    <p className="text-xs text-gray-600 font-medium leading-tight">{tree.image}</p>
                  </div>
                </div>
              </div>

              {/* Product Information */}
              <div className="p-4">
                {/* Tree Name */}
                <h3 className="text-lg font-bold text-gray-900 mb-3">
                  {tree.name}
                </h3>

                {/* Price and Oxygen Contribution */}
                <div className="flex justify-between items-center mb-4">
                  <span className="text-2xl font-bold text-blue-600">{tree.price}</span>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Oxygen</p>
                    <p className="text-sm font-semibold text-green-600">{tree.oxygenContribution}</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleInfoClick(tree.name)}
                    className="flex-1 bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded text-sm font-medium hover:bg-gray-50 transition-colors duration-200 flex items-center justify-center"
                  >
                    Info
                  </button>
                  <button
                    onClick={() => handleAddToCart(tree.name, tree.price)}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors duration-200 flex items-center justify-center"
                  >
                    Add to Cart
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
