
import { useEffect, useState } from "react";
import { ShieldCheck, ScanLine } from "lucide-react";

export default function WelcomeScreen({ onComplete }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const finishTimer = setTimeout(() => setLeaving(true), 2600);
    const completeTimer = setTimeout(onComplete, 3200);

    return () => {
      clearTimeout(finishTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div className={`welcome-screen ${leaving ? "welcome-leaving" : ""}`}>
      <div className="welcome-grid" />

      <div className="welcome-content">
        <div className="welcome-emblem">
          <div className="welcome-ring ring-outer" />
          <div className="welcome-ring ring-middle" />
          <div className="welcome-ring ring-inner" />

          <div className="welcome-logo">
            <ShieldCheck size={60} strokeWidth={1.5} />
          </div>

          <div className="welcome-scan-line">
            <ScanLine size={21} />
          </div>
        </div>

        <div className="welcome-brand">
          <h1>TRUTHSCAN <span>AI</span></h1>
          <p>SEE BEYOND THE SURFACE.</p>
        </div>

        <div className="welcome-loading">
          <div className="welcome-loading-track">
            <div className="welcome-loading-progress" />
          </div>
          <p>INITIALIZING MEDIA INTELLIGENCE</p>
        </div>
      </div>

      <div className="welcome-footer">
        <span>TRUTHSCAN AI</span>
        <span>MEDIA AUTHENTICITY WORKSPACE</span>
      </div>
    </div>
  );
}
