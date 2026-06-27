import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import api from '../api';

const foodVarieties = [
  'Rice & Curry',
  'Biryani',
  'Pulao',
  'Pizza',
  'Burger',
  'Sandwich',
  'Pasta',
  'Noodles',
  'Fried Rice',
  'Chapati / Roti',
  'Dal',
  'Vegetable Curry',
  'Chicken Curry',
  'Fish Curry',
  'Egg Curry',
  'Paneer Curry',
  'Dosa',
  'Idli',
  'Vada',
  'Sambar',
  'Rasam',
  'Paratha',
  'Poori',
  'Bread',
  'Biscuits',
  'Cake',
  'Pastry',
  'Fruits',
  'Juice',
  'Milk',
  'Yogurt',
  'Sweets / Desserts',
  'Snacks',
  'Other'
];

function UploadFoodForm({ onFoodAdded }) {
  const [formData, setFormData] = useState({
    foodType: '',
    totalQuantity: '',
    expiryTime: '',
    description: '',
    locationName: '',
    latitude: '',
    longitude: ''
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  
  // Camera states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isCameraMode, setIsCameraMode] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // Camera functions
  const startCamera = async () => {
    console.log('Starting camera...');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true,
        audio: false 
      });
      console.log('Camera stream obtained:', stream);
      streamRef.current = stream;
      setIsCameraActive(true);
      
      // Attach stream to video element
      setTimeout(() => {
        console.log('Attaching stream to video element...', videoRef.current);
        if (videoRef.current && streamRef.current) {
          videoRef.current.srcObject = streamRef.current;
          videoRef.current.play()
            .then(() => console.log('Video playing'))
            .catch(err => console.error('Error playing video:', err));
        } else {
          console.error('Video ref or stream ref is null');
        }
      }, 200);
      
      toast.success('Camera started!');
    } catch (err) {
      console.error('Camera error details:', err.name, err.message);
      toast.error(`Camera error: ${err.message}`);
      setIsCameraMode(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob((blob) => {
      const file = new File([blob], 'captured-food.jpg', { type: 'image/jpeg' });
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      stopCamera();
      setIsCameraMode(false);
      toast.success('Image captured!');
    }, 'image/jpeg', 0.9);
  };

  const toggleCameraMode = () => {
    console.log('Toggle camera mode, current:', isCameraMode);
    if (isCameraMode) {
      stopCamera();
      setIsCameraMode(false);
    } else {
      setIsCameraMode(true);
    }
  };

  // Start camera when isCameraMode becomes true
  useEffect(() => {
    if (isCameraMode) {
      console.log('Camera mode enabled, starting camera...');
      // Small delay to ensure video element is rendered
      const timer = setTimeout(() => {
        startCamera();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isCameraMode]);

  const getCurrentLocation = () => {
    setIsGettingLocation(true);
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      setIsGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        // Get address from coordinates using reverse geocoding
        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`)
          .then(res => res.json())
          .then(data => {
            const address = data.display_name || `${latitude}, ${longitude}`;
            setFormData({
              ...formData,
              locationName: address,
              latitude: latitude.toString(),
              longitude: longitude.toString()
            });
            toast.success('GPS location captured!');
          })
          .catch(() => {
            setFormData({
              ...formData,
              locationName: `${latitude}, ${longitude}`,
              latitude: latitude.toString(),
              longitude: longitude.toString()
            });
            toast.success('GPS location captured!');
          });
        setIsGettingLocation(false);
      },
      (error) => {
        toast.error('Failed to get location: ' + error.message);
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Auto-get location on component mount
  useEffect(() => {
    getCurrentLocation();
  }, []);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const dataToSubmit = new FormData();
      dataToSubmit.append('foodType', formData.foodType);
      dataToSubmit.append('totalQuantity', formData.totalQuantity);
      dataToSubmit.append('expiryTime', formData.expiryTime);
      dataToSubmit.append('description', formData.description);
      dataToSubmit.append('locationName', formData.locationName);
      
      if (formData.latitude && formData.longitude) {
        dataToSubmit.append('latitude', formData.latitude);
        dataToSubmit.append('longitude', formData.longitude);
      }

      if (imageFile) {
        dataToSubmit.append('image', imageFile);
      }

      const { data } = await api.post('/food/addFood', dataToSubmit, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('Food uploaded successfully!');
      setFormData({
        foodType: '',
        totalQuantity: '',
        expiryTime: '',
        description: '',
        locationName: '',
        latitude: '',
        longitude: ''
      });
      setImageFile(null);
      setImagePreview(null);
      onFoodAdded();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to upload food');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Food Type</label>
        <select
          name="foodType"
          value={formData.foodType}
          onChange={handleChange}
          className="input-field"
          required
        >
          <option value="">Select food type</option>
          {foodVarieties.map((food) => (
            <option key={food} value={food}>{food}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Quantity (meals)</label>
        <input
          type="number"
          name="totalQuantity"
          value={formData.totalQuantity}
          onChange={handleChange}
          className="input-field"
          placeholder="Number of meals"
          min="1"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Time</label>
        <input
          type="datetime-local"
          name="expiryTime"
          value={formData.expiryTime}
          onChange={handleChange}
          className="input-field"
          required
        />
      </div>

      {/* GPS Location - Required */}
      <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Location <span className="text-red-500">*</span>
          <span className="text-xs text-gray-500 block">GPS location is required for food pickup</span>
        </label>
        
        {!formData.locationName ? (
          <button
            type="button"
            onClick={getCurrentLocation}
            disabled={isGettingLocation}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg px-4 py-3 hover:from-blue-600 hover:to-blue-700 transition-all flex items-center justify-center gap-2"
          >
            {isGettingLocation ? (
              <>
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Getting Location...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Get Current GPS Location
              </>
            )}
          </button>
        ) : (
          <div className="bg-white rounded-lg p-3">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div className="flex-1">
                <p className="text-sm text-gray-700 font-medium">Location captured successfully</p>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{formData.locationName}</p>
                <p className="text-xs text-gray-400 mt-1">GPS: {formData.latitude?.slice(0, 8)}, {formData.longitude?.slice(0, 8)}</p>
              </div>
              <button
                type="button"
                onClick={getCurrentLocation}
                disabled={isGettingLocation}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Refresh
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Food Image Upload with Camera */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Food Image</label>
        
        {/* Hidden canvas for capturing */}
        <canvas ref={canvasRef} className="hidden" />
        
        {/* Camera Mode */}
        {isCameraMode ? (
          <div className="relative bg-black rounded-xl overflow-hidden">
            {!isCameraActive && (
              <div className="absolute inset-0 flex items-center justify-center text-white">
                <div className="flex flex-col items-center gap-2">
                  <svg className="w-8 h-8 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-sm">Starting camera...</span>
                </div>
              </div>
            )}
            <video
              ref={(el) => {
                videoRef.current = el;
                console.log('Video element set:', el);
              }}
              autoPlay
              playsInline
              muted
              className="w-full h-64 object-cover bg-gray-900"
              style={{ minHeight: '256px' }}
            />
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
              <button
                type="button"
                onClick={captureImage}
                className="bg-white text-gray-900 rounded-full p-4 shadow-lg hover:bg-gray-100 transition-all"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={toggleCameraMode}
                className="bg-red-500 text-white rounded-full p-4 shadow-lg hover:bg-red-600 transition-all"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="absolute top-4 left-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
              Live Camera
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {/* Upload/Gallery Option */}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
              id="food-image"
            />
            
            {/* Buttons row */}
            <div className="grid grid-cols-2 gap-2">
              <label
                htmlFor="food-image"
                className="cursor-pointer bg-gradient-to-r from-purple-500 to-purple-600 text-white font-semibold rounded-lg px-4 py-3 text-center hover:from-purple-600 hover:to-purple-700 transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Gallery
              </label>
              
              <button
                type="button"
                onClick={toggleCameraMode}
                className="bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg px-4 py-3 hover:from-blue-600 hover:to-blue-700 transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Camera
              </button>
            </div>
            
            {/* Image Preview */}
            {imagePreview && (
              <div className="relative mt-2">
                <img
                  src={imagePreview}
                  alt="Food preview"
                  className="w-full h-48 object-cover rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => {
                    setImageFile(null);
                    setImagePreview(null);
                  }}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          className="input-field"
          rows="3"
          placeholder="Additional details about the food..."
        />
      </div>

      <button type="submit" className="w-full btn-secondary">
        Upload Food
      </button>
    </form>
  );
}

export default UploadFoodForm;
