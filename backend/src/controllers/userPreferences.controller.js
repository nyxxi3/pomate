import UserPreferences from "../models/userPreferences.model.js";

// Get user preferences
export const getUserPreferences = async (req, res) => {
  try {
    const preferences = await UserPreferences.findOne({ userId: req.user._id });
    
    if (!preferences) {
      // Create default preferences if none exist
      const defaultPreferences = new UserPreferences({
        userId: req.user._id,
        dashboardLayout: [],
        theme: 'light',
        notifications: {
          email: true,
          push: true,
          sound: true
        }
      });
      
      await defaultPreferences.save();
      return res.json(defaultPreferences);
    }
    
    res.json(preferences);
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    res.status(500).json({ message: 'Failed to fetch user preferences' });
  }
};

// Update user preferences
export const updateUserPreferences = async (req, res) => {
  try {
    const { dashboardLayout, theme, notifications } = req.body;
    
    const preferences = await UserPreferences.findOneAndUpdate(
      { userId: req.user._id },
      {
        ...(dashboardLayout && { dashboardLayout }),
        ...(theme && { theme }),
        ...(notifications && { notifications })
      },
      { new: true, upsert: true }
    );
    
    res.json(preferences);
  } catch (error) {
    console.error('Error updating user preferences:', error);
    res.status(500).json({ message: 'Failed to update user preferences' });
  }
};

// Update dashboard layout specifically
export const updateDashboardLayout = async (req, res) => {
  try {
    const { layout } = req.body;
    
    const preferences = await UserPreferences.findOneAndUpdate(
      { userId: req.user._id },
      { dashboardLayout: layout },
      { new: true, upsert: true }
    );
    
    res.json(preferences);
  } catch (error) {
    console.error('Error updating dashboard layout:', error);
    res.status(500).json({ message: 'Failed to update dashboard layout' });
  }
};

