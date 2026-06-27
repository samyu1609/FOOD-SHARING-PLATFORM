import React, { useState, useEffect, useRef } from 'react';
import socket from '../socket';
import api from '../api';
import { toast } from 'react-toastify';

function NotificationBell({ user }) {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get('/user/notifications');
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.isRead).length);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  useEffect(() => {
    if (!user || !user._id) return;
    fetchNotifications();

    socket.connect();
    socket.on('newNotification', (data) => {
      if (!data.userId || data.userId.toString() === user._id.toString()) {
        fetchNotifications();
        
        // Show Toast for the new notification if not in background
        if (data.type === 'urgent' || data.type === 'food_alert') {
          toast.warning(data.title + ': ' + data.message);
        } else {
          toast.info(data.title + ': ' + data.message);
        }
      }
    });

    return () => {
      socket.off('newNotification');
    };
  }, [user?._id]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = async () => {
    if (!user || !user._id) return;
    setIsOpen(!isOpen);
    
    if (!isOpen && unreadCount > 0) {
      try {
        await api.put('/user/notifications/all/read');
        setUnreadCount(0);
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      } catch (error) {
        console.error('Failed to mark read', error);
      }
    }
  };

  if (!user || !user._id) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={toggleDropdown}
        className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors focus:outline-none"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-600 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
            <h3 className="font-semibold text-gray-700">Notifications</h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                No notifications yet
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {notifications.map((notif) => (
                  <li key={notif._id} className={`p-4 hover:bg-gray-50 transition-colors ${notif.isRead ? 'opacity-70' : 'bg-blue-50/30'}`}>
                    <h4 className="text-sm font-bold text-gray-800">{notif.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{notif.message}</p>
                    <span className="text-xs text-gray-400 mt-1 block">
                      {new Date(notif.createdAt).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
