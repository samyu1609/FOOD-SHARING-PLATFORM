import { io } from '../server.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import webpush from 'web-push';

// Web Push setup
const publicVapidKey = process.env.VAPID_PUBLIC_KEY || 'BEl62iENl1pQ11yVfS14Q_6rVfK3y1QzM1s9Q18r12s_Q18Q18rVfK3y1QzM1s9Q18r12s';
const privateVapidKey = process.env.VAPID_PRIVATE_KEY || '8Z_18rVfK3y1QzM1s9Q18r12s_Q18Q18rVfK3y1QzM1s';

try {
  webpush.setVapidDetails('mailto:admin@hungerbridge.com', publicVapidKey, privateVapidKey);
} catch (e) {
  console.log('Web push not fully configured, running without Web Push keys');
}

/**
 * Universal alert sender that handles Database saving, WebSockets, Web Push, and SMS.
 */
export const sendAlert = async (userId, title, message, type = 'system', phone = null) => {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    // 1. Save to DB (In-App History)
    let notification;
    if (user.inAppOptIn) {
      notification = await Notification.create({
        userId,
        title,
        message,
        type
      });
      // 2. Real-time Socket (Popup)
      io.emit('newNotification', { userId, ...notification.toObject() });
    }

    // 3. Web Push (If user has subscription and opted in)
    if (user.pushOptIn && user.pushSubscription) {
      const payload = JSON.stringify({ title, body: message, icon: '/icon.png' });
      try {
        await webpush.sendNotification(user.pushSubscription, payload);
      } catch (err) {
        console.error('Push error (maybe expired token):', err.message);
      }
    }

    // 4. SMS Mock Implementation
    if (phone && user.smsOptIn) {
      console.log(`\n📱 [SMS Sentinel] To: ${phone} | TITLE: ${title} | MSG: "${message}"\n`);
    }

    // 5. Email Mock Implementation
    if (user.emailOptIn) {
      console.log(`\n📧 [Email Sentinel] To: ${user.email} | TITLE: ${title} | MSG: "${message}"\n`);
    }

    return notification;
  } catch (error) {
    console.error('Error sending alert:', error);
  }
};

const sendSMS = async (phoneNumber, message, userId = null) => {
  console.log(`[SMS Sentinel] To: ${phoneNumber} | MSG: "${message}"`);
  return { success: true, message: 'SMS sent (mock)' };
};

const notifyReceiversOfNewFood = async (food) => {
  try {
    const receivers = await User.find({ role: 'receiver' });
    
    const message = `🍱 HungerBridge Alert: New food available! "${food.foodType}" from "${food.donorId?.name || 'Local Donor'}" at ${food.locationName}. Open HungerBridge to view and accept.`;
    const title = 'New Food Available Near You!';
    
    let notifiedCount = 0;
    for (const receiver of receivers) {
      await sendAlert(receiver._id, title, message, 'food_alert', receiver.phone);
      notifiedCount++;
    }
    
    return { success: true, notified: notifiedCount };
  } catch (error) {
    console.error('Error notifying receivers:', error);
    return { success: false, error: error.message };
  }
};

const notifyDonorOfRequest = async (food, receiver, requestType = 'requested') => {
  try {
    const donor = await User.findById(food.donorId);
    if (!donor) return { success: false, error: 'Donor not found' };
    
    const title = requestType === 'requested' ? 'Food Request Received' : 'Pickup Confirmed';
    const message = requestType === 'requested' 
      ? `📱 ${receiver.name} has requested ${receiver.quantity} meals of your "${food.foodType}".`
      : `✅ ${receiver.name} has confirmed pickup of ${receiver.quantity} meals of your "${food.foodType}". Thank you!`;
    
    await sendAlert(donor._id, title, message, requestType === 'requested' ? 'food_alert' : 'pickup_confirmed', donor.phone);
    return { success: true };
  } catch (error) {
    console.error('Error notifying donor:', error);
    return { success: false, error: error.message };
  }
};

const notifyReceiverOfConfirmation = async (receiverId, message) => {
  try {
    const receiver = await User.findById(receiverId);
    if (!receiver) return { success: false, error: 'Receiver not found' };
    
    await sendAlert(receiverId, 'Pickup Status', message, 'pickup_confirmed', receiver.phone);
    return { success: true };
  } catch (error) {
    console.error('Error notifying receiver:', error);
    return { success: false, error: error.message };
  }
};

const notifyVolunteerAssigned = async (volunteerId, food) => {
  try {
    const volunteer = await User.findById(volunteerId);
    if (!volunteer) return { success: false, error: 'Volunteer not found' };
    
    await sendAlert(volunteerId, 'New Delivery Assigned', `A new delivery for "${food.foodType}" at ${food.locationName} has been assigned to you.`, 'system', volunteer.phone);
    return { success: true };
  } catch (error) {
    console.error('Error notifying volunteer:', error);
    return { success: false, error: error.message };
  }
};

const notifyFoodDelivered = async (food) => {
  try {
    const donor = await User.findById(food.donorId);
    if (donor) {
      await sendAlert(donor._id, 'Food Delivered Successfully', `Your donation of "${food.foodType}" has successfully reached the receiver. Thank you for making a difference!`, 'system', donor.phone);
    }
    
    for (const request of food.requests) {
      if (request.status === 'delivered') {
        const receiver = await User.findById(request.receiverId);
        if (receiver) {
          await sendAlert(receiver._id, 'Food Delivered', `The food "${food.foodType}" has been delivered to you.`, 'system', receiver.phone);
        }
      }
    }
  } catch (error) {
    console.error('Error notifying delivery:', error);
  }
};

const notifyRewardPoints = async (userId, points) => {
  try {
    const user = await User.findById(userId);
    if (!user) return;
    await sendAlert(userId, 'Points Earned!', `Congratulations! You earned ${points} HungerBridge reward points.`, 'points', user.phone);
  } catch (error) {
    console.error('Error notifying points:', error);
  }
};

const notifyCertificate = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) return;
    await sendAlert(userId, 'Certificate Generated!', `Congratulations! Your HungerBridge achievement certificate has been generated. Download it from your dashboard.`, 'system', user.phone);
  } catch (error) {
    console.error('Error notifying certificate:', error);
  }
};

export {
  sendSMS,
  notifyReceiversOfNewFood,
  notifyDonorOfRequest,
  notifyReceiverOfConfirmation,
  notifyVolunteerAssigned,
  notifyFoodDelivered,
  notifyRewardPoints,
  notifyCertificate
};
