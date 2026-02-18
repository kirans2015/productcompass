import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import FeedbackModal from "@/components/search/FeedbackModal";
import DocumentDetailPanel from "@/components/search/DocumentDetailPanel";
import { PMButton } from "@/components/ui/pm-button";
import { PMBadge } from "@/components/ui/pm-badge";
import { ArrowLeft, FileText, Presentation, Sheet, ExternalLink, Sparkles, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { callOpenAI } from "@/lib/openai-integration";

interface DocumentResult {
  id: number;
  type: "doc" | "slides" | "sheet";
  title: string;
  matchScore: number;
  lastEdited: string;
  owner: string;
  snippet: string;
  excerpts?: string[];
  folder?: string;
}

const mockDocumentResults: DocumentResult[] = [
  {
    id: 1,
    type: "doc",
    title: "Q3 Product Roadmap 2024",
    matchScore: 95,
    lastEdited: "Oct 15, 2024",
    owner: "You",
    snippet: "Key initiatives for Q3 include launching the new dashboard, improving search performance, and expanding to mobile platforms...",
    folder: "My Drive / Product",
    excerpts: [
      "Key initiatives for Q3 include launching the new dashboard, improving search performance, and expanding to mobile platforms.",
      "The product requirements specify that all new features must pass accessibility audits before release.",
      "Stakeholder alignment on the roadmap was achieved during the July planning sprint.",
    ],
  },
  {
    id: 2,
    type: "slides",
    title: "Q3 Roadmap Presentation - Leadership Review",
    matchScore: 88,
    lastEdited: "Oct 18, 2024",
    owner: "Sarah Chen",
    snippet: "Quarterly roadmap overview presented to leadership team covering product strategy and resource allocation...",
    folder: "Shared / Leadership",
    excerpts: [
      "Quarterly roadmap overview presented to leadership team covering product strategy and resource allocation.",
      "Product requirements were reviewed and prioritized based on customer feedback and revenue impact.",
    ],
  },
  {
    id: 3,
    type: "sheet",
    title: "Roadmap Planning - Feature Prioritization",
    matchScore: 76,
    lastEdited: "Sep 28, 2024",
    owner: "Mike Johnson",
    snippet: "Feature scoring matrix with impact vs effort analysis for Q3 and Q4 planning cycles...",
    folder: "My Drive / Planning",
    excerpts: [
      "Feature scoring matrix with impact vs effort analysis for Q3 and Q4 planning cycles.",
      "Each requirement was scored on a 1-5 scale across customer value, technical complexity, and strategic alignment.",
    ],
  },
  {
    id: 4,
    type: "doc",
    title: "Product Strategy Document",
    matchScore: 71,
    lastEdited: "Aug 15, 2024",
    owner: "You",
    snippet: "Long-term product vision and strategy document outlining roadmap themes for the next 12 months...",
    folder: "My Drive / Strategy",
    excerpts: [
      "Long-term product vision and strategy document outlining roadmap themes for the next 12 months.",
      "Core product requirements include scalability, multi-tenant support, and enterprise-grade security.",
      "The strategy emphasizes iterative delivery with quarterly requirement reviews.",
    ],
  },
];

const Search = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const [showSummary, setShowSummary] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryText, setSummaryText] = useState("");
  const [summarizingDocId, setSummarizingDocId] = useState<number | null>(null);
  const [docSummaries, setDocSummaries] = useState<Record<number, string>>({});
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentResult | null>(null);

  const getFileIcon = (type: string) => {
    switch (type) {
      case "doc":
        return <FileText className="h-5 w-5 text-primary" />;
      case "slides":
        return <Presentation className="h-5 w-5 text-orange" />;
      case "sheet":
        return <Sheet className="h-5 w-5 text-success" />;
      default:
        return <FileText className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getScoreBadgeVariant = (score: number): "high" | "medium" | "low" => {
    if (score >= 90) return "high";
    if (score >= 70) return "medium";
    return "low";
  };

  const handleSummarize = async () => {
    setLoadingSummary(true);
    try {
      const docsContext = mockDocumentResults
        .map((doc) => `Document: "${doc.title}" - ${doc.snippet}`)
        .join("\n\n");
      
      const result = await callOpenAI(
        `Summarize these search results for the query "${query}". Provide a concise 2-3 sentence summary of the key information across all documents. End with a brief list of sources.`,
        docsContext
      );
      setSummaryText(result);
      setShowSummary(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate summary");
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleSummarizeDoc = async (doc: DocumentResult) => {
    setSummarizingDocId(doc.id);
    try {
      const result = await callOpenAI(
        `Summarize this document in 2-3 sentences. Focus on the key points and actionable information.`,
        `Title: ${doc.title}\nContent: ${doc.snippet}`
      );
      setDocSummaries((prev) => ({ ...prev, [doc.id]: result }));
      toast.success("Document summarized!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to summarize");
    } finally {
      setSummarizingDocId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar isAuthenticated userName="Alex" />

      <main className="max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

          {/* Header */}
          <div className="mb-6">
            <div>
              <h1 className="text-page-title text-foreground mb-1">
                Results for: "{query}"
              </h1>
              <p className="text-sm text-muted-foreground">
                Found {mockDocumentResults.length} documents · Ranked by relevance to your query
              </p>
            </div>
          </div>

          {/* AI Summary */}
          <AnimatePresence>
            {showSummary && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6"
              >
                <div className="bg-primary/5 border border-primary/20 rounded-md p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <span className="font-medium text-foreground">AI Summary</span>
                    </div>
                    <button
                      onClick={() => setShowSummary(false)}
                      className="p-1 hover:bg-primary/10 rounded transition-colors"
                    >
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Based on {mockDocumentResults.length} documents about "{query}":
                  </p>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                    {summaryText}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Document Results */}
          <div className="space-y-0">
            {mockDocumentResults.map((doc, index) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="border-b border-border py-4 hover:bg-secondary-bg/50 -mx-4 px-4 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-3 flex-1">
                    {getFileIcon(doc.type)}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-card-title text-foreground hover:text-primary cursor-pointer">
                        {doc.title}
                      </h3>
                      <p className="text-small text-muted-foreground mt-1">
                        Last edited: {doc.lastEdited} • Owner: {doc.owner}
                      </p>
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {doc.snippet}
                      </p>
                      {docSummaries[doc.id] && (
                        <div className="mt-2 p-3 bg-primary/5 border border-primary/20 rounded text-sm text-foreground">
                          <div className="flex items-center gap-1.5 mb-1 text-xs text-primary font-medium">
                            <Sparkles className="h-3 w-3" />
                            AI Summary
                          </div>
                          {docSummaries[doc.id]}
                        </div>
                      )}
                      <div className="flex gap-2 mt-3">
                        <PMButton variant="ghost" size="sm" className="gap-1.5">
                          <ExternalLink className="h-3 w-3" />
                          Open in Drive
                        </PMButton>
                        <PMButton 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleSummarizeDoc(doc)}
                          disabled={summarizingDocId === doc.id}
                          className="gap-1.5"
                        >
                          {summarizingDocId === doc.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Sparkles className="h-3 w-3" />
                          )}
                          {summarizingDocId === doc.id ? "Summarizing..." : "Summarize"}
                        </PMButton>
                        <PMButton variant="ghost" size="sm" onClick={() => setSelectedDoc(doc)}>
                          View Details
                        </PMButton>
                      </div>
                    </div>
                  </div>
                  <PMBadge variant={getScoreBadgeVariant(doc.matchScore)}>
                    {doc.matchScore}% match
                  </PMBadge>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Feedback Link */}
          <div className="pt-6 text-center">
            <button
              onClick={() => setFeedbackOpen(true)}
              className="text-sm text-muted-foreground hover:text-primary transition-colors underline underline-offset-4"
            >
              Can't find what you need?
            </button>
          </div>

          <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
          <DocumentDetailPanel
            doc={selectedDoc}
            open={!!selectedDoc}
            onClose={() => setSelectedDoc(null)}
            query={query}
          />
        </motion.div>
      </main>
    </div>
  );
};

export default Search;
