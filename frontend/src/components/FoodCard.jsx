function FoodCard({ food, userRole, onRequest, onPickup, requestQuantity, onQuantityChange, hasRequested, myRequest }) {
  return (
    <div className="card-gradient p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-800">{food.foodType}</h3>
          {userRole === 'receiver' && (
            <p className="text-sm text-primary-600 font-medium">
              by {food.donorId?.name} ({food.donorId?.subRole})
            </p>
          )}
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
          food.status === 'available' 
            ? 'bg-secondary-100 text-secondary-700' 
            : 'bg-gray-100 text-gray-600'
        }`}>
          {food.remainingQuantity} left
        </span>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {food.locationName || food.location}
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Expires: {new Date(food.expiryTime).toLocaleString()}
        </div>
      </div>

      {food.description && (
        <p className="text-sm text-gray-600 mb-4">{food.description}</p>
      )}

      {/* Actions based on user role */}
      {userRole === 'receiver' && !hasRequested && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="number"
              min="1"
              max={food.remainingQuantity}
              placeholder="Qty"
              className="w-20 input-field py-2"
              value={requestQuantity || ''}
              onChange={(e) => onQuantityChange(food._id, e.target.value)}
            />
            <button
              onClick={() => onRequest(food._id)}
              className="flex-1 bg-gradient-to-r from-accent-500 to-accent-600 text-white font-semibold rounded-lg py-2 hover:from-accent-600 hover:to-accent-700 transition-all"
            >
              Request
            </button>
          </div>
          <p className="text-xs text-gray-500">Max: {food.remainingQuantity} meals</p>
        </div>
      )}

      {userRole === 'receiver' && hasRequested && myRequest?.status === 'requested' && (
        <div className="space-y-2">
          <p className="text-sm text-yellow-600">
            You requested {myRequest.quantity} meals
          </p>
          <button
            onClick={() => onPickup(food._id)}
            className="w-full btn-secondary"
          >
            Mark as Picked Up
          </button>
        </div>
      )}

      {userRole === 'receiver' && hasRequested && myRequest?.status === 'picked' && (
        <div className="bg-secondary-100 text-secondary-700 text-center py-2 rounded-lg text-sm font-semibold">
          ✓ Picked up
        </div>
      )}
    </div>
  );
}

export default FoodCard;
