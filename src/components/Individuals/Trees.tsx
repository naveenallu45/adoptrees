"use client";

import Image from 'next/image';

interface Tree {
  _id: string;
  name: string;
  price: number;
  info: string;
  oxygenKgs: number;
  imageUrl: string;
  isActive: boolean;
}

interface TreesProps {
  initialTrees?: Tree[];
}

export default function Trees({ initialTrees = [] }: TreesProps) {
  const trees = initialTrees;
  const error = trees.length === 0 ? 'No trees available' : null;

  const handleInfoClick = (tree: Tree) => {
    alert(`Information about ${tree.name}:\n\n${tree.info}\n\nOxygen Production: ${tree.oxygenKgs} kg/year\n\nThis tree contributes significantly to oxygen production and environmental sustainability. Click "Add to Cart" to adopt this tree and make a positive impact on our planet.`);
  };

  const handleAddToCart = (tree: Tree) => {
    alert(`${tree.name} (₹${tree.price}) has been added to your cart! Thank you for contributing to a greener future.`);
  };


  return (
    <section className="py-20 bg-gradient-to-br from-gray-50 to-green-50">
      <div className="container mx-auto px-4">
        {error && (
          <div className="text-center mb-8">
            <p className="text-red-600">{error}</p>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {trees.map((tree) => (
              <div key={tree._id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-200">
                {/* Tree Image */}
                <div className="relative aspect-square">
                  <Image
                    src={tree.imageUrl}
                    alt={tree.name}
                    fill
                    className="object-cover"
                  />
                </div>

                {/* Product Information */}
                <div className="p-4">
                  {/* Tree Name */}
                  <h3 className="text-lg font-bold text-gray-900 mb-3">
                    {tree.name}
                  </h3>

                  {/* Price and Oxygen Contribution */}
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-2xl font-bold text-blue-600">₹{tree.price}</span>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Oxygen</p>
                      <p className="text-sm font-semibold text-green-600">{tree.oxygenKgs} kg/year</p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleInfoClick(tree)}
                      className="flex-1 bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded text-sm font-medium hover:bg-gray-50 transition-colors duration-200 flex items-center justify-center"
                    >
                      Info
                    </button>
                    <button
                      onClick={() => handleAddToCart(tree)}
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
