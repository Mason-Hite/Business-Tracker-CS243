export default function ShoppingList() {
    return (
        <div className="p-8">
            <div className="max-w-4xl">
                <h1 className="text-4xl font-bold text-gray-900 mb-2">Shopping List</h1>
                <p className="text-gray-600 mb-8">Track tools, materials, and supplies you need to buy</p>

                <div className="bg-white rounded-3xl p-12 shadow-sm border border-gray-100 text-center">
                    <div className="text-7xl mb-6">🛒</div>
                    <h3 className="text-2xl font-semibold text-gray-900 mb-3">Shopping List Coming Soon</h3>
                    <p className="text-gray-500 max-w-sm mx-auto">
                        Add items you need to purchase, set priorities, and mark them as bought.
                    </p>
                    <div className="mt-8 inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-2xl text-sm font-medium">
                        Feature in development
                    </div>
                </div>
            </div>
        </div>
    );
}