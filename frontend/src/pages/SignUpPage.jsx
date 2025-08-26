import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Eye, EyeOff, Loader2, Lock, Mail, MessageSquare, User } from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import AuthImagePattern from "../components/AuthImagePattern";

const SignUpPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
  });

  // UI-only fields for onboarding wizard (not sent to API)
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldOfStudy, setFieldOfStudy] = useState("");
  const [timeZone, setTimeZone] = useState("");
  const [preferences, setPreferences] = useState({
    dailyCheckins: false,
    goalTracking: false,
    jointSessions: false,
    motivationSupport: false,
    deadlineReminders: false,
    careerPrep: false,
  });

  const { signup, isSigningUp } = useAuthStore();

  const validateStepOne = () => {
    const newErrors = {};
    
    if (!formData.fullName.trim()) {
      newErrors.fullName = "Full name is required";
    }
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      toast.error("Please fix the errors below");
      return false;
    }
    
    return true;
  };

  const validateStepTwo = () => {
    const newErrors = {};
    
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }
    if (confirmPassword !== formData.password) {
      newErrors.confirmPassword = "Passwords do not match";
    }
    if (!fieldOfStudy.trim()) {
      newErrors.fieldOfStudy = "Field of study is required";
    }
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      toast.error("Please fix the errors below");
      return false;
    }
    
    return true;
  };

  const validateStepThree = () => {
    const newErrors = {};
    
    if (!timeZone) {
      newErrors.timeZone = "Please select your time zone";
    }
    
    // Check if at least one preference is selected
    const hasPreferences = Object.values(preferences).some(pref => pref);
    if (!hasPreferences) {
      newErrors.preferences = "Please select at least one study goal";
    }
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      toast.error("Please fix the errors below");
      return false;
    }
    
    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate step 3 before submission
    if (!validateStepThree()) {
      return;
    }
    
    // Submit original form data to preserve API contract
    signup(formData);
  };

  const goNext = () => {
    let isValid = false;
    
    if (step === 1) {
      isValid = validateStepOne();
    } else if (step === 2) {
      isValid = validateStepTwo();
    } else if (step === 3) {
      isValid = validateStepThree();
    }
    
    if (isValid) {
      setStep((s) => Math.min(3, s + 1));
    }
  };

  const goBack = () => setStep((s) => Math.max(1, s - 1));

  const clearErrors = () => {
    setErrors({});
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left Side - Wizard */}
      <div className="flex flex-col justify-center items-center p-6 sm:p-12 bg-base-100">
        <div className="w-full max-w-md space-y-8">
          {/* Brand & Heading */}
          <div className="text-center">
            <div className="flex flex-col items-center gap-2 group">
              <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <img src="/pixel tomato.png" alt="Tomato" className="size-6" />
              </div>
              <h1 className="text-2xl font-bold mt-2">{step === 1 ? "Create Account" : step === 2 ? "Secure Your Account" : "Customize Your Experience"}</h1>
              <p className="text-base-content/60">
                {step === 1 && "Get started with your free account"}
                {step === 2 && "Create a strong password and tell us about your studies"}
                {step === 3 && "Help us match you with the perfect study buddies"}
              </p>
            </div>
          </div>

          {/* Stepper */}
          <ul className="steps steps-horizontal w-full justify-center">
            <li className={`step ${step >= 1 ? "step-primary" : ""}`}></li>
            <li className={`step ${step >= 2 ? "step-primary" : ""}`}></li>
            <li className={`step ${step >= 3 ? "step-primary" : ""}`}></li>
          </ul>
          <p className="text-center text-sm text-base-content/60">Step {step} of 3{": "}{step === 1 ? "Personal Info" : step === 2 ? "Account Setup" : "Study Preferences"}</p>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {step === 1 && (
              <>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Username</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="size-5 text-base-content/40" />
                    </div>
                    <input
                      type="text"
                      className={`input input-bordered w-full pl-10 ${errors.fullName ? 'input-error' : ''}`}
                      placeholder="johndoe"
                      value={formData.fullName}
                      onChange={(e) => {
                        setFormData({ ...formData, fullName: e.target.value });
                        if (errors.fullName) clearErrors();
                      }}
                    />
                  </div>
                  {errors.fullName && (
                    <label className="label">
                      <span className="label-text-alt text-error">{errors.fullName}</span>
                    </label>
                  )}
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Email</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="size-5 text-base-content/40" />
                    </div>
                    <input
                      type="email"
                      className={`input input-bordered w-full pl-10 ${errors.email ? 'input-error' : ''}`}
                      placeholder="you@example.com"
                      value={formData.email}
                      onChange={(e) => {
                        setFormData({ ...formData, email: e.target.value });
                        if (errors.email) clearErrors();
                      }}
                    />
                  </div>
                  {errors.email && (
                    <label className="label">
                      <span className="label-text-alt text-error">{errors.email}</span>
                    </label>
                  )}
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Password</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="size-5 text-base-content/40" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      className={`input input-bordered w-full pl-10 ${errors.password ? 'input-error' : ''}`}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => {
                        setFormData({ ...formData, password: e.target.value });
                        if (errors.password) clearErrors();
                      }}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="size-5 text-base-content/40" />
                      ) : (
                        <Eye className="size-5 text-base-content/40" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <label className="label">
                      <span className="label-text-alt text-error">{errors.password}</span>
                    </label>
                  )}
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Confirm Password</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="size-5 text-base-content/40" />
                    </div>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      className={`input input-bordered w-full pl-10 ${errors.confirmPassword ? 'input-error' : ''}`}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (errors.confirmPassword) clearErrors();
                      }}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="size-5 text-base-content/40" />
                      ) : (
                        <Eye className="size-5 text-base-content/40" />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <label className="label">
                      <span className="label-text-alt text-error">{errors.confirmPassword}</span>
                    </label>
                  )}
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Field of Study</span>
                  </label>
                  <input
                    type="text"
                    className={`input input-bordered w-full ${errors.fieldOfStudy ? 'input-error' : ''}`}
                    placeholder="e.g., Computer Science, Biology, Literature"
                    value={fieldOfStudy}
                    onChange={(e) => {
                      setFieldOfStudy(e.target.value);
                      if (errors.fieldOfStudy) clearErrors();
                    }}
                  />
                  {errors.fieldOfStudy && (
                    <label className="label">
                      <span className="label-text-alt text-error">{errors.fieldOfStudy}</span>
                    </label>
                  )}
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div>
                  <p className="mb-3">What are your main study goals? <span className="text-base-content/60">(Select all that apply)</span></p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      ["Exam Preparation", "dailyCheckins"],
                      ["Homework Completion", "goalTracking"],
                      ["Group Projects", "jointSessions"],
                      ["Research Papers", "motivationSupport"],
                      ["Skill Building", "deadlineReminders"],
                      ["Career Preparation", "careerPrep"],
                    ].map(([label, key]) => (
                      <label key={key} className="cursor-pointer flex items-center gap-3 p-3 rounded-lg border border-base-300 hover:bg-base-200/50">
                        <input
                          type="checkbox"
                          className="checkbox checkbox-primary"
                          checked={preferences[key] || false}
                          onChange={(e) => {
                            setPreferences({ ...preferences, [key]: e.target.checked });
                            if (errors.preferences) clearErrors();
                          }}
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                  {errors.preferences && (
                    <label className="label">
                      <span className="label-text-alt text-error">{errors.preferences}</span>
                    </label>
                  )}
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Time Zone</span>
                  </label>
                  <select
                    className={`select select-bordered w-full ${errors.timeZone ? 'select-error' : ''}`}
                    value={timeZone}
                    onChange={(e) => {
                      setTimeZone(e.target.value);
                      if (errors.timeZone) clearErrors();
                    }}
                  >
                    <option value="" disabled>
                      Select your time zone
                    </option>
                    <option value="UTC-08:00">Pacific (UTC-08:00)</option>
                    <option value="UTC-05:00">Eastern (UTC-05:00)</option>
                    <option value="UTC+00:00">UTC (UTC+00:00)</option>
                    <option value="UTC+01:00">Central Europe (UTC+01:00)</option>
                    <option value="UTC+05:30">India (UTC+05:30)</option>
                  </select>
                  {errors.timeZone && (
                    <label className="label">
                      <span className="label-text-alt text-error">{errors.timeZone}</span>
                    </label>
                  )}
                </div>
              </>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-center gap-3 pt-2">
              {step > 1 && (
                <button type="button" className="btn btn-ghost" onClick={goBack}>
                  <span className="mr-1">‹</span> Back
                </button>
              )}

              {step < 3 && (
                <button type="button" className="btn btn-primary" onClick={goNext}>
                  Continue
                </button>
              )}

              {step === 3 && (
                <button type="submit" className="btn btn-primary" disabled={isSigningUp}>
                  {isSigningUp ? (
                    <>
                      <Loader2 className="size-5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </button>
              )}
            </div>
          </form>

          <div className="text-center">
            <p className="text-base-content/60">
              Already have an account?{" "}
              <Link to="/login" className="link link-primary">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* right side */}

      <AuthImagePattern
        subtitle={"Connect with like-minded individuals and focus together"}
        title={"Join Pomate!"}
      />
    </div>
  );
};
export default SignUpPage;
