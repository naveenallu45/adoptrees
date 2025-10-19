"use client";

export default function Products() {
  const corporateTrees = [
    {
      id: 1,
      name: "Corporate Mango Grove",
      price: "₹2,999",
      image: "Large mango plantation for corporate adoption",
      oxygenContribution: "2,200 kg/year"
    },
    {
      id: 2,
      name: "Executive Neem Forest",
      price: "₹1,999",
      image: "Premium neem tree forest for offices",
      oxygenContribution: "1,800 kg/year"
    },
    {
      id: 3,
      name: "Banyan Heritage Grove",
      price: "₹4,999",
      image: "Majestic banyan trees for corporate campuses",
      oxygenContribution: "3,500 kg/year"
    },
    {
      id: 4,
      name: "Flowering Corporate Garden",
      price: "₹3,499",
      image: "Beautiful flowering trees for office landscapes",
      oxygenContribution: "2,500 kg/year"
    },
    {
      id: 5,
      name: "Oak Executive Forest",
      price: "₹3,999",
      image: "Premium oak trees for corporate sustainability",
      oxygenContribution: "3,000 kg/year"
    },
    {
      id: 6,
      name: "Pine Corporate Woodland",
      price: "₹2,499",
      image: "Evergreen pine forest for year-round impact",
      oxygenContribution: "2,000 kg/year"
    },
    {
      id: 7,
      name: "Coconut Corporate Oasis",
      price: "₹1,799",
      image: "Tropical coconut grove for corporate campuses",
      oxygenContribution: "1,500 kg/year"
    },
    {
      id: 8,
      name: "Rosewood Premium Forest",
      price: "₹5,999",
      image: "Luxury rosewood forest for premium corporate programs",
      oxygenContribution: "4,000 kg/year"
    }
  ];

  const handleInfoClick = (treeName: string) => {
    alert(`Corporate Program: ${treeName}\n\nThis premium corporate tree adoption program includes:\n• Dedicated tree maintenance\n• Monthly progress reports\n• CSR certification\n• Environmental impact tracking\n• Corporate sustainability branding\n\nPerfect for companies committed to environmental responsibility.`);
  };

  const handleAddToCart = (treeName: string, price: string) => {
    alert(`Corporate Program: ${treeName} (${price})\n\nAdded to your corporate cart! Our team will contact you within 24 hours to discuss implementation and customization options for your corporate sustainability program.`);
  };

  return (
    <section className="py-20 bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {corporateTrees.map((tree) => (
            <div key={tree.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-200">
              {/* Tree Image */}
              <div className="relative aspect-square bg-gradient-to-br from-blue-50 to-indigo-100">
                <div className="absolute inset-0 flex items-center justify-center p-4">
                  <div className="text-center">
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-md">
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
