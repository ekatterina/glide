/**
 * GlideLogo — inline SVG tracing of the Glide brand mark.
 * Wheelchair user with wing + flame + location pin, all in vector.
 * Uses a single linearGradient for the flame (orange → yellow).
 */
export default function GlideLogo({ size = 34, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Glide"
      className={className}
    >
      <defs>
        {/* Flame gradient: deep red → orange → gold, left-to-right */}
        <linearGradient id="glide-flame-g" x1="0%" y1="60%" x2="100%" y2="20%">
          <stop offset="0%"   stopColor="#CC1A00" />
          <stop offset="40%"  stopColor="#FF5500" />
          <stop offset="100%" stopColor="#FFCC00" />
        </linearGradient>
      </defs>

      {/* ── FLAMES ─────────────────────────────────────────────────────── */}
      {/* Upper flame tongue */}
      <path
        d="M32,42 C26,38 14,40 6,36
           C12,34 14,30 11,26
           C17,33 20,31 20,27
           C22,34 27,36 28,32
           C25,27 23,20 26,14
           C29,25 34,26 34,22
           C31,31 32,40 32,42 Z"
        fill="url(#glide-flame-g)"
      />
      {/* Lower flame tongue */}
      <path
        d="M33,62 C25,60 13,62 6,59
           C12,57 14,53 11,49
           C17,56 21,54 20,50
           C23,57 29,58 30,54
           C28,50 29,59 33,62 Z"
        fill="url(#glide-flame-g)"
        opacity="0.82"
      />

      {/* ── WHEELCHAIR C-RING ──────────────────────────────────────────── */}
      {/*
          Centre ≈ (54, 57). Outer r=32, inner r=22.
          Gap from 225° to 135° (counter-clockwise, i.e. left side).
          225° → outer (31,34), inner (38,41)
          135° → outer (31,80), inner (38,73)
          Outer arc: M 31,34  A 32,32 0 1 1 31,80   (large, clockwise)
          Inner arc:           A 22,22 0 1 0 38,41   (large, counter-clockwise)
      */}
      <path
        d="M31,34
           A32,32,0,1,1,31,80
           L38,73
           A22,22,0,1,0,38,41
           Z"
        fill="#0F1F3D"
      />

      {/* ── LOCATION PIN (inside wheel) ────────────────────────────────── */}
      <path
        d="M54,44
           C47,44 41,50 41,57
           C41,64 54,75 54,75
           C54,75 67,64 67,57
           C67,50 61,44 54,44 Z"
        fill="#0F1F3D"
      />
      {/* White hole in pin */}
      <circle cx="54" cy="55" r="5.5" fill="#F5F3EE" />

      {/* ── WING (3 swept feathers, upper-left) ────────────────────────── */}
      {/* Primary feather — longest */}
      <path
        d="M51,27 C43,21 27,12 14,8
           C22,15 32,22 35,28 Z"
        fill="#0F1F3D"
      />
      {/* Secondary feather */}
      <path
        d="M49,33 C41,27 27,19 16,17
           C25,23 35,28 37,34 Z"
        fill="#0F1F3D"
      />
      {/* Tertiary feather — shortest */}
      <path
        d="M47,38 C41,33 33,28 23,27
           C30,30 37,34 39,39 Z"
        fill="#0F1F3D"
      />

      {/* ── PERSON HEAD ────────────────────────────────────────────────── */}
      <circle cx="67" cy="18" r="6.2" fill="#0F1F3D" />

      {/* ── PERSON BODY (forward-leaning torso) ────────────────────────── */}
      <path
        d="M61,24
           C63,27 67,32 69,37
           C65,35 60,35 58,38
           C56,34 56,28 61,24 Z"
        fill="#0F1F3D"
      />

      {/* ── PERSON ARM (reaching forward/right) ────────────────────────── */}
      <path
        d="M63,31
           C68,34 74,37 80,41
           C73,40 67,38 64,35 Z"
        fill="#0F1F3D"
      />
    </svg>
  );
}
