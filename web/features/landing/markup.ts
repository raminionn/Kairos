// Static, trusted marketing markup ported from docs/specs/2026-11-23-web-landing-mock.html.
// Rendered with dangerouslySetInnerHTML; it never contains user input.
export const landingMarkup = `
<!-- shared SVG defs: grain + halftone -->
<svg width="0" height="0" style="position:absolute">
  <defs>
    <filter id="grain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="2" seed="4" result="n"/>
      <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .55 -.18" in="n" result="w"/>
      <feComposite in="w" in2="SourceGraphic" operator="in" result="g"/>
      <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="g"/></feMerge>
    </filter>
    <pattern id="dots" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.7" fill="#2a1a8a"/></pattern>
    <pattern id="dotsL" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.6" fill="#dcd6ff"/></pattern>
    <radialGradient id="lens" cx="30%" cy="28%" r="80%"><stop offset="0" stop-color="#fbf6ff"/><stop offset=".35" stop-color="#b9b3ee"/><stop offset=".7" stop-color="#5a4fd0"/><stop offset="1" stop-color="#2b1a9a"/></radialGradient>
    <radialGradient id="smile" cx="35%" cy="35%" r="75%"><stop offset="0" stop-color="#d8dcff"/><stop offset=".6" stop-color="#8b92e8"/><stop offset="1" stop-color="#4b3fc4"/></radialGradient>
    <linearGradient id="ext" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffb12e"/><stop offset="1" stop-color="#e2361b"/></linearGradient>
    <linearGradient id="pk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffa6ea"/><stop offset="1" stop-color="#ee62c4"/></linearGradient>
    <linearGradient id="pencil" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff2a8"/><stop offset=".5" stop-color="#ffd23a"/><stop offset="1" stop-color="#f0a21a"/></linearGradient>
    <!-- 3D play-ring: back face + side + front -->
    <g id="playring">
      <path d="M40 0 L250 120 Q275 135 250 150 L40 270 Q10 287 10 252 L10 18 Q10 -17 40 0Z" transform="translate(-26,22)" fill="url(#ext)" filter="url(#grain)"/>
      <path d="M40 0 L250 120 Q275 135 250 150 L40 270 Q10 287 10 252 L10 18 Q10 -17 40 0Z" fill="url(#pk)" filter="url(#grain)"/>
      <path d="M70 75 L180 135 L70 195Z" fill="#3a0ca8"/>
      <path d="M70 75 L180 135 L160 135 L70 86Z" fill="#e85aa8"/>
    </g>
    <g id="lensball">
      <circle r="190" fill="none" stroke="#c9bfff" stroke-opacity=".55" stroke-width="2"/>
      <circle r="100" fill="none" stroke="#c9bfff" stroke-opacity=".55" stroke-width="2"/>
      <g class="spin"><circle r="86" fill="url(#lens)" filter="url(#grain)"/>
      <path d="M20 -60 A86 86 0 0 1 60 60 A86 86 0 0 1 -40 76 Z" fill="url(#dots)" opacity=".7"/>
      <circle cx="-4" cy="-6" r="9" fill="#4b2fb5"/></g>
    </g>
    <linearGradient id="clipg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff8fd8"/><stop offset=".55" stop-color="#f05bb5"/><stop offset="1" stop-color="#ffb12e"/></linearGradient>
    <linearGradient id="clipg2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8b92e8"/><stop offset="1" stop-color="#4b0fc8"/></linearGradient>
    <!-- 3D vertical phone playing a captioned clip (180x340) -->
    <g id="phone">
      <rect x="-18" y="14" width="180" height="340" rx="30" fill="#1a0a66"/>
      <rect width="180" height="340" rx="30" fill="#2b1590" filter="url(#grain)"/>
      <rect x="12" y="14" width="156" height="312" rx="20" fill="url(#clipg)" filter="url(#grain)"/>
      <circle cx="90" cy="150" r="34" fill="#4b0fc8"/><path d="M30 326 Q34 210 90 200 Q146 210 150 326Z" fill="#4b0fc8"/>
      <rect x="26" y="236" width="128" height="26" rx="6" fill="#fff"/><text x="90" y="254" font-size="13" font-weight="700" text-anchor="middle" fill="#0c0c0c" font-family="Archivo">NOBODY TELLS</text>
      <rect x="44" y="266" width="92" height="26" rx="6" fill="#fbd431"/><text x="90" y="284" font-size="13" font-weight="700" text-anchor="middle" fill="#0c0c0c" font-family="Archivo">YOU THIS</text>
      <rect x="24" y="306" width="132" height="5" rx="2.5" fill="rgba(255,255,255,.35)"/><rect x="24" y="306" width="60" height="5" rx="2.5" fill="#fff"/>
      <circle cx="40" cy="44" r="18" fill="#fbd431"/><text x="40" y="50" font-size="15" font-weight="700" text-anchor="middle" fill="#0c0c0c" font-family="Archivo">#1</text>
    </g>
    <!-- product jar with passed check (160x210) -->
    <g id="jar">
      <rect x="22" y="0" width="116" height="36" rx="10" fill="#3a1fa8"/><rect x="22" y="0" width="116" height="36" rx="10" fill="url(#dotsL)" opacity=".3"/>
      <rect x="0" y="30" width="160" height="180" rx="34" fill="#ffb12e" filter="url(#grain)"/>
      <path d="M118 44 Q146 60 146 120" stroke="#fff3c4" stroke-width="10" fill="none" stroke-linecap="round" opacity=".7"/>
      <rect x="18" y="86" width="124" height="72" rx="10" fill="#fff"/>
      <text x="80" y="118" font-size="20" font-weight="700" text-anchor="middle" fill="#0c0c0c" font-family="Archivo">HONEY</text>
      <text x="80" y="142" font-size="11" text-anchor="middle" fill="#666" font-family="Archivo">ORGANIC · 500g</text>
      <circle cx="150" cy="40" r="26" fill="#22c55e"/><path d="M138 40 L147 49 L163 31" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
    <!-- carousel slide stack (220x200) -->
    <g id="slides">
      <g transform="translate(70,10) rotate(10)"><rect width="130" height="162" rx="12" fill="#fbd431"/></g>
      <g transform="translate(40,14) rotate(3)"><rect width="130" height="162" rx="12" fill="#f05bb5"/></g>
      <g transform="translate(10,20) rotate(-6)"><rect width="130" height="162" rx="12" fill="#fff"/>
        <text x="16" y="44" font-size="30" font-weight="600" fill="#0c0c0c" font-family="Archivo">5 tips</text>
        <rect x="16" y="62" width="96" height="8" rx="4" fill="#ddd"/><rect x="16" y="78" width="70" height="8" rx="4" fill="#ddd"/>
        <rect x="16" y="116" width="40" height="28" rx="6" fill="#5b12f5"/><text x="112" y="146" font-size="12" fill="#999" text-anchor="end" font-family="Archivo">1/5</text></g>
    </g>
    <!-- clapperboard (200x170) -->
    <g id="clap">
      <rect x="0" y="50" width="200" height="120" rx="12" fill="#21107a" filter="url(#grain)"/>
      <g transform="rotate(-14 0 50)"><rect x="0" y="14" width="200" height="36" rx="6" fill="#fff"/>
        <path d="M20 14 L44 14 L28 50 L4 50Z M70 14 L94 14 L78 50 L54 50Z M120 14 L144 14 L128 50 L104 50Z M170 14 L194 14 L178 50 L154 50Z" fill="#5b12f5"/></g>
      <rect x="22" y="86" width="90" height="10" rx="5" fill="#7d5cf0"/><rect x="22" y="110" width="60" height="10" rx="5" fill="#7d5cf0"/><circle cx="160" cy="120" r="22" fill="#f05bb5"/>
    </g>
    <!-- podcast mic (260x520) -->
    <g id="mic">
      <path d="M20 250 Q20 400 130 400 Q240 400 240 250" fill="none" stroke="#2b1590" stroke-width="26" stroke-linecap="round"/>
      <rect x="114" y="400" width="32" height="80" fill="#2b1590"/><rect x="40" y="472" width="180" height="40" rx="20" fill="#21107a"/>
      <rect x="50" y="0" width="160" height="320" rx="80" fill="url(#smile)" filter="url(#grain)"/>
      <rect x="50" y="0" width="160" height="320" rx="80" fill="url(#dots)" opacity=".45"/>
      <rect x="40" y="170" width="180" height="22" rx="11" fill="#fbd431"/>
    </g>
    <!-- filmstrip (600x120) -->
    <g id="film">
      <rect width="600" height="120" rx="10" fill="#160850"/>
      <g fill="#fbfbf7" opacity=".85"><rect x="14" y="8" width="18" height="12" rx="3"/><rect x="64" y="8" width="18" height="12" rx="3"/><rect x="114" y="8" width="18" height="12" rx="3"/><rect x="164" y="8" width="18" height="12" rx="3"/><rect x="214" y="8" width="18" height="12" rx="3"/><rect x="264" y="8" width="18" height="12" rx="3"/><rect x="314" y="8" width="18" height="12" rx="3"/><rect x="364" y="8" width="18" height="12" rx="3"/><rect x="414" y="8" width="18" height="12" rx="3"/><rect x="464" y="8" width="18" height="12" rx="3"/><rect x="514" y="8" width="18" height="12" rx="3"/><rect x="564" y="8" width="18" height="12" rx="3"/><rect x="14" y="100" width="18" height="12" rx="3"/><rect x="64" y="100" width="18" height="12" rx="3"/><rect x="114" y="100" width="18" height="12" rx="3"/><rect x="164" y="100" width="18" height="12" rx="3"/><rect x="214" y="100" width="18" height="12" rx="3"/><rect x="264" y="100" width="18" height="12" rx="3"/><rect x="314" y="100" width="18" height="12" rx="3"/><rect x="364" y="100" width="18" height="12" rx="3"/><rect x="414" y="100" width="18" height="12" rx="3"/><rect x="464" y="100" width="18" height="12" rx="3"/><rect x="514" y="100" width="18" height="12" rx="3"/><rect x="564" y="100" width="18" height="12" rx="3"/></g>
      <rect x="12" y="28" width="132" height="64" rx="6" fill="url(#clipg2)"/><rect x="156" y="28" width="132" height="64" rx="6" fill="url(#clipg)"/><rect x="300" y="28" width="132" height="64" rx="6" fill="url(#clipg2)"/><rect x="444" y="28" width="144" height="64" rx="6" fill="#fbd431"/>
    </g>
    <!-- scissors (180x110) -->
    <g id="scissors">
      <path d="M60 40 L180 90" stroke="#e9e6ff" stroke-width="12" stroke-linecap="round"/><path d="M60 70 L180 20" stroke="#cfcaf5" stroke-width="12" stroke-linecap="round"/>
      <circle cx="34" cy="30" r="24" fill="none" stroke="#f05bb5" stroke-width="12"/><circle cx="34" cy="82" r="24" fill="none" stroke="#f05bb5" stroke-width="12"/><circle cx="72" cy="55" r="6" fill="#fbd431"/>
    </g>
  </defs>
</svg>

<header><div class="wrap">
  <a class="logo" href="/">kairos<i></i></a>
  <nav class="pills"><a href="#features">Features</a><a href="#modules">Modules</a><a href="#how">How it works</a><a href="#faq">FAQ</a><a href="#contact">Contact</a></nav>
  <div class="right"><a href="/jobs">Jobs</a><a class="btn-black" href="/video">New Job</a></div>
</div></header>

<!-- ================= HERO ================= -->
<section class="hero" id="hero">
  <div class="hero-copy">
    <h1><span class="ln"><span>Turn Long Videos Into</span></span><span class="ln"><span>Scroll-Stopping Clips</span></span></h1>
    <div class="cta-row"><a class="btn-violet" href="/video">Upload a Video</a><a class="btn-ghost" href="/product">Try Product Photos</a></div>
  </div>
  <div class="stack">
    <div class="sheet s-yellow"></div>
    <div class="sheet s-pink"></div>
    <div class="sheet s-violet">
      <div class="scene"><svg viewBox="0 0 1440 2700" preserveAspectRatio="xMidYMin slice">
        <!-- top: camera lens + hanging phone playing a clip -->
        <use href="#lensball" x="520" y="250"/>
        <path d="M720 330 Q780 318 850 340" stroke="#d8d0ff" stroke-width="3" fill="none" stroke-linecap="round"/>
        <g transform="translate(900,20)"><g class="swing">
          <line x1="40" y1="-60" x2="40" y2="120" stroke="#c96a6a" stroke-width="1.5"/><line x1="150" y1="-60" x2="150" y2="120" stroke="#c96a6a" stroke-width="1.5"/>
          <g transform="translate(10,110) rotate(8)"><use href="#phone"/></g>
        </g></g>
        <!-- the long video as a filmstrip; scissors cut it -->
        <g transform="translate(60,900) rotate(-10)"><use href="#film"/><g transform="translate(600,0)"><use href="#film"/></g></g>
        <g transform="translate(640,760) rotate(-30)"><g class="bob"><use href="#scissors"/></g></g>
        <line x1="700" y1="700" x2="760" y2="1060" stroke="#fbd431" stroke-width="3" stroke-dasharray="10 8"/>
        <!-- cut clips float up as ranked cards -->
        <g transform="translate(180,1120) rotate(-8)"><g class="bob"><rect width="120" height="200" rx="16" fill="url(#clipg)" filter="url(#grain)"/><circle cx="26" cy="28" r="16" fill="#fbd431"/><text x="26" y="34" font-size="14" font-weight="700" text-anchor="middle" font-family="Archivo">#1</text></g></g>
        <g transform="translate(340,1180) rotate(4)"><g class="bob" style="animation-delay:-1.6s"><rect width="110" height="184" rx="16" fill="url(#clipg2)" filter="url(#grain)"/><circle cx="26" cy="28" r="16" fill="#fff"/><text x="26" y="34" font-size="14" font-weight="700" text-anchor="middle" font-family="Archivo">#2</text></g></g>
        <g transform="translate(480,1150) rotate(12)"><g class="bob" style="animation-delay:-3s"><rect width="100" height="168" rx="16" fill="#fbd431" filter="url(#grain)"/><circle cx="26" cy="28" r="16" fill="#fff"/><text x="26" y="34" font-size="14" font-weight="700" text-anchor="middle" font-family="Archivo">#3</text></g></g>
        <!-- waveform + score gauge -->
        <g transform="translate(820,1200)" fill="#c9bfff"><rect x="0" y="40" width="14" height="40" rx="7"/><rect x="24" y="10" width="14" height="100" rx="7"/><rect x="48" y="30" width="14" height="60" rx="7"/><rect x="72" y="0" width="14" height="120" rx="7" fill="#f05bb5"/><rect x="96" y="20" width="14" height="80" rx="7" fill="#f05bb5"/><rect x="120" y="45" width="14" height="30" rx="7"/><rect x="144" y="15" width="14" height="90" rx="7"/><rect x="168" y="35" width="14" height="50" rx="7"/><rect x="192" y="5" width="14" height="110" rx="7"/><rect x="216" y="40" width="14" height="40" rx="7"/></g>
        <g transform="translate(1180,1460)"><path d="M-110 0 A110 110 0 0 1 110 0" fill="none" stroke="#2b1590" stroke-width="28" stroke-linecap="round"/><path d="M-110 0 A110 110 0 0 1 80 -75" fill="none" stroke="#fbd431" stroke-width="28" stroke-linecap="round"/><text x="0" y="-10" font-size="52" font-weight="300" text-anchor="middle" fill="#fff" font-family="Archivo">0.81</text><text x="0" y="22" font-size="16" text-anchor="middle" fill="#c9bfff" font-family="Archivo">clip score</text></g>
        <!-- carousel + product -->
        <g transform="translate(220,1600) rotate(-6)"><g class="bob" style="animation-delay:-2s"><use href="#slides"/></g></g>
        <g transform="translate(980,1700)"><ellipse cx="80" cy="230" rx="140" ry="24" fill="#2a1280"/><use href="#jar"/></g>
        <circle cx="1290" cy="1720" r="30" fill="#fff4c4" filter="url(#grain)"/><circle cx="1210" cy="1760" r="12" fill="#f7ef2e"/>
        <path d="M60 1980 Q500 2000 900 2300" stroke="#f3ead0" stroke-width="3" fill="none"/>
        <!-- bottom: podcast mic + clapperboard on a stage -->
        <g transform="translate(140,1980) rotate(-10)"><use href="#mic"/></g>
        <g transform="translate(820,2140) rotate(8)"><g class="bob"><use href="#clap"/></g></g>
        <ellipse cx="1150" cy="2480" rx="420" ry="40" fill="none" stroke="#7d6cf0" stroke-width="3"/><ellipse cx="1250" cy="2480" rx="260" ry="26" fill="#2a1280"/>
      </svg></div>
    </div>
  </div>
</section>

<!-- ================= ANALYTICS ================= -->
<section class="analytics" id="features"><div class="wrap">
  <h2 class="h2 reveal"><span class="ln"><span>Every Clip, Scored</span></span><span class="ln"><span>and Explained</span></span></h2>
  <div class="grid2">
    <div class="panel">
      <h3><span id="t0">Topic Detection</span><span id="t1" class="off">Score Breakdown</span><span id="t2" class="off">Retention Curve</span></h3>
      <div class="inbox">
        <div class="tab on" id="tab0">
          <span class="tag" style="left:20%;top:42%;transform:rotate(-4deg);animation-delay:.05s">#Podcast</span>
          <span class="tag" style="left:2%;top:54%;transform:rotate(14deg);animation-delay:.15s">#Funding</span>
          <span class="tag" style="left:56%;top:40%;transform:rotate(-22deg);animation-delay:.1s">#Hooks</span>
          <span class="tag" style="left:66%;top:56%;transform:rotate(38deg);animation-delay:.25s">#Storytelling</span>
          <span class="tag" style="left:30%;top:58%;transform:rotate(6deg);animation-delay:.2s">#Startups</span>
          <span class="tag" style="left:54%;top:66%;transform:rotate(18deg);animation-delay:.3s">#AI</span>
          <span class="tag" style="left:0%;top:76%;transform:rotate(-50deg);animation-delay:.35s">#Lecture</span>
          <span class="tag" style="left:18%;top:78%;transform:rotate(-34deg);animation-delay:.4s">#Vlog</span>
          <span class="tag" style="left:38%;top:72%;transform:rotate(-6deg);animation-delay:.45s">#Interview</span>
          <span class="tag" style="left:44%;top:86%;transform:rotate(-3deg);animation-delay:.5s">#Gaming</span>
          <span class="tag" style="left:70%;top:80%;transform:rotate(30deg);animation-delay:.55s">#Pacing</span>
          <span class="tag" style="left:16%;top:90%;transform:rotate(-2deg);animation-delay:.6s">#Emotion</span>
        </div>
        <div class="tab bars" id="tab1">
          <div class="row"><div class="bar" data-w="88%"><b></b><em>88%</em></div>Hook</div>
          <div class="row"><div class="bar" data-w="74%"><b></b><em>74%</em></div>Self-contained</div>
          <div class="row"><div class="bar" data-w="62%"><b></b><em>62%</em></div>Emotional peak</div>
          <div class="row"><div class="bar" data-w="55%"><b></b><em>55%</em></div>Pacing</div>
          <div class="row"><div class="bar" data-w="40%"><b></b><em>40%</em></div>Genre fit</div>
          <div class="row"><div class="bar" data-w="26%"><b></b><em>26%</em></div>Retention risk</div>
        </div>
        <div class="tab" id="tab2">
          <svg viewBox="0 0 300 220" style="width:100%;height:100%"><path id="yline" d="M10 60 C40 10 60 180 90 140 S120 70 140 110 S190 140 220 70 S270 20 300 60" fill="none" stroke="#fbd431" stroke-width="4" stroke-linecap="round"/>
            <line x1="220" y1="70" x2="220" y2="190" stroke="#fbd431" stroke-dasharray="3 4"/><circle cx="220" cy="70" r="6" fill="#fbd431"/>
            <rect x="130" y="58" width="74" height="24" rx="12" fill="#0c0c0c"/><text x="167" y="75" fill="#fff" font-size="12" text-anchor="middle">0:44 min</text>
            <g font-size="10" fill="#999"><text x="20" y="210">0:00</text><text x="80" y="210">0:10</text><text x="140" y="210">0:20</text><text x="200" y="210">0:30</text><text x="260" y="210">0:40</text></g></svg>
        </div>
      </div>
      <div class="progress"><span class="p1"><i></i></span><span class="p2"><i></i></span><span class="p3"><i></i></span></div>
    </div>
    <div class="panel">
      <h3><span>Ranking Performance</span></h3>
      <div class="perf">
        <div style="display:flex;flex-direction:column;gap:10px">
          <div class="stat" style="background:var(--yellow)"><small>Top Clip Score</small><b>+<span class="count" id="c1">32</span>%</b></div>
          <div class="stat" style="background:var(--pink);color:#fff"><small>Clips Found</small><b>+<span class="count" id="c2">49</span>%</b></div>
        </div>
        <div>
          <div class="seg" id="seg"><button>10 min</button><button class="on">30 min</button><button>1 hour</button><button>2 hours</button><button>3 hours</button><button>4 hours</button></div>
          <div class="chart">
            <svg viewBox="0 0 400 240" preserveAspectRatio="none"><defs><linearGradient id="fade" x1="0" x2="1"><stop offset="0" stop-color="#f05bb5" stop-opacity="0"/><stop offset=".3" stop-color="#f05bb5"/></linearGradient></defs>
              <g stroke="#ddd" stroke-dasharray="4 5"><line x1="0" y1="60" x2="400" y2="60"/><line x1="0" y1="120" x2="400" y2="120"/><line x1="0" y1="180" x2="400" y2="180"/></g>
              <polyline id="pline" fill="none" stroke="url(#fade)" stroke-width="4" stroke-linejoin="round" points="0,220 90,110 240,200 400,30"/>
              <line id="v1" stroke="#f05bb5" stroke-dasharray="3 4" x1="90" x2="90" y1="110" y2="240"/><line id="v2" stroke="#f05bb5" stroke-dasharray="3 4" x1="300" x2="300" y1="140" y2="260"/>
              <circle id="d1" cx="90" cy="110" r="6" fill="#f05bb5"/><circle id="d2" cx="300" cy="140" r="6" fill="#f05bb5"/></svg>
            <span class="tip" id="tip1" style="left:22.5%;top:45%">+25%</span><span class="tip" id="tip2" style="left:75%;top:58%">+45%</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</div></section>

<!-- ================= MODULES ================= -->
<section class="modules" id="modules"><div class="wrap" style="position:relative">
  <svg class="envelope" viewBox="0 0 200 170"><g transform="rotate(-12 100 85)"><use href="#clap"/></g></svg>
  <h2 class="bigword"><span>Modules</span><span class="marq"><div>video · product · carousel · video · product · carousel · </div></span></h2>
  <div class="cards3">
    <a class="mcard" href="/video" data-speed="1.1"><p>Cut Long Videos Into<br>Ranked Shorts</p><div class="face" style="background:var(--orange)"><small>Video to Clips</small>
      <svg viewBox="0 0 150 130"><g transform="translate(58,8) rotate(14) scale(.34)"><use href="#phone"/></g></svg>
      <span class="num">01</span><span class="arrow">➝</span></div></a>
    <a class="mcard" href="/product" data-speed="1.5" style="margin-top:-40px"><p>Studio Product Shots<br>From One Photo</p><div class="face" style="background:var(--pink)"><small>Product Photos</small>
      <svg viewBox="0 0 150 130"><g transform="translate(52,14) rotate(10) scale(.5)"><use href="#jar"/></g></svg>
      <span class="num">02</span><span class="arrow">➝</span></div></a>
    <a class="mcard" href="/carousel" data-speed="1.2" style="margin-top:20px"><p>Turn Ideas Into<br>LinkedIn Carousels</p><div class="face" style="background:var(--violet2)"><small>Carousel Builder</small>
      <svg viewBox="0 0 150 130"><g transform="translate(30,6) scale(.5)"><use href="#slides"/></g></svg>
      <span class="num">03</span><span class="arrow">➝</span></div></a>
  </div>
</div></section>

<!-- ================= INSIGHTS + STATS ================= -->
<section class="insights" id="how"><div class="wrap">
  <h2 class="bigtext reveal-scrub">
    <span class="ln"><span>Kairos Reads Every Word and Shot,</span></span>
    <span class="ln"><span>Scores Each Moment <i class="pic"></i> on Hook,</span></span>
    <span class="ln"><span>Pacing and Emotion, Then Ranks</span></span>
    <span class="ln"><span>the Clips <i class="dot2"></i> Worth Posting</span></span>
  </h2>
  <div class="stats">
    <div class="srow"><div class="sart"><svg viewBox="0 0 210 190"><rect width="210" height="190" fill="#4b0fc8"/><g transform="translate(-20,150) rotate(-14) scale(.45)"><use href="#film"/></g><g transform="translate(100,16) rotate(10) scale(.42)"><use href="#phone"/></g></svg></div>
      <div class="bignum">+<span class="count" data-to="12">0</span><span class="stag" style="background:var(--orange)">Clips per Video</span></div>
      <p>Kairos finds the strongest moments in a long video and ranks them, so you start from the best clip, not from the timeline.</p></div>
    <div class="srow"><div class="sart"><svg viewBox="0 0 210 190"><rect width="210" height="190" fill="#7d84e6"/><g transform="translate(60,34) scale(.62)"><use href="#jar"/></g><g fill="#22c55e"><circle cx="30" cy="50" r="9"/><circle cx="30" cy="80" r="9"/><circle cx="30" cy="110" r="9"/><circle cx="30" cy="140" r="9"/></g></svg></div>
      <div class="bignum"><span class="count" data-to="4">0</span>X<span class="stag" style="background:var(--pink)">Fidelity Checks</span></div>
      <p>Every product photo passes four checks — label text, shape, colour and look — before you see it. Failed shots are repaired or regenerated.</p></div>
    <div class="srow"><div class="sart"><svg viewBox="0 0 210 190"><rect width="210" height="190" fill="#3a0ca8"/><g transform="translate(14,60) scale(.55)"><use href="#clap"/></g><circle cx="150" cy="70" r="40" fill="#cfd4ff"/><path d="M150 70 L150 44 M150 70 L170 82" stroke="#3a0ca8" stroke-width="6" stroke-linecap="round"/></svg></div>
      <div class="bignum">+<span class="count" data-to="40">0</span>h<span class="stag" style="background:var(--violet2)">Saved Weekly</span></div>
      <p>Upload once. Clips, captions, product shots and carousels come back ready to post, with the reasons behind every pick.</p></div>
  </div>
</div></section>

<!-- ================= FAQ ================= -->
<section class="faq" id="faq"><div class="wrap">
  <h2 class="h2 reveal"><span class="ln"><span>Frequently Asked</span></span><span class="ln"><span>Questions</span></span></h2>
  <div class="list">
    <details><summary>Which videos work best with Kairos?</summary><p>Podcasts, lectures, interviews, vlogs and gaming videos. Kairos detects the genre and scores clips with weights made for that genre.</p></details>
    <details><summary>How does Kairos decide which clip is the best?</summary><p>A model scores each candidate on hook, self-containment, emotional peak, pacing, retention risk and genre fit. Code combines the scores into one total, so the ranking is repeatable.</p></details>
    <details><summary>Will generated product photos change my product?</summary><p>No. Every image passes label OCR, shape, colour and similarity checks. If a check fails, Kairos pastes your real product back in or regenerates the shot.</p></details>
    <details><summary>Can I turn a video into a LinkedIn carousel?</summary><p>Yes. Pick a finished video job as the source, and Kairos plans the slides from its transcript.</p></details>
  </div>
</div></section>

<!-- ================= CTA + FOOTER ================= -->
<section id="contact"><div class="wrap">
  <div class="cta">
    <div><h2>Turn One Long Video<br>Into a Week of<br>Content.</h2><a class="btn-line" href="/video">Upload a Video</a></div>
    <svg viewBox="0 0 600 560"><circle cx="160" cy="120" r="14" fill="#f7ef2e"/><circle cx="470" cy="110" r="50" fill="#4b0fc8"/>
      <path d="M60 470 C120 300 300 420 380 300 S560 200 600 260" fill="none" stroke="#4b0fc8" stroke-width="10"/>
      <g transform="translate(30,470) rotate(-24)"><use href="#film"/></g>
      <g class="bob"><g transform="translate(250,90) rotate(10)"><use href="#phone"/></g></g>
      <g transform="translate(430,330) rotate(12) scale(.7)"><use href="#jar"/></g>
      <g transform="translate(60,170) rotate(-8) scale(.7)"><use href="#slides"/></g></svg>
  </div>
  <footer><nav><a href="#features">Features</a><a href="#modules">Modules</a><a href="#how">How it works</a><a href="#faq">FAQ</a><a href="#contact">Contact</a></nav>
    <div class="soc" aria-label="Social links">
      <a href="#" aria-label="GitHub"><svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 .5a11.5 11.5 0 0 0-3.6 22.4c.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.4-3.9-1.4-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.4 11.4 0 0 1 6 0C17.5 4 18.5 4.3 18.5 4.3c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.2c0 .3.2.7.8.6A11.5 11.5 0 0 0 12 .5Z"/></svg></a>
      <a href="#" aria-label="X"><svg viewBox="0 0 24 24"><path fill="currentColor" d="M18.2 2h3.4l-7.4 8.5L23 22h-6.8l-5.3-7-6.1 7H1.4l7.9-9L1 2h7l4.8 6.4L18.2 2Zm-1.2 18h1.9L7.1 3.9H5.1L17 20Z"/></svg></a>
      <a href="#" aria-label="Instagram"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg></a>
      <a href="#" aria-label="LinkedIn"><svg viewBox="0 0 24 24"><path fill="currentColor" d="M20.4 2H3.6C2.7 2 2 2.7 2 3.6v16.8c0 .9.7 1.6 1.6 1.6h16.8c.9 0 1.6-.7 1.6-1.6V3.6c0-.9-.7-1.6-1.6-1.6ZM8 19H5V9h3v10ZM6.5 7.7A1.7 1.7 0 1 1 6.5 4.3a1.7 1.7 0 0 1 0 3.4ZM19 19h-3v-4.9c0-1.2 0-2.7-1.6-2.7S12.5 12.7 12.5 14v5h-3V9h2.9v1.4c.4-.8 1.4-1.6 2.9-1.6 3.1 0 3.7 2 3.7 4.7V19Z"/></svg></a>
    </div></footer>
</div></section>

`;
