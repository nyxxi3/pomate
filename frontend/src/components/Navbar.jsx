import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { useMobileSidebarStore } from "../store/useMobileSidebarStore";
import { LogOut, PaintRoller, User, Menu, MoreVertical, ArrowLeft } from "lucide-react";
import { useState, useEffect, useRef } from "react";

const Navbar = () => {
  const { logout, authUser } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const isOnSettingsPage = location.pathname === "/settings";
  const isOnProfilePage = location.pathname === "/profile";
  const [isThreeDotMenuOpen, setIsThreeDotMenuOpen] = useState(false);
  const { isMobileSidebarOpen, setIsMobileSidebarOpen } = useMobileSidebarStore();
  const threeDotMenuRef = useRef(null);

  // Close three-dot menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (threeDotMenuRef.current && !threeDotMenuRef.current.contains(event.target)) {
        setIsThreeDotMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSettingsClick = () => {
    if (isOnSettingsPage) {
      // Go back to previous page or home
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate("/");
      }
    } else {
      navigate("/settings");
    }
    setIsMenuOpen(false);
    setIsThreeDotMenuOpen(false);
  };

  const handleProfileClick = () => {
    if (isOnProfilePage) {
      // Go back to previous page or home
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate("/");
      }
    } else {
      navigate("/profile");
    }
    setIsMenuOpen(false);
    setIsThreeDotMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    setIsMenuOpen(false);
    setIsThreeDotMenuOpen(false);
    setIsMobileSidebarOpen(false);
  };

  const handleMobileSidebarToggle = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  return (
    <header
      className="bg-base-100 border-b border-base-300 fixed w-full top-0 z-40 
    backdrop-blur-lg bg-base-100/80"
    >
      <div className="w-full px-4 h-16">
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center gap-2.5">
            {authUser ? (
              <button
                onClick={handleMobileSidebarToggle}
                className="btn btn-sm btn-ghost"
                aria-label="Toggle sidebar"
              >
                {isMobileSidebarOpen ? <ArrowLeft className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            ) : (
              <img src="/pixel tomato.png" alt="Pomate" className="w-8 h-8" />
            )}
            <Link to="/" className="flex items-center gap-2.5 hover:opacity-80 transition-all">
              <h1 className="text-3xl font-bold font-fredoka text-primary">pomate.</h1>
            </Link>
          </div>

          {/* Right-side three-dot menu (mobile only) */}
          <div className="relative sm:hidden">
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => setIsThreeDotMenuOpen(!isThreeDotMenuOpen)}
              aria-label="Open menu"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            {isThreeDotMenuOpen && (
              <div ref={threeDotMenuRef} className="absolute right-0 mt-2 w-44 bg-base-100 border border-base-300 rounded-lg shadow-lg z-50">
                <button
                  onClick={handleSettingsClick}
                  className={`w-full text-left px-4 py-2 rounded-t-lg transition-colors ${
                    isOnSettingsPage ? "bg-primary text-primary-content" : "hover:bg-base-200"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <PaintRoller className="w-4 h-4" />
                    <span>Themes</span>
                  </div>
                </button>
                {authUser ? (
                  <>
                    <button
                      onClick={handleProfileClick}
                      className={`w-full text-left px-4 py-2 transition-colors ${
                        isOnProfilePage ? "bg-primary text-primary-content" : "hover:bg-base-200"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span>Profile</span>
                      </div>
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 rounded-b-lg hover:bg-base-200 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <LogOut className="w-4 h-4" />
                        <span>Logout</span>
                      </div>
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      className="block w-full text-left px-4 py-2 hover:bg-base-200 transition-colors"
                      onClick={() => setIsThreeDotMenuOpen(false)}
                    >
                      <span>Login</span>
                    </Link>
                    <Link
                      to="/signup"
                      className="block w-full text-left px-4 py-2 rounded-b-lg hover:bg-base-200 transition-colors"
                      onClick={() => setIsThreeDotMenuOpen(false)}
                    >
                      <span>Sign Up</span>
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Desktop actions (visible on >= sm) */}
          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={handleSettingsClick}
              className={`btn btn-sm gap-2 transition-colors ${
                isOnSettingsPage ? "btn-primary" : "btn-ghost"
              }`}
            >
              <PaintRoller className="w-4 h-4" />
              Themes
            </button>
            {authUser ? (
              <>
                <button
                  onClick={handleProfileClick}
                  className={`btn btn-sm gap-2 transition-colors ${
                    isOnProfilePage ? "btn-primary" : "btn-ghost"
                  }`}
                >
                  <User className="w-4 h-4" />
                  Profile
                </button>
                <button className="btn btn-sm btn-ghost gap-2" onClick={handleLogout}>
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-sm btn-outline btn-primary">Login</Link>
                <Link to="/signup" className="btn btn-sm btn-primary">Sign Up</Link>
              </>
            )}
          </div>

          {/* No separate desktop actions; three-dot menu is mobile-only */}
        </div>

        {/* Removed legacy non-auth mobile dropdown */}
      </div>
    </header>
  );
};
export default Navbar;
