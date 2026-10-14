"use client";
import { useRef, useState } from "react";

/** Finger or mouse signature capture. Returns a PNG data URL and the signer's name. */
export function SignaturePad({ title, onSave, onError }: { title: string; onSave: (png: string, name: string) => void; onError: (m: string) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [inked, setInked] = useState(false);
  const [name, setName] = useState("");
  const pt = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = ref.current!;
    const r = c.getBoundingClientRect();
    return [((e.clientX - r.left) * c.width) / r.width, ((e.clientY - r.top) * c.height) / r.height] as const;
  };
  const ctx = () => {
    const x = ref.current!.getContext("2d")!;
    x.lineWidth = 4;
    x.lineCap = "round";
    x.strokeStyle = "#012f6c";
    return x;
  };
  return (
    <div>
      <h2 className="disp" style={{ color: "var(--navy)", fontSize: 20 }}>Delivery confirmation</h2>
      <p style={{ color: "var(--muted)", fontSize: 14, margin: "4px 0 10px" }}>{title}. Recipient signs below.</p>
      <canvas
        ref={ref}
        className="sigpad"
        width={680}
        height={320}
        onPointerDown={(e) => {
          drawing.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          const x = ctx();
          x.beginPath();
          x.moveTo(...pt(e));
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          const x = ctx();
          x.lineTo(...pt(e));
          x.stroke();
          setInked(true);
        }}
        onPointerUp={() => (drawing.current = false)}
      />
      <div className="row between" style={{ margin: "6px 2px 10px" }}>
        <small style={{ color: "var(--muted)", fontSize: 12 }}>Sign with a finger or mouse</small>
        <button
          className="btn o"
          style={{ padding: "6px 12px", fontSize: 12 }}
          onClick={() => {
            ctx().clearRect(0, 0, 680, 320);
            setInked(false);
          }}
        >
          Clear
        </button>
      </div>
      <input className="field" placeholder="Name of person signing" value={name} onChange={(e) => setName(e.target.value)} />
      <p className="mock" style={{ textAlign: "left", margin: "8px 0" }}>
        By signing, the recipient confirms the items were received in good condition. [CONFIRM wording with legal]
      </p>
      <button
        className="btn p w"
        onClick={() => {
          if (!inked) return onError("Please sign first.");
          if (!name.trim()) return onError("Add the signer name.");
          onSave(ref.current!.toDataURL("image/png"), name.trim());
        }}
      >
        Save signature
      </button>
    </div>
  );
}
