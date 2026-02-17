import { useNavigate, useParams } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import { PMCard, PMCardHeader, PMCardTitle, PMCardContent } from "@/components/ui/pm-card";
import { PMButton } from "@/components/ui/pm-button";
import { PMAvatar } from "@/components/ui/pm-avatar";
import { ArrowLeft, Calendar, Users, Target, FileText, Copy, RefreshCw, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const mockMeetings: Record<string, {
  title: string;
  time: string;
  duration: string;
  attendees: { name: string; role: string | null }[];
}> = {
  "meeting-1": {
    title: "Daily Standup",
    time: "9:30 AM",
    duration: "15 min",
    attendees: [
      { name: "You", role: null },
      { name: "Sarah Chen", role: "Eng Lead" },
      { name: "Mike Ross", role: "Backend" },
      { name: "Lisa Wong", role: "Designer" },
    ],
  },
  "meeting-2": {
    title: "1:1 with Sarah",
    time: "2:00 PM",
    duration: "30 min",
    attendees: [
      { name: "You", role: null },
      { name: "Sarah Chen", role: "Eng Lead" },
    ],
  },
  "meeting-3": {
    title: "Sprint Planning",
    time: "4:00 PM",
    duration: "1 hour",
    attendees: [
      { name: "You", role: null },
      { name: "Product Team", role: null },
      { name: "Engineering Team", role: null },
    ],
  },
};

const mockMeetingPrep = {
  likelyTopics: [
    "Q1 roadmap finalization",
    "Engineering capacity and resource allocation",
    "Feature prioritization for next sprint",
    "Timeline review for upcoming releases",
  ],
  relevantDocs: [
    { name: "Q1 Roadmap Draft v2", context: "You edited yesterday" },
    { name: "Engineering Capacity Plan", context: "Shared by Sarah, Dec 1" },
    { name: "Feature Priority Matrix", context: "You created Nov 28" },
  ],
};

const MeetingPrep = () => {
  const navigate = useNavigate();
  const { meetingId } = useParams();
  const meeting = mockMeetings[meetingId || "meeting-1"] || mockMeetings["meeting-1"];

  const handleCopyBrief = () => {
    const brief = `
Meeting: ${meeting.title}
Time: Today, ${meeting.time} (${meeting.duration})
Attendees: ${meeting.attendees.map((a) => a.name).join(", ")}

Likely Topics:
${mockMeetingPrep.likelyTopics.map((t) => `• ${t}`).join("\n")}

Relevant Documents:
${mockMeetingPrep.relevantDocs.map((d) => `• ${d.name} - ${d.context}`).join("\n")}
    `.trim();

    navigator.clipboard.writeText(brief);
    toast.success("Brief copied to clipboard!");
  };

  const handleRefresh = () => {
    toast.info("Refreshing meeting data...");
    setTimeout(() => {
      toast.success("Meeting data updated!");
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar isAuthenticated userName="Alex" />

      <main className="max-w-[800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Back Button */}
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>

          {/* Meeting Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 text-primary mb-2">
              <Calendar className="h-5 w-5" />
            </div>
            <h1 className="text-page-title text-foreground mb-2">{meeting.title}</h1>
            <p className="text-muted-foreground">
              Today, {meeting.time} – {meeting.duration}
            </p>
          </div>

          {/* Attendees */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Attendees</span>
            </div>
            <div className="flex flex-wrap gap-3">
              {meeting.attendees.map((attendee) => (
                <div key={attendee.name} className="flex items-center gap-2">
                  <PMAvatar name={attendee.name} size="sm" />
                  <div>
                    <span className="text-sm text-foreground">{attendee.name}</span>
                    {attendee.role && (
                      <span className="text-small text-muted-foreground ml-1">({attendee.role})</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <hr className="border-border mb-8" />

          {/* Likely Topics */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-caption text-muted-foreground">LIKELY TOPICS</span>
            </div>
            <p className="text-small text-muted-foreground mb-3">
              Based on meeting title and recent activity:
            </p>
            <div className="bg-secondary-bg rounded-md p-4">
              <ul className="space-y-2">
                {mockMeetingPrep.likelyTopics.map((topic) => (
                  <li key={topic} className="flex items-start gap-2 text-sm text-foreground">
                    <span className="text-muted-foreground">•</span>
                    {topic}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <hr className="border-border mb-8" />

          {/* Relevant Documents */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-caption text-muted-foreground">RELEVANT DOCUMENTS</span>
            </div>
            <PMCard className="p-0">
              <PMCardContent className="divide-y divide-border">
                {mockMeetingPrep.relevantDocs.map((doc) => (
                  <div
                    key={doc.name}
                    className="flex items-center justify-between p-4 hover:bg-secondary-bg transition-colors"
                  >
                    <div>
                      <span className="text-sm font-medium text-foreground">{doc.name}</span>
                      <p className="text-small text-muted-foreground">{doc.context}</p>
                    </div>
                    <PMButton variant="ghost" size="sm" className="gap-1.5">
                      <ExternalLink className="h-3 w-3" />
                      Open
                    </PMButton>
                  </div>
                ))}
              </PMCardContent>
            </PMCard>
            <PMButton variant="secondary" className="mt-3 w-full sm:w-auto">
              Open All in New Tabs
            </PMButton>
          </section>

          <hr className="border-border mb-8" />

          {/* Footer Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <PMButton variant="primary" onClick={handleCopyBrief} className="gap-2">
              <Copy className="h-4 w-4" />
              Copy Brief to Clipboard
            </PMButton>
            <PMButton variant="secondary" onClick={handleRefresh} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </PMButton>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default MeetingPrep;
