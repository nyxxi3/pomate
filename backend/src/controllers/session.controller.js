import Session from "../models/session.model.js";

export const createSession = async (req, res) => {
  try {
    const userId = req.user._id;
    const { sessionType, startTime, endTime, duration, status, goal } = req.body;

    console.log("🔍 createSession received:", {
      userId,
      body: req.body,
      sessionType,
      startTime,
      endTime,
      duration,
      status,
      goal
    });

    if (!sessionType || !startTime || !endTime || !duration || !status) {
      console.log("❌ Missing required fields:", { sessionType, startTime, endTime, duration, status });
      return res.status(400).json({ message: "Missing required fields" });
    }

    const doc = await Session.create({
      userId,
      sessionType,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      duration,
      status,
      goal: goal || "",
    });

    res.status(201).json(doc);
  } catch (error) {
    console.error("Error in createSession: ", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const dayOfWeek = (now.getDay() + 6) % 7; // Monday=0
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [today, week, month, year, todayFocus, weekFocus, monthFocus, yearFocus, totalFocus] = await Promise.all([
      Session.countDocuments({ userId, status: "completed", createdAt: { $gte: startOfDay } }),
      Session.countDocuments({ userId, status: "completed", createdAt: { $gte: startOfWeek } }),
      Session.countDocuments({ userId, status: "completed", createdAt: { $gte: startOfMonth } }),
      Session.countDocuments({ userId, status: "completed", createdAt: { $gte: startOfYear } }),
      // Focus time for each period
      Session.aggregate([
        { $match: { userId, status: "completed", sessionType: "focus", createdAt: { $gte: startOfDay } } },
        { $group: { _id: null, seconds: { $sum: "$duration" } } },
      ]),
      Session.aggregate([
        { $match: { userId, status: "completed", sessionType: "focus", createdAt: { $gte: startOfWeek } } },
        { $group: { _id: null, seconds: { $sum: "$duration" } } },
      ]),
      Session.aggregate([
        { $match: { userId, status: "completed", sessionType: "focus", createdAt: { $gte: startOfMonth } } },
        { $group: { _id: null, seconds: { $sum: "$duration" } } },
      ]),
      Session.aggregate([
        { $match: { userId, status: "completed", sessionType: "focus", createdAt: { $gte: startOfYear } } },
        { $group: { _id: null, seconds: { $sum: "$duration" } } },
      ]),
      Session.aggregate([
        { $match: { userId, status: "completed", sessionType: "focus" } },
        { $group: { _id: null, seconds: { $sum: "$duration" } } },
      ]),
    ]);

    res.json({
      todayCompletedCount: today,
      weekCompletedCount: week,
      monthCompletedCount: month,
      yearCompletedCount: year,
      todayFocusSeconds: todayFocus[0]?.seconds || 0,
      weekFocusSeconds: weekFocus[0]?.seconds || 0,
      monthFocusSeconds: monthFocus[0]?.seconds || 0,
      yearFocusSeconds: yearFocus[0]?.seconds || 0,
      totalFocusSeconds: totalFocus[0]?.seconds || 0,
    });
  } catch (error) {
    console.error("Error in getStats: ", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};



