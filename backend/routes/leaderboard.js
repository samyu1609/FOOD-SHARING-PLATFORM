import express from 'express';
import User from '../models/User.js';
import Food from '../models/Food.js';

const router = express.Router();

// Restaurant Leaderboard
router.get('/restaurants', async (req, res) => {
  try {
    const donors = await User.find({ role: 'donor' })
      .select('name points badges locationName createdAt')
      .sort({ points: -1 })
      .limit(20);

    const leaderboard = await Promise.all(donors.map(async (donor, index) => {
      // Calculate total meals shared
      const foods = await Food.find({ donorId: donor._id });
      const totalMealsShared = foods.reduce((sum, f) => sum + f.totalQuantity, 0);

      // Monthly donations
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const monthlyFoods = await Food.find({ donorId: donor._id, createdAt: { $gte: thirtyDaysAgo } });
      const monthlyDonations = monthlyFoods.reduce((sum, f) => sum + f.totalQuantity, 0);

      // Success Rate (approx. ratio of completed to total)
      const completedFoods = foods.filter(f => f.status === 'completed');
      const successRate = foods.length > 0 ? Math.round((completedFoods.length / foods.length) * 100) : 0;

      return {
        _id: donor._id,
        name: donor.name,
        totalDonations: foods.length,
        mealsShared: totalMealsShared,
        peopleHelped: totalMealsShared, // Approx 1 meal = 1 person
        monthlyDonations,
        lifetimeDonations: totalMealsShared,
        successRate,
        points: donor.points,
        badges: donor.badges,
        rank: index + 1
      };
    }));

    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Volunteer Leaderboard
router.get('/volunteers', async (req, res) => {
  try {
    // Both NGO and NSS Students act as volunteers picking up food
    const volunteers = await User.find({ role: 'receiver' })
      .select('name points badges level pickupCount successfulPickups hoursServed createdAt')
      .sort({ points: -1 })
      .limit(20);

    const leaderboard = volunteers.map((vol, index) => {
      return {
        _id: vol._id,
        name: vol.name,
        deliveriesCompleted: vol.successfulPickups || vol.pickupCount,
        hoursServed: vol.hoursServed || Math.round((vol.successfulPickups || vol.pickupCount) * 1.5), // Estimate 1.5 hr per pickup if not set
        mealsDelivered: (vol.successfulPickups || vol.pickupCount) * 10, // Approximate meals per pickup if tracking isn't perfect
        peopleHelped: (vol.successfulPickups || vol.pickupCount) * 10,
        currentPoints: vol.points,
        level: vol.level || 1,
        badges: vol.badges,
        rank: index + 1
      };
    });

    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
