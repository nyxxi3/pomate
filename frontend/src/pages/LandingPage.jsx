import { Link } from "react-router-dom";
import { MessageSquare, Clock, Users, Target, CheckCircle } from "lucide-react";

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-base-100">
      {/* Header */}
      <header className="bg-base-100 border-b border-base-300">
        <div className="container mx-auto px-4 h-16">
          <div className="flex items-center justify-between h-full">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-primary" />
              </div>
              <h1 className="text-lg font-bold text-base-content">pomate.</h1>
            </div>

            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="btn btn-sm btn-outline btn-primary"
              >
                Login
              </Link>
              <Link
                to="/signup"
                className="btn btn-sm btn-primary"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 lg:py-24">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Text Content */}
            <div className="space-y-8 text-center lg:text-left">
              <div className="space-y-4">
                <h1 className="text-4xl lg:text-6xl font-bold text-base-content font-fredoka">
                  Stay Focused with{" "}
                  <span className="text-primary">Accountability</span>
                </h1>
                <p className="text-lg text-base-content/70 max-w-lg mx-auto lg:mx-0">
                  Join thousands of productive people using the Pomodoro Technique with built-in accountability partners. Focus better, achieve more, together.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link
                  to="/signup"
                  className="btn btn-primary btn-lg transition-all duration-300 hover:scale-105 hover:shadow-lg"
                >
                  Start Focusing Now
                </Link>
                <Link
                  to="#why-choose-pomato"
                  className="btn btn-outline btn-primary btn-lg transition-all duration-300 hover:scale-105 hover:shadow-lg"
                >
                  Learn More
                </Link>
              </div>
            </div>

            {/* Right Column - Illustration */}
            <div className="flex justify-center lg:justify-end">
              <div className="relative group">
                {/* Randomly scattered glitter - far from tomato */}
                
                
                {/* Main tomato image - no glow animation */}
                <div className="relative">
                  <img
                    src="/pixel tomato.png"
                    alt="Happy tomato character"
                    className="w-64 h-64 lg:w-80 lg:h-80 object-contain transition-transform duration-500 ease-in-out group-hover:scale-110 group-hover:rotate-3 relative z-5"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Pomato Section */}
      <section id="why-choose-pomato">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-base-content font-fredoka">
              Why Choose Pomate?
            </h2>
            <p className="text-lg text-base-content/70 max-w-2xl mx-auto">
              Traditional Pomodoro apps lack the social element that keeps you motivated. Pomato changes that.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Smart Timer */}
            <div className="card bg-base-100 shadow-lg hover:shadow-xl transition-all duration-300 border border-base-300 hover:border-primary/20 hover:-translate-y-1">
              <div className="card-body text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4 transition-transform duration-300 hover:scale-110">
                  <Clock className="w-6 h-6 text-primary" />
                </div>
                <h3 className="card-title text-base-content justify-center font-fredoka">Smart Timer</h3>
                <p className="text-base-content/70">
                  Customizable Pomodoro sessions with automatic break reminders
                </p>
              </div>
            </div>

            {/* Accountability Partners */}
            <div className="card bg-base-100 shadow-lg hover:shadow-xl transition-all duration-300 border border-base-300 hover:border-primary/20 hover:-translate-y-1">
              <div className="card-body text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4 transition-transform duration-300 hover:scale-110">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <h3 className="card-title text-base-content justify-center font-fredoka">Accountability Partners</h3>
                <p className="text-base-content/70">
                  Get matched with like-minded people to keep each other focused
                </p>
              </div>
            </div>

            {/* Goal Tracking */}
            <div className="card bg-base-100 shadow-lg hover:shadow-xl transition-all duration-300 border border-base-300 hover:border-primary/20 hover:-translate-y-1">
              <div className="card-body text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4 transition-transform duration-300 hover:scale-110">
                  <Target className="w-6 h-6 text-primary" />
                </div>
                <h3 className="card-title text-base-content justify-center font-fredoka">Goal Tracking</h3>
                <p className="text-base-content/70">
                  Set daily targets and track your progress over time
                </p>
              </div>
            </div>

            {/* Habit Building */}
            <div className="card bg-base-100 shadow-lg hover:shadow-xl transition-all duration-300 border border-base-300 hover:border-primary/20 hover:-translate-y-1">
              <div className="card-body text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4 transition-transform duration-300 hover:scale-110">
                  <CheckCircle className="w-6 h-6 text-primary" />
                </div>
                <h3 className="card-title text-base-content justify-center font-fredoka">Habit Building</h3>
                <p className="text-base-content/70">
                  Build consistent focus habits with streaks and achievements
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-6">
            <h2 className="text-3xl lg:text-4xl font-bold text-base-content font-fredoka">
              Ready to Focus Better?
            </h2>
            <p className="text-lg text-base-content/70 max-w-2xl mx-auto">
              Join our community of focused individuals and start your productive journey today.
            </p>
            <Link
              to="/signup"
              className="btn btn-primary btn-lg transition-all duration-300 hover:scale-105 hover:shadow-lg"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
