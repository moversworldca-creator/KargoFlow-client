import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, AlertCircle, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';
import { usePlatformAuth } from './PlatformAuthContext';
import kargoflowLogo from '../assets/full_logo.png';

export default function LoginPage() {
  const { login } = usePlatformAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('PlatformAdmin2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getErrorMessage = (err) => {
    const rawMsg =
      err?.response?.data?.error ||
      err?.response?.data?.detail ||
      err?.response?.data?.message ||
      err?.message ||
      '';

    const normalized = String(rawMsg).toLowerCase();

    if (
      normalized.includes('invalid_credentials') ||
      normalized.includes('invalid credential') ||
      normalized.includes('invalid username or password') ||
      normalized.includes('wrong password') ||
      normalized.includes('unauthorized') ||
      err?.response?.status === 401
    ) {
      return {
        title: 'Login failed',
        message: 'The email address or password is incorrect. Please check your credentials and try again.',
      };
    }

    if (
      normalized.includes('too_many_requests') ||
      normalized.includes('rate limit') ||
      err?.response?.status === 429
    ) {
      return {
        title: 'Too many attempts',
        message: 'Too many login attempts. Please wait a few minutes and try again.',
      };
    }

    if (
      normalized.includes('network') ||
      err?.code === 'ERR_NETWORK' ||
      !err?.response
    ) {
      return {
        title: 'Connection error',
        message: 'Unable to reach the authentication server. Please check your network connection and try again.',
      };
    }

    return {
      title: 'Login failed',
      message:
        typeof rawMsg === 'string' && rawMsg.trim().length > 0 && !rawMsg.includes('_')
          ? rawMsg
          : 'The email address or password is incorrect. Please check your credentials and try again.',
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError({
        title: 'Login failed',
        message: 'Please provide both staff email and password.',
      });
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await login(email.trim(), password);
      navigate('/');
    } catch (err) {
      console.error('Platform login error:', err);
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center py-10 sm:py-14 sm:px-6 lg:px-8 selection:bg-blue-600 selection:text-white relative overflow-hidden">
      {/* =========================================================================
          Detailed Pale-Blue Logistics Street Map Background (Full-Screen Fixed)
          ========================================================================= */}
      <div
        className="fixed inset-0 pointer-events-none select-none overflow-hidden z-0 flex items-center justify-center bg-white"
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 1600 1000"
          className="w-full h-full object-cover min-w-full min-h-full"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            {/* Soft Radial Center Mask to preserve pristine readability for the central login form */}
            <radialGradient id="mapCenterMask" cx="50%" cy="50%" r="42%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.94" />
              <stop offset="35%" stopColor="#FFFFFF" stopOpacity="0.82" />
              <stop offset="65%" stopColor="#FFFFFF" stopOpacity="0.30" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </radialGradient>

            {/* Glowing filter for main delivery route */}
            <filter id="routeSoftGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Marker pill shadow */}
            <filter id="pillShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#0F172A" floodOpacity="0.08" />
            </filter>

            {/* Waterway canal gradient */}
            <linearGradient id="waterwayGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F0F6FD" />
              <stop offset="100%" stopColor="#E6F0FA" />
            </linearGradient>
          </defs>

          {/* 1. Base Map Fill (#FFFFFF) */}
          <rect width="1600" height="1000" fill="#FFFFFF" />

          {/* 2. Zoned Logistics & Industrial Districts */}
          <g fill="#F7FAFD" stroke="#E3EDF7" strokeWidth="1" strokeDasharray="3 3">
            {/* Northwest Logistics Freight Yard */}
            <rect x="70" y="80" width="310" height="210" rx="8" />
            {/* North Intermodal Terminal */}
            <rect x="520" y="60" width="340" height="170" rx="8" />
            {/* Northeast Air Cargo Park */}
            <rect x="1220" y="70" width="310" height="230" rx="8" />
            {/* Southwest Marine Container Port */}
            <rect x="80" y="680" width="280" height="240" rx="8" fill="#F4F9FD" />
            {/* Central Rail Freight Depot */}
            <rect x="960" y="560" width="260" height="180" rx="8" />
            {/* Southeast Distribution Center */}
            <rect x="1280" y="660" width="260" height="260" rx="8" />
          </g>

          {/* Zoned District Identifier Labels (Subtle pale blue-grey) */}
          <g className="fill-[#94A3B8] font-mono text-[9px] tracking-wider select-none font-semibold" opacity="0.65">
            <text x="85" y="102">LOGISTICS FREIGHT PARK // WEST</text>
            <text x="535" y="82">INTERMODAL CARGO TERMINAL</text>
            <text x="1235" y="92">AIR FREIGHT LOGISTICS ZONE</text>
            <text x="95" y="702">PORT CARGO ACCESS // BASIN 02</text>
            <text x="975" y="582">CENTRAL RAIL FREIGHT YARD</text>
            <text x="1295" y="682">EAST DISTRIBUTION HUB</text>
          </g>

          {/* 3. Meandering Maritime Shipping Canal & Docks */}
          <g>
            <path
              d="M -40 500 C 160 500, 240 560, 400 600 C 560 640, 680 740, 840 780 C 1000 820, 1220 850, 1640 870 L 1640 940 C 1220 920, 1000 890, 840 850 C 680 810, 560 710, 400 670 C 240 630, 160 570, -40 570 Z"
              fill="url(#waterwayGrad)"
              stroke="#D7E4F5"
              strokeWidth="1.6"
            />
            {/* Canal Berths and Docks */}
            <path
              d="M 200 550 L 200 520 L 260 520 L 260 565 M 310 575 L 310 540 L 370 540 L 370 590 M 700 750 L 750 720 L 790 735"
              fill="none"
              stroke="#D7E4F5"
              strokeWidth="1.8"
            />
            <text x="440" y="640" className="fill-[#A0B3CC] font-mono text-[8px] tracking-widest select-none font-medium">
              GRAND MARITIME CANAL // DEPTH 14M
            </text>
          </g>

          {/* 4. Fine Technical Map Coordinate Grid Lines */}
          <g stroke="#E8EFF8" strokeWidth="0.75" strokeDasharray="3 9" opacity="0.8">
            <line x1="0" y1="200" x2="1600" y2="200" />
            <line x1="0" y1="400" x2="1600" y2="400" />
            <line x1="0" y1="600" x2="1600" y2="600" />
            <line x1="0" y1="800" x2="1600" y2="800" />
            <line x1="200" y1="0" x2="200" y2="1000" />
            <line x1="400" y1="0" x2="400" y2="1000" />
            <line x1="600" y1="0" x2="600" y2="1000" />
            <line x1="800" y1="0" x2="800" y2="1000" />
            <line x1="1000" y1="0" x2="1000" y2="1000" />
            <line x1="1200" y1="0" x2="1200" y2="1000" />
            <line x1="1400" y1="0" x2="1400" y2="1000" />
          </g>

          {/* Precision Crosshairs at Grid Intersections */}
          <g stroke="#CBD5E1" strokeWidth="0.8" opacity="0.6">
            {[200, 400, 600, 800, 1000, 1200, 1400].map((x) =>
              [200, 400, 600, 800].map((y) => (
                <g key={`cross-${x}-${y}`}>
                  <line x1={x - 4} y1={y} x2={x + 4} y2={y} />
                  <line x1={x} y1={y - 4} x2={x} y2={y + 4} />
                </g>
              ))
            )}
          </g>

          {/* 5. Detailed Local Streets / Urban Grid (Tertiary roads: #E8EFF8, width 2.2px) */}
          <g fill="none" stroke="#E8EFF8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.95">
            {/* Northwest Grid */}
            <line x1="40" y1="40" x2="480" y2="40" />
            <line x1="40" y1="120" x2="480" y2="120" />
            <line x1="40" y1="160" x2="480" y2="160" />
            <line x1="40" y1="200" x2="480" y2="200" />
            <line x1="40" y1="240" x2="480" y2="240" />
            <line x1="40" y1="280" x2="480" y2="280" />
            <line x1="40" y1="320" x2="480" y2="320" />
            <line x1="40" y1="360" x2="480" y2="360" />
            <line x1="40" y1="440" x2="480" y2="440" />
            <line x1="40" y1="40" x2="40" y2="480" />
            <line x1="100" y1="40" x2="100" y2="480" />
            <line x1="160" y1="40" x2="160" y2="480" />
            <line x1="220" y1="40" x2="220" y2="480" />
            <line x1="320" y1="40" x2="320" y2="480" />
            <line x1="380" y1="40" x2="380" y2="480" />
            <line x1="460" y1="40" x2="460" y2="480" />

            {/* Southwest Grid */}
            <line x1="40" y1="520" x2="440" y2="520" />
            <line x1="40" y1="580" x2="440" y2="580" />
            <line x1="40" y1="620" x2="440" y2="620" />
            <line x1="40" y1="700" x2="440" y2="700" />
            <line x1="40" y1="740" x2="440" y2="740" />
            <line x1="40" y1="780" x2="440" y2="780" />
            <line x1="40" y1="820" x2="440" y2="820" />
            <line x1="40" y1="880" x2="440" y2="880" />
            <line x1="40" y1="920" x2="440" y2="920" />
            <line x1="40" y1="960" x2="440" y2="960" />
            <line x1="60" y1="520" x2="60" y2="980" />
            <line x1="120" y1="520" x2="120" y2="980" />
            <line x1="220" y1="520" x2="220" y2="980" />
            <line x1="300" y1="520" x2="300" y2="980" />
            <line x1="360" y1="520" x2="360" y2="980" />
            <line x1="420" y1="520" x2="420" y2="980" />

            {/* Center City Streets */}
            <line x1="500" y1="40" x2="1100" y2="40" />
            <line x1="500" y1="100" x2="1100" y2="100" />
            <line x1="500" y1="160" x2="1100" y2="160" />
            <line x1="500" y1="220" x2="1100" y2="220" />
            <line x1="500" y1="300" x2="1100" y2="300" />
            <line x1="500" y1="360" x2="1100" y2="360" />
            <line x1="500" y1="420" x2="1100" y2="420" />
            <line x1="500" y1="500" x2="1100" y2="500" />
            <line x1="500" y1="560" x2="1100" y2="560" />
            <line x1="500" y1="620" x2="1100" y2="620" />
            <line x1="500" y1="700" x2="1100" y2="700" />
            <line x1="500" y1="760" x2="1100" y2="760" />
            <line x1="500" y1="840" x2="1100" y2="840" />
            <line x1="500" y1="900" x2="1100" y2="900" />
            <line x1="500" y1="960" x2="1100" y2="960" />
            <line x1="540" y1="40" x2="540" y2="980" />
            <line x1="620" y1="40" x2="620" y2="980" />
            <line x1="720" y1="40" x2="720" y2="980" />
            <line x1="780" y1="40" x2="780" y2="980" />
            <line x1="860" y1="40" x2="860" y2="980" />
            <line x1="940" y1="40" x2="940" y2="980" />
            <line x1="1020" y1="40" x2="1020" y2="980" />
            <line x1="1080" y1="40" x2="1080" y2="980" />

            {/* Northeast Grid */}
            <line x1="1120" y1="40" x2="1560" y2="40" />
            <line x1="1120" y1="100" x2="1560" y2="100" />
            <line x1="1120" y1="160" x2="1560" y2="160" />
            <line x1="1120" y1="220" x2="1560" y2="220" />
            <line x1="1120" y1="280" x2="1560" y2="280" />
            <line x1="1120" y1="360" x2="1560" y2="360" />
            <line x1="1120" y1="420" x2="1560" y2="420" />
            <line x1="1120" y1="480" x2="1560" y2="480" />
            <line x1="1160" y1="40" x2="1160" y2="500" />
            <line x1="1220" y1="40" x2="1220" y2="500" />
            <line x1="1300" y1="40" x2="1300" y2="500" />
            <line x1="1360" y1="40" x2="1360" y2="500" />
            <line x1="1440" y1="40" x2="1440" y2="500" />
            <line x1="1520" y1="40" x2="1520" y2="500" />

            {/* Southeast Grid */}
            <line x1="1120" y1="540" x2="1560" y2="540" />
            <line x1="1120" y1="600" x2="1560" y2="600" />
            <line x1="1120" y1="660" x2="1560" y2="660" />
            <line x1="1120" y1="720" x2="1560" y2="720" />
            <line x1="1120" y1="780" x2="1560" y2="780" />
            <line x1="1120" y1="840" x2="1560" y2="840" />
            <line x1="1120" y1="900" x2="1560" y2="900" />
            <line x1="1120" y1="960" x2="1560" y2="960" />
            <line x1="1160" y1="520" x2="1160" y2="980" />
            <line x1="1220" y1="520" x2="1220" y2="980" />
            <line x1="1300" y1="520" x2="1300" y2="980" />
            <line x1="1360" y1="520" x2="1360" y2="980" />
            <line x1="1440" y1="520" x2="1440" y2="980" />
            <line x1="1520" y1="520" x2="1520" y2="980" />
          </g>

          {/* 6. Secondary Roads & Major City Avenues (#E8EFF8, width 5.5px) */}
          <g fill="none" stroke="#E8EFF8" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round">
            {/* North-South Major Avenues */}
            <line x1="140" y1="-20" x2="140" y2="1020" />
            <line x1="280" y1="-20" x2="280" y2="1020" />
            <line x1="440" y1="-20" x2="440" y2="1020" />
            <line x1="660" y1="-20" x2="660" y2="1020" />
            <line x1="900" y1="-20" x2="900" y2="1020" />
            <line x1="1140" y1="-20" x2="1140" y2="1020" />
            <line x1="1380" y1="-20" x2="1380" y2="1020" />

            {/* East-West Major Boulevards */}
            <line x1="-20" y1="140" x2="1620" y2="140" />
            <line x1="-20" y1="340" x2="1620" y2="340" />
            <line x1="-20" y1="460" x2="1620" y2="460" />
            <line x1="-20" y1="640" x2="1620" y2="640" />
            <line x1="-20" y1="760" x2="1620" y2="760" />
            <line x1="-20" y1="880" x2="1620" y2="880" />

            {/* Diagonal Connecting Boulevards */}
            <line x1="-20" y1="280" x2="460" y2="80" />
            <line x1="260" y1="980" x2="920" y2="520" />
            <line x1="740" y1="40" x2="1420" y2="520" />
            <line x1="1120" y1="980" x2="1620" y2="640" />
          </g>

          {/* Traffic Circles / Roundabouts on Major Avenues */}
          <g fill="#FFFFFF" stroke="#E8EFF8" strokeWidth="5">
            <circle cx="280" cy="340" r="16" />
            <circle cx="660" cy="140" r="16" />
            <circle cx="900" cy="640" r="18" />
            <circle cx="1380" cy="340" r="16" />
            <circle cx="440" cy="760" r="16" />
            <circle cx="1140" cy="760" r="16" />
          </g>
          <g fill="#D7E4F5">
            <circle cx="280" cy="340" r="5" />
            <circle cx="660" cy="140" r="5" />
            <circle cx="900" cy="640" r="6" />
            <circle cx="1380" cy="340" r="5" />
            <circle cx="440" cy="760" r="5" />
            <circle cx="1140" cy="760" r="5" />
          </g>

          {/* 7. Primary Map Roads & Expressways (#D7E4F5, width 11px) */}
          <g fill="none" stroke="#D7E4F5" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round">
            {/* Metropolitan Diagonal Expressway (Major City Spine) */}
            <path d="M -40 820 C 260 760, 460 640, 680 540 C 900 440, 1180 320, 1640 140" />
            {/* Outer Circumferential Beltway */}
            <path d="M 240 -40 C 240 280, 180 440, 180 640 C 180 840, 360 960, 680 960 C 1020 960, 1380 920, 1640 760" />
            {/* Trans-Corridor Expressway (East-West) */}
            <path d="M -40 220 L 640 220 C 860 220, 1060 260, 1640 260" />
            {/* North-South Superhighway 85 */}
            <path d="M 800 -40 L 800 400 C 800 540, 840 700, 840 1040" />
          </g>

          {/* Expressways Center Divider Dashes (#FFFFFF, width 3.2px) */}
          <g fill="none" stroke="#FFFFFF" strokeWidth="3.2" strokeDasharray="14 12" strokeLinecap="butt" opacity="0.95">
            <path d="M -40 820 C 260 760, 460 640, 680 540 C 900 440, 1180 320, 1640 140" />
            <path d="M 240 -40 C 240 280, 180 440, 180 640 C 180 840, 360 960, 680 960 C 1020 960, 1380 920, 1640 760" />
            <path d="M -40 220 L 640 220 C 860 220, 1060 260, 1640 260" />
            <path d="M 800 -40 L 800 400 C 800 540, 840 700, 840 1040" />
          </g>

          {/* Highway Bridge Piers & Overpasses */}
          <g stroke="#CBD5E1" strokeWidth="13" strokeLinecap="butt">
            <line x1="640" y1="560" x2="720" y2="520" />
            <line x1="1340" y1="925" x2="1420" y2="915" />
          </g>
          <g stroke="#D7E4F5" strokeWidth="10" strokeLinecap="butt">
            <line x1="640" y1="560" x2="720" y2="520" />
            <line x1="1340" y1="925" x2="1420" y2="915" />
          </g>

          {/* Highway Interchanges & Exit Ramps */}
          <g fill="none" stroke="#D7E4F5" strokeWidth="5.5" strokeLinecap="round">
            <path d="M 640 500 C 660 500, 680 520, 680 540" />
            <path d="M 720 580 C 700 580, 680 560, 680 540" />
            <path d="M 220 800 C 260 800, 300 760, 340 730" />
            <path d="M 760 180 C 760 220, 800 220, 840 220" />
            <path d="M 840 260 C 800 260, 800 300, 800 340" />
            <path d="M 1120 360 C 1180 340, 1220 300, 1260 260" />
          </g>

          {/* Secondary Alternative Delivery Route (Ghost / Optimization route) */}
          <g fill="none">
            <path
              d="M 460 620 C 490 680, 540 740, 640 760 L 860 760 C 960 760, 1040 680, 1080 580 L 1100 360"
              stroke="#93C5FD"
              strokeWidth="3.2"
              strokeDasharray="6 8"
              opacity="0.65"
            />
          </g>
          {/* Secondary Route Badge */}
          <g transform="translate(670, 775)" filter="url(#pillShadow)">
            <rect x="0" y="0" width="168" height="22" rx="11" fill="#FFFFFF" stroke="#BFDBFE" strokeWidth="1" />
            <text x="10" y="14" className="fill-[#3B82F6] font-mono text-[8.5px] font-bold tracking-wider select-none">
              ALT ROUTE B // -6 MIN CLEAR
            </text>
          </g>

          {/* =========================================================================
              8. THE PROMINENT BLUE LOGISTICS ROUTE RUNNING DIAGONALLY ACROSS SCREEN
              ========================================================================= */}
          {/*
              Route geometry designed to cleanly frame the center login card:
              Origin (160, 850) -> Stop 1 (460, 620) [clear on left]
              Crosses through mid corridor (660, 520) -> (840, 470)
              Stop 2 (1100, 360) [clear on right]
              Stop 3 (1280, 250) [clear on upper-right]
              Destination (1460, 140) [top-right hub]
          */}

          {/* Route Layer 1: Wide Ambient Highlight Underlay (#EFF6FF) */}
          <path
            d="M 160 850 L 160 740 C 160 680 200 650 260 650 L 380 650 C 420 650 440 640 460 620 C 510 560 580 520 680 490 L 820 470 C 940 470 1020 420 1100 360 C 1160 310 1210 280 1280 250 C 1340 220 1400 170 1460 140"
            fill="none"
            stroke="#EFF6FF"
            strokeWidth="32"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.95"
          />

          {/* Route Layer 2: Soft Blue Glow Ribbon (#DBEAFE) with Filter */}
          <path
            d="M 160 850 L 160 740 C 160 680 200 650 260 650 L 380 650 C 420 650 440 640 460 620 C 510 560 580 520 680 490 L 820 470 C 940 470 1020 420 1100 360 C 1160 310 1210 280 1280 250 C 1340 220 1400 170 1460 140"
            fill="none"
            stroke="#DBEAFE"
            strokeWidth="18"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#routeSoftGlow)"
            opacity="0.85"
          />

          {/* Route Layer 3: Subtle Drop Shadow for Route Elevation */}
          <path
            d="M 160 850 L 160 740 C 160 680 200 650 260 650 L 380 650 C 420 650 440 640 460 620 C 510 560 580 520 680 490 L 820 470 C 940 470 1020 420 1100 360 C 1160 310 1210 280 1280 250 C 1340 220 1400 170 1460 140"
            fill="none"
            stroke="#2563EB"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.14"
            transform="translate(0, 3)"
          />

          {/* Route Layer 4: Prominent Blue Route Line (#5B84D7) */}
          <path
            d="M 160 850 L 160 740 C 160 680 200 650 260 650 L 380 650 C 420 650 440 640 460 620 C 510 560 580 520 680 490 L 820 470 C 940 470 1020 420 1100 360 C 1160 310 1210 280 1280 250 C 1340 220 1400 170 1460 140"
            fill="none"
            stroke="#5B84D7"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Route Layer 5: Route Core Spine Line (#2563EB) */}
          <path
            d="M 160 850 L 160 740 C 160 680 200 650 260 650 L 380 650 C 420 650 440 640 460 620 C 510 560 580 520 680 490 L 820 470 C 940 470 1020 420 1100 360 C 1160 310 1210 280 1280 250 C 1340 220 1400 170 1460 140"
            fill="none"
            stroke="#2563EB"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Route Layer 6: Directional Flow Dashes (White Interior Guidance) */}
          <path
            d="M 160 850 L 160 740 C 160 680 200 650 260 650 L 380 650 C 420 650 440 640 460 620 C 510 560 580 520 680 490 L 820 470 C 940 470 1020 420 1100 360 C 1160 310 1210 280 1280 250 C 1340 220 1400 170 1460 140"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="1.6"
            strokeDasharray="8 14"
            strokeLinecap="round"
            opacity="0.9"
          />

          {/* Subtle Directional Chevrons along Route */}
          <g fill="#2563EB" opacity="0.8">
            <path d="M 310 646 L 318 650 L 310 654 Z" />
            <path d="M 350 646 L 358 650 L 350 654 Z" />
            <path d="M 740 476 L 748 480 L 740 484 Z" />
            <path d="M 780 468 L 788 472 L 780 476 Z" />
            <path d="M 1190 292 L 1198 288 L 1196 296 Z" />
            <path d="M 1360 202 L 1368 198 L 1366 206 Z" />
          </g>

          {/* =========================================================================
              9. DISTANCE MARKERS & ROUTE LABELS ALONG THE ROUTE
              ========================================================================= */}
          {/* Distance Tag 1: Start to Stop 1 */}
          <g transform="translate(290, 616)" filter="url(#pillShadow)">
            <rect x="0" y="0" width="62" height="20" rx="10" fill="#EFF6FF" stroke="#BFDBFE" strokeWidth="1" />
            <text x="9" y="13.5" className="fill-[#2563EB] font-mono text-[9px] font-bold select-none">
              14.8 km
            </text>
          </g>

          {/* Distance Tag 2: Stop 1 to Stop 2 */}
          <g transform="translate(940, 410)" filter="url(#pillShadow)">
            <rect x="0" y="0" width="62" height="20" rx="10" fill="#EFF6FF" stroke="#BFDBFE" strokeWidth="1" />
            <text x="9" y="13.5" className="fill-[#2563EB] font-mono text-[9px] font-bold select-none">
              14.6 km
            </text>
          </g>

          {/* Distance Tag 3: Stop 2 to Stop 3 */}
          <g transform="translate(1180, 280)" filter="url(#pillShadow)">
            <rect x="0" y="0" width="62" height="20" rx="10" fill="#EFF6FF" stroke="#BFDBFE" strokeWidth="1" />
            <text x="9" y="13.5" className="fill-[#2563EB] font-mono text-[9px] font-bold select-none">
              11.8 km
            </text>
          </g>

          {/* Distance Tag 4: Stop 3 to Destination */}
          <g transform="translate(1360, 160)" filter="url(#pillShadow)">
            <rect x="0" y="0" width="62" height="20" rx="10" fill="#EFF6FF" stroke="#BFDBFE" strokeWidth="1" />
            <text x="9" y="13.5" className="fill-[#2563EB] font-mono text-[9px] font-bold select-none">
              15.2 km
            </text>
          </g>

          {/* High-Level Route Identifier Badge */}
          <g transform="translate(200, 510)" filter="url(#pillShadow)">
            <rect x="0" y="0" width="230" height="26" rx="13" fill="#FFFFFF" stroke="#D7E4F5" strokeWidth="1.2" />
            <circle cx="14" cy="13" r="4" fill="#2563EB" />
            <text x="26" y="17" className="fill-[#0F172A] font-mono text-[9.5px] font-bold tracking-wide select-none">
              ROUTE #KF-840 • EXPRESS CORRIDOR
            </text>
          </g>

          {/* =========================================================================
              10. ROUTE START, INTERMEDIATE STOPS & DESTINATION MARKERS
              ========================================================================= */}

          {/* A. START MARKER: Southwest Origin Depot (160, 850) */}
          <g transform="translate(160, 850)">
            <circle r="22" fill="#2563EB" opacity="0.12" />
            <circle r="15" fill="#EFF6FF" stroke="#5B84D7" strokeWidth="2.5" />
            <circle r="9" fill="#2563EB" />
            <circle r="3.5" fill="#FFFFFF" />
          </g>
          {/* Origin Depot Info Pill */}
          <g transform="translate(60, 882)" filter="url(#pillShadow)">
            <rect x="0" y="0" width="200" height="36" rx="18" fill="#FFFFFF" stroke="#D7E4F5" strokeWidth="1.2" />
            <circle cx="18" cy="18" r="6" fill="#2563EB" />
            <text x="32" y="16" className="fill-[#0F172A] font-sans text-[11px] font-bold select-none">
              ORIGIN // DEPOT 01
            </text>
            <text x="32" y="28" className="fill-[#64748B] font-mono text-[8.5px] select-none">
              DEP. 08:30 AM • DISPATCHED
            </text>
          </g>

          {/* B. INTERMEDIATE STOP 01 (460, 620) - Left of Card */}
          <g transform="translate(460, 620)">
            <circle r="14" fill="#EFF6FF" stroke="#5B84D7" strokeWidth="2" />
            <circle r="8" fill="#2563EB" />
            <text x="0" y="3.5" textAnchor="middle" className="fill-white font-mono text-[9px] font-black select-none">
              1
            </text>
          </g>
          {/* Stop 01 Pill */}
          <g transform="translate(330, 560)" filter="url(#pillShadow)">
            <rect x="0" y="0" width="150" height="30" rx="15" fill="#FFFFFF" stroke="#D7E4F5" strokeWidth="1.2" />
            <text x="14" y="14" className="fill-[#2563EB] font-sans text-[10px] font-bold select-none">
              STOP 01 • 14.8 km
            </text>
            <text x="14" y="24" className="fill-[#10B981] font-mono text-[8.5px] font-semibold select-none">
              ✓ DELIVERED 09:12 AM
            </text>
          </g>

          {/* C. INTERMEDIATE STOP 02 - ACTIVE DISPATCH IN TRANSIT (1100, 360) - Right of Card */}
          <g transform="translate(1100, 360)">
            <circle r="20" fill="#2563EB" opacity="0.18" className="animate-ping" />
            <circle r="14" fill="#2563EB" stroke="#FFFFFF" strokeWidth="2.5" />
            {/* White Delivery Vehicle Icon */}
            <path
              d="M -4.5 -2.5 L 1.5 -2.5 L 3.5 0 L 4.5 0 C 4.5 0, 4.5 3, 4.5 3 L -4.5 3 Z"
              fill="#FFFFFF"
            />
            <circle cx="-2.5" cy="3.5" r="1.5" fill="#2563EB" />
            <circle cx="2.5" cy="3.5" r="1.5" fill="#2563EB" />
          </g>
          {/* Stop 02 Pill */}
          <g transform="translate(1040, 305)" filter="url(#pillShadow)">
            <rect x="0" y="0" width="170" height="32" rx="16" fill="#FFFFFF" stroke="#2563EB" strokeWidth="1.5" />
            <circle cx="16" cy="16" r="4.5" fill="#2563EB" />
            <text x="27" y="15" className="fill-[#0F172A] font-sans text-[10px] font-bold select-none">
              STOP 02 • IN TRANSIT
            </text>
            <text x="27" y="25" className="fill-[#2563EB] font-mono text-[8.5px] font-bold select-none">
              SPD: 58 KM/H • ON SCHEDULE
            </text>
          </g>

          {/* D. INTERMEDIATE STOP 03 (1280, 250) */}
          <g transform="translate(1280, 250)">
            <circle r="14" fill="#EFF6FF" stroke="#5B84D7" strokeWidth="2" />
            <circle r="8" fill="#2563EB" />
            <text x="0" y="3.5" textAnchor="middle" className="fill-white font-mono text-[9px] font-black select-none">
              3
            </text>
          </g>
          {/* Stop 03 Pill */}
          <g transform="translate(1210, 200)" filter="url(#pillShadow)">
            <rect x="0" y="0" width="140" height="30" rx="15" fill="#FFFFFF" stroke="#D7E4F5" strokeWidth="1.2" />
            <text x="14" y="14" className="fill-[#2563EB] font-sans text-[10px] font-bold select-none">
              STOP 03 • 41.2 km
            </text>
            <text x="14" y="24" className="fill-[#64748B] font-mono text-[8.5px] select-none">
              ETA 10:45 AM • PENDING
            </text>
          </g>

          {/* E. DESTINATION MARKER: Northeast Distribution Hub (1460, 140) */}
          <g transform="translate(1460, 140)">
            <circle r="26" fill="#EFF6FF" stroke="#5B84D7" strokeWidth="1.5" />
            <circle r="17" fill="#FFFFFF" stroke="#2563EB" strokeWidth="3.5" />
            <circle r="8" fill="#2563EB" />
            <circle r="3" fill="#FFFFFF" />
          </g>
          {/* Destination Info Pill */}
          <g transform="translate(1340, 80)" filter="url(#pillShadow)">
            <rect x="0" y="0" width="210" height="38" rx="19" fill="#FFFFFF" stroke="#2563EB" strokeWidth="1.5" />
            <text x="18" y="17" className="fill-[#0F172A] font-sans text-[11px] font-bold select-none">
              ★ DESTINATION // HUB NORTH
            </text>
            <text x="18" y="29" className="fill-[#2563EB] font-mono text-[9px] font-bold select-none">
              FINAL DROP • 56.4 KM TOTAL
            </text>
          </g>

          {/* =========================================================================
              11. SUBTLE STREET NAMES & MAP LABELS (Low-contrast pale blue-grey)
              ========================================================================= */}
          <g className="fill-[#94A3B8] font-mono text-[8.5px] tracking-wider select-none font-medium" opacity="0.75">
            <text x="270" y="664">PORT ARTERIAL BLVD</text>
            <text x="640" y="555" transform="rotate(-26, 640, 555)">
              METRO EXPRESSWAY (ROUTE 101)
            </text>
            <text x="1040" y="440" transform="rotate(-30, 1040, 440)">
              NORTH LOGISTICS EXPRESSWAY
            </text>
            <text x="1290" y="210">NORTH FREIGHT PARKWAY</text>
            <text x="150" y="235">WEST DISTRIBUTION AVE</text>
            <text x="815" y="110">COMMERCE BOULEVARD</text>
            <text x="1395" y="470">EAST ARTERIAL WAY</text>
            <text x="455" y="870">SOUTH BELTWAY CORRIDOR</text>
            <text x="1155" y="870">INTERMODAL LOGISTICS WAY</text>
          </g>

          {/* =========================================================================
              12. TECHNICAL NAVIGATION OVERLAY & TELEMETRY CONTROLS
              ========================================================================= */}

          {/* Top-Left: Compass Orientation Widget */}
          <g transform="translate(48, 48)">
            <circle cx="16" cy="16" r="16" fill="#FFFFFF" stroke="#D7E4F5" strokeWidth="1.2" />
            <polygon points="16,6 20,16 16,14 12,16" fill="#2563EB" />
            <polygon points="16,26 20,16 16,14 12,16" fill="#CBD5E1" />
            <text x="16" y="4" textAnchor="middle" className="fill-[#2563EB] font-mono text-[8px] font-black select-none">
              N
            </text>
          </g>

          {/* Top-Right: Logistics Fleet Telemetry Pill */}
          <g transform="translate(1210, 24)" filter="url(#pillShadow)">
            <rect x="0" y="0" width="340" height="28" rx="14" fill="#FFFFFF" stroke="#D7E4F5" strokeWidth="1" />
            <circle cx="14" cy="14" r="4" fill="#10B981" />
            <text x="24" y="18" className="fill-[#475569] font-mono text-[9px] font-semibold select-none">
              ● FLEET DISPATCH // ONLINE • 48 ACTIVE UNITS • 99.9% SLA
            </text>
          </g>

          {/* Bottom-Left: Map Scale Indicator */}
          <g transform="translate(48, 950)">
            <rect x="0" y="0" width="130" height="3" fill="#94A3B8" />
            <rect x="0" y="-3" width="2" height="9" fill="#94A3B8" />
            <rect x="65" y="-2" width="1.5" height="7" fill="#94A3B8" />
            <rect x="130" y="-3" width="2" height="9" fill="#94A3B8" />
            <text x="0" y="16" className="fill-[#94A3B8] font-mono text-[8px] select-none">0</text>
            <text x="56" y="16" className="fill-[#94A3B8] font-mono text-[8px] select-none">500 m</text>
            <text x="118" y="16" className="fill-[#94A3B8] font-mono text-[8px] select-none">1 km</text>
          </g>

          {/* Bottom-Right: GPS Telemetry & Status */}
          <g transform="translate(1310, 960)">
            <text x="0" y="0" className="fill-[#94A3B8] font-mono text-[8.5px] tracking-wider select-none">
              LAT 43°38&apos;52&quot;N • LON 79°23&apos;14&quot;W • GPS FIXED
            </text>
          </g>

          {/* Understated Map Border Corner Framing Accents */}
          <g stroke="#94A3B8" strokeWidth="1.2" fill="none" opacity="0.5">
            <path d="M 16 36 L 16 16 L 36 16" />
            <path d="M 1584 36 L 1584 16 L 1564 16" />
            <path d="M 16 964 L 16 984 L 36 984" />
            <path d="M 1584 964 L 1584 984 L 1564 984" />
          </g>

          {/* =========================================================================
              13. SOFT CENTER VIGNETTE MASK FOR MAXIMUM FORM CONTRAST & READABILITY
              ========================================================================= */}
          <rect x="0" y="0" width="1600" height="1000" fill="url(#mapCenterMask)" />
        </svg>
      </div>

      {/* =========================================================================
          Header with KargoFlow Branding (Preserved Exactly)
          ========================================================================= */}
      <div className="sm:mx-auto w-[calc(100%-40px)] sm:w-full sm:max-w-[560px] relative z-10 flex flex-col items-center">
        <div className="flex justify-center">
          <div className="w-[316px] h-[118px] rounded-2xl bg-white shadow-[0_4px_20px_-4px_rgba(15,23,42,0.06),0_1px_3px_rgba(0,0,0,0.02)] border border-[#E2E8F0] flex items-center justify-center transition-transform hover:scale-[1.01] p-3">
            <img
              src={kargoflowLogo}
              alt="KargoFlow CRM"
              className="h-[82px] sm:h-[88px] w-auto object-contain"
            />
          </div>
        </div>
        <h2 className="mt-5 sm:mt-6 text-center text-3xl sm:text-[40px] md:text-[42px] font-bold tracking-tight text-[#0F172A] leading-tight">
          Platform Admin
        </h2>
        <p className="mt-1.5 sm:mt-2 text-center text-sm sm:text-[18px] md:text-[20px] text-slate-500 font-medium leading-normal whitespace-normal sm:whitespace-nowrap">
          Internal SaaS Control Plane &amp; Multi-Tenant Management Portal
        </p>
      </div>

      {/* =========================================================================
          Main Login Card - Exactly Proportioned & Preserved
          ========================================================================= */}
      <div className="mt-6 sm:mt-7 sm:mx-auto w-[calc(100%-40px)] sm:w-full sm:max-w-[560px] relative z-10">
        <div className="bg-white border border-[#E2E8F0] shadow-[0_24px_60px_-12px_rgba(15,23,42,0.08),0_2px_8px_-2px_rgba(15,23,42,0.04)] rounded-[16px] p-7 sm:p-[36px] box-border">
          {/* Error Alert */}
          {error && (
            <div
              role="alert"
              className="mb-5 p-3.5 rounded-xl bg-red-50/90 border border-red-200 text-red-700 text-xs flex items-start gap-3 animate-in fade-in transition-all"
            >
              <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-xs mb-0.5 text-red-900">
                  {error.title || 'Login failed'}
                </div>
                <div className="leading-relaxed text-[12px] text-red-700">
                  {error.message || error}
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-[22px]">
            <div>
              <label className="block text-[15px] font-semibold text-[#0F172A] mb-2">
                Email Address
              </label>
              <div className="relative w-full">
                <div className="absolute inset-y-0 left-0 pl-[16px] flex items-center pointer-events-none text-slate-400">
                  <Mail size={20} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="admin@fastmovers.com"
                  required
                  className="w-full box-border h-[58px] pl-[50px] pr-[16px] bg-white border border-[#D6E4FF] hover:border-blue-300 focus:border-[#2563EB] rounded-[12px] text-[16px] sm:text-[17px] text-[#0F172A] placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-600/10 transition-all duration-150"
                />
              </div>
            </div>

            <div>
              <label className="block text-[15px] font-semibold text-[#0F172A] mb-2">
                Password
              </label>
              <div className="relative w-full">
                <div className="absolute inset-y-0 left-0 pl-[16px] flex items-center pointer-events-none text-slate-400">
                  <Lock size={20} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="••••••••"
                  required
                  className="w-full box-border h-[58px] pl-[50px] pr-[50px] bg-white border border-[#D6E4FF] hover:border-blue-300 focus:border-[#2563EB] rounded-[12px] text-[16px] sm:text-[17px] text-[#0F172A] placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-600/10 transition-all duration-150 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 pr-[16px] flex items-center text-slate-400 hover:text-slate-600 transition-colors focus:outline-none cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 h-[60px] sm:h-[62px] px-5 bg-[#2563EB] hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-300 text-white text-[16px] sm:text-[17px] font-bold rounded-[12px] shadow-sm shadow-blue-600/25 hover:shadow-md hover:shadow-blue-600/30 flex items-center justify-center gap-2.5 transition-all duration-150 cursor-pointer disabled:cursor-not-allowed select-none"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  <span>Verifying Staff Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Platform Admin</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
