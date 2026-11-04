import { useEffect, useRef, useState } from "react";

import {
  ShieldCheck,
  LayoutDashboard,
  FlaskConical,
  FileText,
  Settings,
  Menu,
  X,
  UploadCloud,
  FileImage,
  FileVideo,
  FileAudio,
  ScanSearch,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock3,
  ArrowUpRight,
  ArrowLeft,
  Search,
  Trash2,
  LockKeyhole,
  Server,
  Sparkles,
  LoaderCircle,
  RefreshCw,
  CircleHelp,
  Sun,
  Moon,
} from "lucide-react";

import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  Link,
  useNavigate,
  useParams,
  Navigate,
} from "react-router-dom";

import WelcomeScreen from "./WelcomeScreen";
import "./styles.css";

const API_URL = "https://neural-storm-hackathon-2.onrender.com";
const STORAGE_KEY = "truthscan-reports";

const IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/bmp",
];

const VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-matroska",
];

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;

const AUDIO_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/mp4",
  "audio/aac",
  "audio/ogg",
  "audio/webm",
  "audio/flac",
  "audio/x-flac",
  "audio/x-m4a",
  "audio/m4a",
];

const MAX_AUDIO_SIZE = 25 * 1024 * 1024;

function readReports() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "[]"
    );

    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveReports(reports) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(reports)
    );
  } catch (error) {
    console.error("Could not save reports:", error);
  }
}

function formatSize(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(value) {
  if (!value) return "Unknown";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Unknown";

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getVerdictColor(verdict = "") {
  const text = verdict.toLowerCase();

  if (
    text.includes("fake") ||
    text.includes("manipulation") ||
    text.includes("generated")
  ) {
    return "failed";
  }

  if (
    text.includes("authentic") ||
    text.includes("no strong")
  ) {
    return "complete";
  }

  return "pending";
}

function StatusChip({ verdict }) {
  const status = getVerdictColor(verdict);

  return (
    <span className={`status-chip ${status}`}>
      <span />
      {verdict || "Inconclusive"}
    </span>
  );
}

function MetricCard({ icon: Icon, color, label, value, note }) {
  return (
    <div className="metric-card">
      <div className={`metric-icon ${color}`}>
        <Icon size={19} />
      </div>

      <p className="metric-label">{label}</p>
      <div className="metric-value">{value}</div>
      <p className="metric-note">{note}</p>
    </div>
  );
}

function PageHeader({ eyebrow, title, description, action }) {
  return (
    <div className="page-header">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>

      {action}
    </div>
  );
}

function EmptyState({
  icon: Icon = FileText,
  title,
  description,
  action,
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Icon size={23} />
      </div>

      <h4>{title}</h4>
      <p>{description}</p>
      {action}
    </div>
  );
}

function Sidebar({ open, onClose }) {
  const navItems = [
    {
      to: "/",
      label: "Dashboard",
      icon: LayoutDashboard,
      end: true,
    },
    {
      to: "/lab",
      label: "Detection Lab",
      icon: FlaskConical,
    },
    {
      to: "/reports",
      label: "Reports",
      icon: FileText,
    },
    {
      to: "/settings",
      label: "Settings",
      icon: Settings,
    },
  ];

  return (
    <>
      {open && (
        <button
          className="sidebar-overlay"
          aria-label="Close navigation"
          onClick={onClose}
        />
      )}

      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <Link to="/" className="brand" onClick={onClose}>
          <div className="brand-icon">
            <ShieldCheck size={25} />
          </div>

          <div>
            <strong>
              TRUTHSCAN <b>AI</b>
            </strong>
            <small>SYNTHETIC MEDIA ANALYSIS</small>
          </div>
        </Link>

        <div className="nav-label">WORKSPACE</div>

        <nav className="nav-links">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                `nav-link ${isActive ? "active" : ""}`
              }
            >
              <Icon size={17} />
              {label}

              {label === "Detection Lab" && (
                <span className="nav-dot" />
              )}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="engine-status">
            <span className="status-indicator" />

            <div>
              <strong>Detection workspace</strong>
              <small>
                Image, sampled-frame video, and audio analysis
              </small>
            </div>
          </div>

          <div className="sidebar-version">
            TRUTHSCAN AI <span>v1.0.0</span>
          </div>
        </div>
      </aside>
    </>
  );
}

function AppShell() {
  const [reports, setReports] = useState(readReports);
  const [menuOpen, setMenuOpen] = useState(false);
  const [apiOnline, setApiOnline] = useState(false);

  // Theme preference
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem("truthscan-theme");
    return savedTheme === "dark" ? "dark" : "light";
  });

  const navigate = useNavigate();

  // Apply and save theme
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("truthscan-theme", theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((current) =>
      current === "light" ? "dark" : "light"
    );
  }

  // Backend health check
  useEffect(() => {
    let active = true;

    async function checkHealth() {
      try {
        const response = await fetch(`${API_URL}/api/health`);

        if (active) {
          setApiOnline(response.ok);
        }
      } catch {
        if (active) {
          setApiOnline(false);
        }
      }
    }

    checkHealth();

    const interval = window.setInterval(checkHealth, 15000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  function updateReports(nextReports) {
    setReports(nextReports);
    saveReports(nextReports);
  }

  async function addReport(file, mediaType = "image") {
    const endpoint = ["image", "video", "audio"].includes(mediaType)
      ? mediaType
      : "image";

    const mediaLabels = {
      image: "Image",
      video: "Video",
      audio: "Audio",
    };

    const pendingReport = {
      id: `report-${Date.now()}`,
      name: file.name,
      type: mediaLabels[endpoint],
      size: file.size,
      createdAt: new Date().toISOString(),
      status: "Processing",
      verdict: "Analysis in progress",
      label: "Processing",
      score: 0,
      predictions: [],
      frameResults: [],
      segmentResults: [],
      framesAnalyzed: 0,
      segmentsAnalyzed: 0,
    };

    updateReports([pendingReport, ...reports]);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `${API_URL}/api/detect/${endpoint}`,
        {
          method: "POST",
          body: formData,
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.error ||
            result.message ||
            `Server returned ${response.status}`
        );
      }

      const completedReport = {
        ...pendingReport,
        id: result.id || pendingReport.id,
        status: "Complete",
        verdict: result.verdict || "Inconclusive",
        label: result.label || result.verdict || "Inconclusive",
        score: Number(result.score) || 0,
        model: result.model || "Detection model",
        predictions: Array.isArray(result.predictions)
          ? result.predictions
          : [],
        frameResults: Array.isArray(result.frameResults)
          ? result.frameResults
          : [],
        framesAnalyzed: result.framesAnalyzed || 0,
        segmentResults: Array.isArray(result.segmentResults)
          ? result.segmentResults
          : [],
        segmentsAnalyzed: result.segmentsAnalyzed || 0,
        summary: result.summary || null,
        warning: result.warning || "",
        mediaType: result.mediaType || endpoint.toUpperCase(),
        fileName: result.fileName || file.name,
      };

      const latestReports = readReports();

      updateReports(
        latestReports.map((report) =>
          report.id === pendingReport.id
            ? completedReport
            : report
        )
      );

      navigate(`/reports/${completedReport.id}`);
    } catch (error) {
      console.error("Detection request failed:", error);

      const failedReport = {
        ...pendingReport,
        status: "Failed",
        verdict: "Analysis failed",
        error: error.message,
        warning:
          "Check that the backend is running and the selected media type is supported.",
      };

      updateReports(
        readReports().map((report) =>
          report.id === pendingReport.id
            ? failedReport
            : report
        )
      );

      navigate(`/reports/${pendingReport.id}`);
    }
  }

  function deleteReport(id) {
    updateReports(
      reports.filter((report) => report.id !== id)
    );
  }

  return (
    <div className="app-shell">
      <Sidebar
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />

      <main className="main-area">
        <header className="topbar">
          <button
            className="icon-button mobile-menu"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle navigation"
          >
            {menuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>

          <div className="topbar-heading">
            <h1>TruthScan AI</h1>
            <p>Synthetic media analysis workspace</p>
          </div>

          <div className="topbar-right">
            <span className="environment">
              <span
                className="status-indicator"
                style={{
                  background: apiOnline ? "#22c55e" : "#f5a524",
                }}
              />
              {apiOnline ? "API CONNECTED" : "API OFFLINE"}
            </span>

            <button
              type="button"
              className="theme-toggle"
              onClick={toggleTheme}
              title={
                theme === "light"
                  ? "Switch to dark mode"
                  : "Switch to light mode"
              }
              aria-label={
                theme === "light"
                  ? "Switch to dark mode"
                  : "Switch to light mode"
              }
            >
              {theme === "light" ? (
                <Moon size={19} />
              ) : (
                <Sun size={19} />
              )}
            </button>

            <div className="avatar">TS</div>
          </div>
        </header>

        <Routes>
          <Route
            path="/"
            element={<Dashboard reports={reports} />}
          />

          <Route
            path="/lab"
            element={<Lab onAddReport={addReport} />}
          />

          <Route
            path="/reports"
            element={
              <Reports
                reports={reports}
                onDelete={deleteReport}
              />
            }
          />

          <Route
            path="/reports/:id"
            element={
              <ReportDetail
                reports={reports}
                onDelete={deleteReport}
              />
            }
          />

          <Route
            path="/settings"
            element={<SettingsPage apiOnline={apiOnline} />}
          />

          <Route
            path="*"
            element={<Navigate to="/" replace />}
          />
        </Routes>

        <footer className="app-footer">
          <span>
            TRUTHSCAN AI <span className="footer-dot">●</span>{" "}
            Synthetic Media Detection
          </span>

          <span>
            Results are estimates, not proof of authenticity.
          </span>
        </footer>
      </main>
    </div>
  );
}

function Dashboard({ reports }) {
  const navigate = useNavigate();

  const total = reports.length;
  const imageCount = reports.filter((r) => r.type === "Image").length;
  const videoCount = reports.filter((r) => r.type === "Video").length;
  const audioCount = reports.filter((r) => r.type === "Audio").length;
  const completed = reports.filter((r) => r.status === "Complete").length;

  const recentReports = reports.slice(0, 5);

  return (
    <>
      <PageHeader
        eyebrow="OVERVIEW / COMMAND CENTER"
        title={
          <>
            Media intelligence,{" "}
            <span className="gradient-text">simplified.</span>
          </>
        }
        description="Analyze images, videos and audio for potential synthetic-media signals."
        action={
          <button
            className="primary-button"
            onClick={() => navigate("/lab")}
          >
            <ScanSearch size={16} />
            New analysis
          </button>
        }
      />

      <section className="hero-panel">
        <div className="hero-content">
          <div className="hero-pill">
            <Sparkles size={13} />
            SYNTHETIC MEDIA DETECTION
          </div>

          <h3>
            Look closer.
            <br />
            <span>Question what you see.</span>
          </h3>

          <p>
            Submit an image, video or audio file for model-based analysis.
            Review prediction scores, sampled video frames and audio
            segments in one workspace.
          </p>

          <button
            className="hero-button"
            onClick={() => navigate("/lab")}
          >
            Open detection lab <ArrowUpRight size={16} />
          </button>
        </div>

        <div className="hero-visual" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />

          <div className="scan-core">
            <ShieldCheck size={43} />
          </div>

          <div className="orbit-chip chip-one">IMAGE AI</div>
          <div className="orbit-chip chip-two">VIDEO FRAMES</div>
          <div className="orbit-chip chip-three">ANALYSIS</div>
        </div>
      </section>

      <section className="metrics-grid">
        <MetricCard
          icon={FileText}
          color="blue"
          label="Total reports"
          value={total}
          note="All submitted analyses"
        />

        <MetricCard
          icon={FileImage}
          color="orange"
          label="Images submitted"
          value={imageCount}
          note="Image classification requests"
        />

        <MetricCard
          icon={FileVideo}
          color="purple"
          label="Videos submitted"
          value={videoCount}
          note="Video frame sampling requests"
        />

        <MetricCard
          icon={FileAudio}
          color="green"
          label="Audio submitted"
          value={audioCount}
          note="Audio classification requests"
        />

        <MetricCard
          icon={CheckCircle2}
          color="green"
          label="Completed"
          value={completed}
          note="Finished analysis reports"
        />
      </section>

      <section className="content-panel">
        <div className="panel-heading">
          <div>
            <h3>
              <Activity size={18} />
              Recent analyses
            </h3>
            <p>Your latest image, video and audio analysis reports</p>
          </div>

          <Link className="text-link" to="/reports">
            View all <ArrowUpRight size={14} />
          </Link>
        </div>

        {recentReports.length === 0 ? (
          <EmptyState
            icon={ScanSearch}
            title="No analyses yet"
            description="Upload an image, video or audio file to create your first report."
            action={
              <button
                className="primary-button"
                onClick={() => navigate("/lab")}
              >
                Start analysis
              </button>
            }
          />
        ) : (
          <ReportTable reports={recentReports} />
        )}
      </section>

      <div className="notice">
        <CircleHelp size={18} />
        <p>
          <strong>Important:</strong> A model prediction is not a
          guarantee. Video analysis samples selected frames and
          cannot establish that an entire video is authentic or fake.
          Audio predictions are estimates, not proof.
        </p>
      </div>
    </>
  );
}

function Lab({ onAddReport }) {
  const [mediaType, setMediaType] = useState("image");
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const inputRef = useRef(null);

  const isImage = mediaType === "image";
  const isVideo = mediaType === "video";
  const isAudio = mediaType === "audio";

  const maxSize = isImage
    ? MAX_IMAGE_SIZE
    : isVideo
    ? MAX_VIDEO_SIZE
    : MAX_AUDIO_SIZE;

  const config = {
    image: {
      label: "Image",
      icon: FileImage,
      formats: "JPG, PNG, WEBP and BMP",
      accept:
        "image/jpeg,image/png,image/webp,image/bmp,.jpg,.jpeg,.png,.webp,.bmp",
      max: "10 MB",
    },
    video: {
      label: "Video",
      icon: FileVideo,
      formats: "MP4, WebM, MOV, AVI and MKV",
      accept: "video/*,.mp4,.webm,.mov,.avi,.mkv",
      max: "50 MB",
    },
    audio: {
      label: "Audio",
      icon: FileAudio,
      formats: "MP3, WAV, M4A, AAC, OGG, WEBM and FLAC",
      accept: "audio/*,.mp3,.wav,.m4a,.aac,.ogg,.webm,.flac",
      max: "25 MB",
    },
  }[mediaType];

  const MediaIcon = config.icon;

  function changeType(type) {
    setMediaType(type);
    setFile(null);
    setError("");

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function validateFile(selectedFile) {
    setError("");

    if (!selectedFile) return;

    const extension = selectedFile.name
      .split(".")
      .pop()
      .toLowerCase();

    const imageExt = ["jpg", "jpeg", "png", "webp", "bmp"];
    const videoExt = ["mp4", "webm", "mov", "avi", "mkv"];
    const audioExt = ["mp3", "wav", "m4a", "aac", "ogg", "webm", "flac"];

    const valid = isImage
      ? IMAGE_TYPES.includes(selectedFile.type) ||
        imageExt.includes(extension)
      : isVideo
      ? selectedFile.type.startsWith("video/") ||
        videoExt.includes(extension)
      : AUDIO_TYPES.includes(selectedFile.type) ||
        audioExt.includes(extension);

    if (!valid) {
      setFile(null);
      setError(
        `Choose a supported ${config.label.toLowerCase()} file. Supported formats: ${config.formats}.`
      );
      return;
    }

    if (selectedFile.size > maxSize) {
      setFile(null);
      setError(
        `${config.label} size must be at most ${config.max}.`
      );
      return;
    }

    if (selectedFile.size === 0) {
      setFile(null);
      setError("The selected file is empty.");
      return;
    }

    setFile(selectedFile);
  }

  async function submitFile() {
    if (!file || submitting) return;

    setSubmitting(true);

    try {
      await onAddReport(file, mediaType);
    } finally {
      setSubmitting(false);
    }
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragging(false);

    const droppedFile = event.dataTransfer.files?.[0];

    if (droppedFile) {
      validateFile(droppedFile);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="ANALYSIS / DETECTION LAB"
        title={
          <>
            Detection <span className="gradient-text">Lab.</span>
          </>
        }
        description="Choose your media type and submit a file for analysis."
      />

      <div className="media-tabs" role="tablist" aria-label="Media type">
        <button
          type="button"
          role="tab"
          aria-selected={isImage}
          className={isImage ? "active" : ""}
          onClick={() => changeType("image")}
          disabled={submitting}
        >
          <FileImage size={17} /> Image
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={isVideo}
          className={isVideo ? "active" : ""}
          onClick={() => changeType("video")}
          disabled={submitting}
        >
          <FileVideo size={17} /> Video
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={isAudio}
          className={isAudio ? "active" : ""}
          onClick={() => changeType("audio")}
          disabled={submitting}
        >
          <FileAudio size={17} /> Audio
        </button>
      </div>

      <div className="lab-layout">
        <section className="content-panel">
          <div className="panel-heading">
            <div>
              <h3>
                <UploadCloud size={18} />
                Upload {config.label.toLowerCase()}
              </h3>
              <p>Supported formats: {config.formats}</p>
            </div>

            <span className="step-tag">STEP 01 / 02</span>
          </div>

          <input
            ref={inputRef}
            type="file"
            hidden
            accept={config.accept}
            onChange={(event) =>
              validateFile(event.target.files?.[0])
            }
            disabled={submitting}
          />

          <button
            type="button"
            className={`dropzone ${file || dragging ? "has-file" : ""}`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            disabled={submitting}
          >
            <span className="upload-icon">
              <MediaIcon size={27} />
            </span>

            <strong>
              {file
                ? file.name
                : dragging
                ? "Drop your file here"
                : `Choose ${config.label.toLowerCase()} to analyze`}
            </strong>

            <span>
              {file
                ? `${formatSize(file.size)} • Ready to submit`
                : "Click to browse or drag and drop a file"}
            </span>

            <span className="file-types">
              <LockKeyhole size={13} />
              Maximum size: {config.max}
            </span>
          </button>

          {file && (
            <div className="selected-file">
              <div className="file-info">
                <MediaIcon size={19} />
                <div>
                  <strong>{file.name}</strong>
                  <small>{formatSize(file.size)}</small>
                </div>
              </div>

              <button
                type="button"
                className="icon-button"
                onClick={() => {
                  setFile(null);
                  if (inputRef.current) {
                    inputRef.current.value = "";
                  }
                }}
                aria-label="Remove selected file"
              >
                <X size={17} />
              </button>
            </div>
          )}

          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}

          <div className="upload-footer">
            <span>
              {isImage
                ? "Image classification model"
                : isVideo
                ? "Sampled-frame video analysis"
                : "Audio spoof detection model"}
            </span>

            <button
              type="button"
              className="primary-button"
              disabled={!file || submitting}
              onClick={submitFile}
            >
              {submitting ? (
                <>
                  <LoaderCircle size={16} />
                  Analyzing...
                </>
              ) : (
                <>
                  <ScanSearch size={16} />
                  Analyze {config.label.toLowerCase()}
                </>
              )}
            </button>
          </div>
        </section>

        <aside className="content-panel">
          <div className="panel-heading">
            <div>
              <h3>
                <Activity size={18} />
                Analysis pipeline
              </h3>
              <p>What happens after submission</p>
            </div>
          </div>

          <div className="pipeline-step">
            <span>01</span>
            <div>
              <strong>Media validation</strong>
              <p>Validate the selected file type and file size.</p>
            </div>
          </div>

          <div className="pipeline-step">
            <span>02</span>
            <div>
              <strong>
                {isImage
                  ? "Image classification"
                  : isVideo
                  ? "Frame extraction"
                  : "Audio preprocessing"}
              </strong>

              <p>
                {isImage
                  ? "The configured model scores the submitted image."
                  : isVideo
                  ? "The backend samples video frames using FFmpeg."
                  : "FFmpeg converts audio into 16 kHz mono format."}
              </p>
            </div>
          </div>

          <div className="pipeline-step">
            <span>03</span>
            <div>
              <strong>
                {isAudio
                  ? "Audio classification"
                  : "Result aggregation"}
              </strong>

              <p>
                {isAudio
                  ? "The audio model scores speech segments for spoofing signals."
                  : isVideo
                  ? "Sampled-frame predictions are summarized into a report."
                  : "The backend returns a verdict and prediction scores."}
              </p>
            </div>
          </div>

          <div className="privacy-note">
            <LockKeyhole size={17} />
            <p>
              <strong>Analysis limitations</strong>
              <br />
              Model predictions are estimates, not proof of authenticity.
              Video sampling may miss changes between sampled frames.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}

function ReportTable({ reports, onDelete }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>FILE</th>
            <th>TYPE</th>
            <th>VERDICT</th>
            <th>DATE</th>
            <th>STATUS</th>
            {onDelete && <th>ACTION</th>}
          </tr>
        </thead>

        <tbody>
          {reports.map((report) => (
            <tr key={report.id}>
              <td>
                <Link
                  className="file-name"
                  to={`/reports/${report.id}`}
                >
                  {report.name}
                </Link>

                <span className="table-id">
                  {String(report.id).slice(0, 18)}
                </span>
              </td>

              <td>
                <span className="type-chip">{report.type}</span>
              </td>

              <td>
                <StatusChip verdict={report.verdict} />
              </td>

              <td>{formatDate(report.createdAt)}</td>

              <td>
                <span
                  className={`status-chip ${
                    report.status === "Complete"
                      ? "complete"
                      : report.status === "Failed"
                      ? "failed"
                      : "pending"
                  }`}
                >
                  <span />
                  {report.status}
                </span>
              </td>

              {onDelete && (
                <td>
                  <button
                    className="icon-button"
                    title="Delete report"
                    aria-label={`Delete ${report.name}`}
                    onClick={() => onDelete(report.id)}
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Reports({ reports, onDelete }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  const filtered = reports.filter((report) => {
    const matchesSearch = report.name
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesFilter =
      filter === "All" || report.type === filter;

    return matchesSearch && matchesFilter;
  });

  return (
    <>
      <PageHeader
        eyebrow="WORKSPACE / REPORT ARCHIVE"
        title={
          <>
            Analysis <span className="gradient-text">Reports.</span>
          </>
        }
        description="Review previous image, video and audio analysis results."
      />

      <section className="content-panel">
        <div className="panel-heading">
          <div>
            <h3>
              <FileText size={18} />
              All reports
            </h3>
            <p>{filtered.length} matching reports</p>
          </div>

          <label className="search-box">
            <Search size={15} />
            <input
              type="search"
              placeholder="Search by filename..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        </div>

        <div className="media-tabs">
          {["All", "Image", "Video", "Audio"].map((item) => (
            <button
              type="button"
              key={item}
              className={filter === item ? "active" : ""}
              onClick={() => setFilter(item)}
            >
              {item}
            </button>
          ))}
        </div>

        {filtered.length ? (
          <ReportTable
            reports={filtered}
            onDelete={onDelete}
          />
        ) : (
          <EmptyState
            icon={FileText}
            title="No matching reports"
            description="Try a different search or submit a new file."
          />
        )}
      </section>
    </>
  );
}

function ReportDetail({ reports, onDelete }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const report = reports.find((item) => item.id === id);

  if (!report) {
    return (
      <section className="content-panel not-found">
        <EmptyState
          icon={FileText}
          title="Report not found"
          description="It may have been deleted or is no longer available."
          action={
            <button
              className="secondary-button"
              onClick={() => navigate("/reports")}
            >
              <ArrowLeft size={15} />
              Back to reports
            </button>
          }
        />
      </section>
    );
  }

  const isVideo = report.type === "Video";
  const isAudio = report.type === "Audio";

  const predictions = Array.isArray(report.predictions)
    ? report.predictions
    : [];

  const frames = Array.isArray(report.frameResults)
    ? report.frameResults
    : [];

  const segments = Array.isArray(report.segmentResults)
    ? report.segmentResults
    : [];

  return (
    <>
      <PageHeader
        eyebrow="REPORT / ANALYSIS DETAILS"
        title={
          <>
            Report <span className="gradient-text">Details.</span>
          </>
        }
        description="Review the model output and analysis limitations."
        action={
          <button
            className="secondary-button"
            onClick={() => navigate("/reports")}
          >
            <ArrowLeft size={15} />
            All reports
          </button>
        }
      />

      <section className="content-panel detail-panel">
        <div className="detail-file-icon">
          {isVideo ? (
            <FileVideo size={28} />
          ) : isAudio ? (
            <FileAudio size={28} />
          ) : (
            <FileImage size={28} />
          )}
        </div>

        <h3>{report.name}</h3>

        <p className="muted">
          {report.type} · {formatSize(report.size)} ·{" "}
          {formatDate(report.createdAt)}
        </p>

        <div style={{ marginTop: 18 }}>
          <StatusChip verdict={report.verdict} />
        </div>

        <div className="detail-grid">
          <div>
            <small>Media type</small>
            <strong>{report.type}</strong>
          </div>

          <div>
            <small>Analysis status</small>
            <strong>{report.status}</strong>
          </div>

          <div>
            <small>Model verdict</small>
            <strong>{report.verdict || "Inconclusive"}</strong>
          </div>

          <div>
            <small>Model score</small>
            <strong>
              {typeof report.score === "number" && report.score > 0
                ? `${(report.score * 100).toFixed(2)}%`
                : "Not available"}
            </strong>
          </div>

          <div>
            <small>Model</small>
            <strong>{report.model || "Not specified"}</strong>
          </div>

          {isVideo && (
            <div>
              <small>Frames analyzed</small>
              <strong>{report.framesAnalyzed || frames.length}</strong>
            </div>
          )}

          {isAudio && (
            <div>
              <small>Segments analyzed</small>
              <strong>{report.segmentsAnalyzed || segments.length}</strong>
            </div>
          )}
        </div>

        {report.error && (
          <div className="notice">
            <AlertTriangle size={18} />
            <p>
              <strong>Analysis error:</strong> {report.error}
            </p>
          </div>
        )}

        {report.warning && (
          <div className="notice">
            <AlertTriangle size={18} />
            <p>
              <strong>Notice:</strong> {report.warning}
            </p>
          </div>
        )}

        {report.summary && (
          <section style={{ marginTop: 28 }}>
            <div className="panel-heading">
              <div>
                <h3>
                  <Activity size={18} />
                  {isAudio ? "Audio summary" : "Video summary"}
                </h3>
                <p>Summary returned by the backend</p>
              </div>
            </div>

            <pre className="report-summary">
              {typeof report.summary === "string"
                ? report.summary
                : JSON.stringify(report.summary, null, 2)}
            </pre>
          </section>
        )}

        {isVideo && frames.length > 0 && (
          <section style={{ marginTop: 28 }}>
            <div className="panel-heading">
              <div>
                <h3>
                  <FileVideo size={18} />
                  Sampled frame results
                </h3>
                <p>
                  Individual predictions for frames selected by the backend
                </p>
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>FRAME</th>
                    <th>LABEL</th>
                    <th>SCORE</th>
                    <th>VERDICT</th>
                  </tr>
                </thead>

                <tbody>
                  {frames.map((frame, index) => (
                    <tr
                      key={
                        frame.frame ??
                        frame.frameNumber ??
                        index
                      }
                    >
                      <td>
                        {frame.frame ??
                          frame.frameNumber ??
                          index + 1}
                      </td>

                      <td>
                        {frame.label || frame.verdict || "Unknown"}
                      </td>

                      <td>
                        {typeof frame.score === "number"
                          ? `${(frame.score * 100).toFixed(2)}%`
                          : "—"}
                      </td>

                      <td>
                        <StatusChip
                          verdict={
                            frame.verdict ||
                            frame.label ||
                            "Inconclusive"
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {isAudio && segments.length > 0 && (
          <section style={{ marginTop: 28 }}>
            <div className="panel-heading">
              <div>
                <h3>
                  <FileAudio size={18} />
                  Audio segment results
                </h3>
                <p>
                  Individual model predictions for analyzed audio segments
                </p>
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>SEGMENT</th>
                    <th>TIME RANGE</th>
                    <th>SPOOF SCORE</th>
                    <th>REAL SCORE</th>
                  </tr>
                </thead>

                <tbody>
                  {segments.map((segment, index) => {
                    const scores = segment.scores || {};
                    const fake = Number(scores.fakeScore);
                    const real = Number(scores.realScore);

                    return (
                      <tr key={segment.segment ?? index}>
                        <td>{segment.segment ?? index + 1}</td>
                        <td>
                          {Number(segment.startSeconds || 0).toFixed(2)}s
                          {" – "}
                          {Number(segment.endSeconds || 0).toFixed(2)}s
                        </td>
                        <td>
                          {Number.isFinite(fake)
                            ? `${(fake * 100).toFixed(2)}%`
                            : "—"}
                        </td>
                        <td>
                          {Number.isFinite(real)
                            ? `${(real * 100).toFixed(2)}%`
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {!isVideo && predictions.length > 0 && (
          <section style={{ marginTop: 28 }}>
            <div className="panel-heading">
              <div>
                <h3>
                  <Activity size={18} />
                  Prediction scores
                </h3>
                <p>Model output for this {report.type.toLowerCase()}</p>
              </div>
            </div>

            {predictions.map((prediction, index) => {
              const score = Number(prediction.score) || 0;
              const percentage = score <= 1 ? score * 100 : score;

              return (
                <div
                  key={`${prediction.label || "label"}-${index}`}
                  style={{ marginBottom: 18 }}
                >
                  <div className="prediction-heading">
                    <strong>{prediction.label || "Unknown"}</strong>
                    <span className="muted">
                      {percentage.toFixed(2)}%
                    </span>
                  </div>

                  <div className="prediction-track">
                    <div
                      className="prediction-fill"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(0, percentage)
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </section>
        )}

        <div className="detail-actions">
          <button
            className="secondary-button"
            onClick={() => navigate("/lab")}
          >
            <RefreshCw size={15} />
            Analyze another file
          </button>

          <button
            className="secondary-button"
            onClick={() => {
              onDelete(report.id);
              navigate("/reports");
            }}
          >
            <Trash2 size={15} />
            Delete report
          </button>
        </div>
      </section>
    </>
  );
}

function SettingsPage({ apiOnline }) {
  return (
    <>
      <PageHeader
        eyebrow="WORKSPACE / PREFERENCES"
        title={
          <>
            System <span className="gradient-text">Settings.</span>
          </>
        }
        description="Check the current connection and detection configuration."
      />

      <section className="content-panel settings-list">
        <div className="setting-row">
          <div className="setting-symbol">
            <Server size={19} />
          </div>

          <div className="setting-copy">
            <strong>Backend API</strong>
            <p>{API_URL}</p>
          </div>

          <span
            className={`status-chip ${
              apiOnline ? "complete" : "failed"
            }`}
          >
            <span />
            {apiOnline ? "Connected" : "Offline"}
          </span>
        </div>

        <div className="setting-row">
          <div className="setting-symbol">
            <FileImage size={19} />
          </div>

          <div className="setting-copy">
            <strong>Image analysis</strong>
            <p>
              Uses the image-classification model configured in
              the backend.
            </p>
          </div>

          <span className="type-chip">Image</span>
        </div>

        <div className="setting-row">
          <div className="setting-symbol">
            <FileVideo size={19} />
          </div>

          <div className="setting-copy">
            <strong>Video analysis</strong>
            <p>
              Uses the backend's sampled-frame analysis endpoint.
              It is not full-video forensic verification.
            </p>
          </div>

          <span className="type-chip">Video</span>
        </div>

        <div className="setting-row">
          <div className="setting-symbol">
            <FileAudio size={19} />
          </div>

          <div className="setting-copy">
            <strong>Audio analysis</strong>
            <p>
              Uses the audio-classification model to analyze speech
              segments for potential spoofing signals.
            </p>
          </div>

          <span className="type-chip">Audio</span>
        </div>

        <div className="setting-row">
          <div className="setting-symbol">
            <LockKeyhole size={19} />
          </div>

          <div className="setting-copy">
            <strong>Report storage</strong>
            <p>
              Reports are stored in this browser's localStorage.
              Clearing browser storage removes the saved history.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

export default function App() {
  const [showWelcome, setShowWelcome] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setShowWelcome(false);
    }, 2800);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <BrowserRouter>
      {showWelcome && (
        <WelcomeScreen
          onComplete={() => setShowWelcome(false)}
        />
      )}

      <AppShell />
    </BrowserRouter>
  );
}