import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import { PMButton } from "@/components/ui/pm-button";
import { PMBadge } from "@/components/ui/pm-badge";
import { PMModal, PMModalHeader, PMModalTitle, PMModalDescription, PMModalContent, PMModalFooter } from "@/components/ui/pm-modal";
import { PMInput } from "@/components/ui/pm-input";
import { ArrowLeft, Check, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const Settings = () => {
  const navigate = useNavigate();
  const [disconnectModal, setDisconnectModal] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [syncing, setSyncing] = useState(false);

  const connectedServices = [
    { name: "Google Drive", status: "Connected", email: "alex@company.com" },
    { name: "Google Docs", status: "Connected" },
    { name: "Google Calendar", status: "Connected" },
  ];

  const handleSync = () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      toast.success("Synced!");
    }, 1500);
  };

  const handleDisconnect = (service: string) => {
    setDisconnectModal(null);
    toast.success(`${service} disconnected`);
  };

  const handleClearHistory = () => {
    toast.success("Search history cleared");
  };

  const handleDeleteAccount = () => {
    if (deleteConfirm === "DELETE") {
      setDeleteModal(false);
      toast.success("Account deleted");
      navigate("/");
    }
  };

  const handleSignOut = () => {
    toast.success("Signed out");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar isAuthenticated userName="Alex" />

      <main className="max-w-[600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </button>
            <h1 className="text-section-title text-foreground">Settings</h1>
          </div>

          {/* Connected Services */}
          <section className="mb-8">
            <h2 className="text-caption text-muted-foreground mb-4">CONNECTED SERVICES</h2>
            <div className="space-y-4">
              {connectedServices.map((service) => (
                <div
                  key={service.name}
                  className="flex items-center justify-between p-4 bg-card border border-border rounded-md"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{service.name}</p>
                    {service.email && (
                      <p className="text-small text-muted-foreground">Connected as: {service.email}</p>
                    )}
                    <div className="flex items-center gap-1 mt-1">
                      <Check className="h-3 w-3 text-success" />
                      <span className="text-small text-success">{service.status}</span>
                    </div>
                  </div>
                  <PMButton
                    variant="secondary"
                    size="sm"
                    onClick={() => setDisconnectModal(service.name)}
                  >
                    Disconnect
                  </PMButton>
                </div>
              ))}
            </div>
          </section>

          <hr className="border-border mb-8" />

          {/* Indexing Status */}
          <section className="mb-8">
            <h2 className="text-caption text-muted-foreground mb-4">INDEXING STATUS</h2>
            <div className="p-4 bg-card border border-border rounded-md space-y-3">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-success" />
                <span className="text-sm text-foreground">156 documents indexed</span>
              </div>
              <p className="text-small text-muted-foreground">Last synced: 2 minutes ago</p>
              <PMButton variant="secondary" size="sm" onClick={handleSync} loading={syncing}>
                Re-index Now
              </PMButton>
            </div>
          </section>

          {/* Usage This Month */}
          <section className="mb-8">
            <h2 className="text-caption text-muted-foreground mb-4">USAGE THIS MONTH</h2>
            <div className="p-4 bg-card border border-border rounded-md space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Searches</span>
                <span className="text-sm text-foreground">32</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Meeting preps</span>
                <span className="text-sm text-foreground">8</span>
              </div>
              <PMBadge variant="success">Beta — Unlimited access</PMBadge>
            </div>
          </section>

          <hr className="border-border mb-8" />

          {/* Account */}
          <section className="mb-8">
            <h2 className="text-caption text-muted-foreground mb-4">ACCOUNT</h2>
            <div className="p-4 bg-card border border-border rounded-md space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Email</span>
                <span className="text-sm text-foreground">alex@company.com</span>
              </div>
            </div>
          </section>

          <hr className="border-border mb-8" />

          {/* Data & Privacy */}
          <section className="mb-8">
            <h2 className="text-caption text-muted-foreground mb-4">DATA & PRIVACY</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-card border border-border rounded-md">
                <span className="text-sm text-foreground">Clear search history</span>
                <PMButton variant="secondary" size="sm" onClick={handleClearHistory}>
                  Clear
                </PMButton>
              </div>
              <div className="flex items-center justify-between p-4 bg-card border border-border rounded-md">
                <span className="text-sm text-foreground">Delete account and all data</span>
                <PMButton variant="danger" size="sm" onClick={() => setDeleteModal(true)}>
                  Delete Account
                </PMButton>
              </div>
            </div>
          </section>

          <hr className="border-border mb-8" />

          {/* Sign Out */}
          <PMButton variant="secondary" className="w-full" onClick={handleSignOut}>
            Sign Out
          </PMButton>
        </motion.div>
      </main>

      {/* Disconnect Modal */}
      <PMModal open={!!disconnectModal} onClose={() => setDisconnectModal(null)}>
        <PMModalHeader>
          <PMModalTitle>Disconnect {disconnectModal}?</PMModalTitle>
          <PMModalDescription>
            You will no longer be able to search files from this service.
          </PMModalDescription>
        </PMModalHeader>
        <PMModalFooter>
          <PMButton variant="secondary" onClick={() => setDisconnectModal(null)}>
            Cancel
          </PMButton>
          <PMButton variant="danger" onClick={() => handleDisconnect(disconnectModal || "")}>
            Disconnect
          </PMButton>
        </PMModalFooter>
      </PMModal>

      {/* Delete Account Modal */}
      <PMModal open={deleteModal} onClose={() => setDeleteModal(false)}>
        <PMModalHeader>
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-error" />
            </div>
          </div>
          <PMModalTitle>Delete your account?</PMModalTitle>
          <PMModalDescription>
            This action cannot be undone. All your data will be permanently deleted.
          </PMModalDescription>
        </PMModalHeader>
        <PMModalContent>
          <p className="text-sm text-muted-foreground mb-2">
            Type <span className="font-mono text-foreground">DELETE</span> to confirm:
          </p>
          <PMInput
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            placeholder="DELETE"
          />
        </PMModalContent>
        <PMModalFooter>
          <PMButton variant="secondary" onClick={() => setDeleteModal(false)}>
            Cancel
          </PMButton>
          <PMButton
            variant="danger"
            onClick={handleDeleteAccount}
            disabled={deleteConfirm !== "DELETE"}
          >
            Delete Account
          </PMButton>
        </PMModalFooter>
      </PMModal>
    </div>
  );
};

export default Settings;
