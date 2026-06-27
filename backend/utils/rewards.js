import mongoose from 'mongoose';
import generateCertificate from './certificate.js';
import { io } from '../server.js';
import { notifyRewardPoints, notifyCertificate } from './notifications.js';

export const checkAndAwardCertificates = async (user) => {
  let earnedNew = false;
  
  if (user.role === 'donor') {
    const milestones = [
      { points: 100, title: 'Bronze Donor Certificate', badge: 'Bronze', details: 'In recognition of sharing 100+ meals to feed the hungry and support the local community through Hunger Bridge.' },
      { points: 300, title: 'Silver Donor Certificate', badge: 'Silver', details: 'Awarded for exceptional monthly contributions of 300+ meals to help feed underprivileged families.' },
      { points: 700, title: 'Gold Donor Certificate', badge: 'Gold', details: 'Presented in deep appreciation for donating 700+ high-quality meals and maintaining a consistent donor profile.' },
      { points: 1500, title: 'Platinum Donor Certificate', badge: 'Platinum', details: 'Highly distinguished honor awarded for outstanding humanitarian service, donating 1500+ meals to orphanages and NGO partners.' },
      { points: 3000, title: 'Community Hero Certificate', badge: 'Legend', details: 'The highest honor of Hunger Bridge, awarded to a true Community Hero for donating over 3000+ meals and saving massive quantities of food waste.' }
    ];

    for (const mil of milestones) {
      if (user.points >= mil.points && !user.certificates.some(c => c.title === mil.title)) {
        const certId = new mongoose.Types.ObjectId();
        const certUrl = await generateCertificate(user, mil.title, certId, mil.details);
        user.certificates.push({
          _id: certId,
          title: mil.title,
          url: certUrl
        });
        if (!user.badges.includes(mil.badge)) {
          user.badges.push(mil.badge);
        }
        earnedNew = true;

        await notifyCertificate(user._id);
        io.emit('certificateUnlocked', { userId: user._id, title: mil.title });
      }
    }
  } else if (user.role === 'receiver') {
    const milestones = [
      { points: 100, title: 'Community Support Certificate', badge: 'Bronze', details: 'Awarded for successfully receiving and distributing 100+ points worth of food, helping support poor neighborhoods.' },
      { points: 300, title: 'Hunger Relief Certificate', badge: 'Silver', details: 'In recognition of active participation and dedication in receiving, distributing, and preventing food waste.' },
      { points: 700, title: 'Social Impact Certificate', badge: 'Gold', details: 'Presented for outstanding social impact, serving food consistently to orphanages, ashrams, and those in distress.' },
      { points: 1500, title: 'Food Distribution Excellence Certificate', badge: 'Platinum', details: 'Awarded for demonstrating logistics and feedback excellence, successfully executing mass food distribution drives.' },
      { points: 3000, title: 'Humanitarian Service Certificate', badge: 'Legend', details: 'Hunger Bridge\'s highest receiver achievement, presented for life-saving humanitarian service, distributing thousands of meals.' }
    ];

    for (const mil of milestones) {
      if (user.points >= mil.points && !user.certificates.some(c => c.title === mil.title)) {
        const certId = new mongoose.Types.ObjectId();
        const certUrl = await generateCertificate(user, mil.title, certId, mil.details);
        user.certificates.push({
          _id: certId,
          title: mil.title,
          url: certUrl
        });
        if (!user.badges.includes(mil.badge)) {
          user.badges.push(mil.badge);
        }
        earnedNew = true;

        await notifyCertificate(user._id);
        io.emit('certificateUnlocked', { userId: user._id, title: mil.title });
      }
    }
  }

  return earnedNew;
};

export const awardPoints = async (user, points, message) => {
  user.points += points;
  
  await notifyRewardPoints(user._id, points);
  io.emit('pointsUpdated', { userId: user._id, points: user.points });
  
  // Evaluate and award certificate milestones
  await checkAndAwardCertificates(user);
  await user.save();
};
