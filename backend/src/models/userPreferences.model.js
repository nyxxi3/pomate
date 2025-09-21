import mongoose from "mongoose";

const userPreferencesSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    dashboardLayout: {
      type: [{
        id: { type: String, required: true },
        component: { type: String, required: true },
        column: { type: String, enum: ['left', 'right'], required: true }
      }],
      default: []
    },
    theme: { type: String, default: 'light' },
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      sound: { type: Boolean, default: true }
    }
  },
  { timestamps: true }
);

const UserPreferences = mongoose.model("UserPreferences", userPreferencesSchema);

export default UserPreferences;

