import React, { useState, useEffect } from 'react';
import api from '../api';
import { toast } from 'react-toastify';

function NotificationSettings({ isOpen, onClose }) {
  const [settings, setSettings] = useState({
    smsOptIn: true,
    pushOptIn: true,
    emailOptIn: true,
    inAppOptIn: true
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const fetchProfile = async () => {
        try {
          const res = await api.get('/user/profile');
          setSettings({
            smsOptIn: res.data.smsOptIn !== false,
            pushOptIn: res.data.pushOptIn !== false,
            emailOptIn: res.data.emailOptIn !== false,
            inAppOptIn: res.data.inAppOptIn !== false
          });
        } catch (err) {
          console.error('Failed to load settings', err);
        }
      };
      fetchProfile();
    }
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, checked } = e.target;
    setSettings(prev => ({ ...prev, [name]: checked }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.put('/user/preferences', settings);
      toast.success('Notification preferences updated successfully');
      onClose();
    } catch (error) {
      toast.error('Failed to update preferences');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4" id="modal-title">
              Notification Preferences
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">In-App Notifications</h4>
                  <p className="text-xs text-gray-500">Receive popup alerts while using the app.</p>
                </div>
                <label className="flex items-center cursor-pointer">
                  <div className="relative">
                    <input type="checkbox" name="inAppOptIn" checked={settings.inAppOptIn} onChange={handleChange} className="sr-only" />
                    <div className={`block w-10 h-6 rounded-full transition-colors ${settings.inAppOptIn ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${settings.inAppOptIn ? 'transform translate-x-4' : ''}`}></div>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">SMS Notifications</h4>
                  <p className="text-xs text-gray-500">Get text messages for urgent alerts.</p>
                </div>
                <label className="flex items-center cursor-pointer">
                  <div className="relative">
                    <input type="checkbox" name="smsOptIn" checked={settings.smsOptIn} onChange={handleChange} className="sr-only" />
                    <div className={`block w-10 h-6 rounded-full transition-colors ${settings.smsOptIn ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${settings.smsOptIn ? 'transform translate-x-4' : ''}`}></div>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Push Notifications</h4>
                  <p className="text-xs text-gray-500">Receive browser push notifications.</p>
                </div>
                <label className="flex items-center cursor-pointer">
                  <div className="relative">
                    <input type="checkbox" name="pushOptIn" checked={settings.pushOptIn} onChange={handleChange} className="sr-only" />
                    <div className={`block w-10 h-6 rounded-full transition-colors ${settings.pushOptIn ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${settings.pushOptIn ? 'transform translate-x-4' : ''}`}></div>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Email Notifications</h4>
                  <p className="text-xs text-gray-500">Receive daily summaries and important updates.</p>
                </div>
                <label className="flex items-center cursor-pointer">
                  <div className="relative">
                    <input type="checkbox" name="emailOptIn" checked={settings.emailOptIn} onChange={handleChange} className="sr-only" />
                    <div className={`block w-10 h-6 rounded-full transition-colors ${settings.emailOptIn ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${settings.emailOptIn ? 'transform translate-x-4' : ''}`}></div>
                  </div>
                </label>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button 
              type="button" 
              onClick={handleSave}
              disabled={loading}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
            >
              {loading ? 'Saving...' : 'Save Preferences'}
            </button>
            <button 
              type="button" 
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NotificationSettings;
