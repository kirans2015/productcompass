import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import { PMSearchBar } from "@/components/ui/pm-search-bar";
import { PMCard, PMCardHeader, PMCardTitle, PMCardContent, PMCardFooter } from "@/components/ui/pm-card";
import { PMButton } from "@/components/ui/pm-button";
import { Calendar, Clock, Zap, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const Dashboard = () => {
  const navigate = useNavigate();
  const searchRef = useRef<HTMLInputElement>(null);
  const [greeting, setGreeting] = useState("Good morning");
  const [showTip, setShowTip] = useState(true);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) setGreeting("Good morning");
    else if (hour >= 12 && hour < 17) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Show pro tip toast
  useEffect(() => {
    if (showTip) {
      const timer = setTimeout(() => {
        toast.info("Pro tip: Press ⌘K to search anytime", {
          duration: 4000,
        });
        setShowTip(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [showTip]);

  const handleSearch = (query: string) => {
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  const upcomingMeetings = [
    { id: "meeting-1", title: "Daily Standup", time: "in 30 min" },
    { id: "meeting-2", title: "1:1 with Sarah", time: "2:00 PM" },
    { id: "meeting-3", title: "Sprint Planning", time: "4:00 PM" },
  ];

  const recentSearches = ["Q3 roadmap", "pricing decision", "competitor analysis"];

  return (
    <div className="min-h-screen bg-background">
      <Navbar isAuthenticated userName="Alex" />

      <main className="max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Greeting */}
          <div className="text-center mb-8">
            <h1 className="text-page-title text-foreground mb-2">{greeting}, Alex</h1>
            <p className="text-body text-muted-foreground">Here's what's on your radar today</p>
          </div>

          {/* Search Bar */}
          <div className="mb-12">
            <PMSearchBar
              ref={searchRef}
              placeholder="Ask me anything..."
              onSearch={handleSearch}
            />
          </div>

          {/* Widgets Grid */}
          <div className="grid md:grid-cols-3 gap-6">
            {/* Upcoming Meetings */}
            <PMCard>
              <PMCardHeader>
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <PMCardTitle>Upcoming Meetings</PMCardTitle>
              </PMCardHeader>
              <PMCardContent>
                <div className="space-y-1">
                  {upcomingMeetings.map((meeting) => (
                    <button
                      key={meeting.id}
                      onClick={() => navigate(`/meeting-prep/${meeting.id}`)}
                      className="w-full flex items-center justify-between p-2 -mx-2 rounded-md hover:bg-secondary-bg transition-colors group"
                    >
                      <span className="text-sm text-foreground">{meeting.title}</span>
                      <span className="text-small text-muted-foreground group-hover:text-foreground flex items-center gap-1">
                        {meeting.time}
                        <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </span>
                    </button>
                  ))}
                </div>
              </PMCardContent>
              <PMCardFooter>
                <button className="text-sm text-primary hover:underline">
                  View full calendar →
                </button>
              </PMCardFooter>
            </PMCard>

            {/* Recent Searches */}
            <PMCard>
              <PMCardHeader>
                <Clock className="h-4 w-4 text-muted-foreground" />
                <PMCardTitle>Recent Searches</PMCardTitle>
              </PMCardHeader>
              <PMCardContent>
                <div className="space-y-1">
                  {recentSearches.map((search) => (
                    <button
                      key={search}
                      onClick={() => handleSearch(search)}
                      className="w-full text-left p-2 -mx-2 rounded-md hover:bg-secondary-bg transition-colors group"
                    >
                      <span className="text-sm text-foreground">"{search}"</span>
                    </button>
                  ))}
                </div>
              </PMCardContent>
              <PMCardFooter>
                <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Clear history
                </button>
              </PMCardFooter>
            </PMCard>

            {/* Quick Actions */}
            <PMCard>
              <PMCardHeader>
                <Zap className="h-4 w-4 text-muted-foreground" />
                <PMCardTitle>Quick Actions</PMCardTitle>
              </PMCardHeader>
              <PMCardContent>
                <div className="space-y-3">
                  <PMButton
                    variant="primary"
                    className="w-full"
                    onClick={() => navigate("/meeting-prep/meeting-1")}
                  >
                    Prep for next meeting
                  </PMButton>
                  <PMButton
                    variant="secondary"
                    className="w-full"
                    onClick={() => handleSearch("Find my most recent PRD")}
                  >
                    Find a PRD
                  </PMButton>
                </div>
              </PMCardContent>
            </PMCard>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default Dashboard;
