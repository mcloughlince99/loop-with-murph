import { useState } from "react";

const BAG_STORAGE_KEY = "caddie_bag";
const RIVALRY_KEY = "caddie_rivalry";
const VOICE_OUT_KEY = "caddie_voice_out";

const DEFAULT_BAG = {
  colleen: [
    { club: "Driver", carry: 180 },
    { club: "3-Wood (Reva Rise)", carry: 160 },
    { club: "5-Wood (Reva Rise)", carry: 145 },
    { club: "4-Hybrid", carry: 130 },
    { club: "5-Iron", carry: 118 },
    { club: "6-Iron", carry: 110 },
    { club: "7-Iron", carry: 100 },
    { club: "8-Iron", carry: 90 },
    { club: "9-Iron", carry: 80 },
    { club: "PW", carry: 70 },
    { club: "52°", carry: 58 },
    { club: "56°", carry: 45 },
    { club: "Putter", carry: 0 },
  ],
  dave: [
    { club: "Driver", carry: 230 },
    { club: "3-Wood", carry: 210 },
    { club: "5-Wood", carry: 190 },
    { club: "4-Iron", carry: 175 },
    { club: "5-Iron", carry: 165 },
    { club: "6-Iron", carry: 155 },
    { club: "7-Iron", carry: 145 },
    { club: "8-Iron", carry: 133 },
    { club: "9-Iron", carry: 120 },
    { club: "PW", carry: 108 },
    { club: "52°", carry: 90 },
    { club: "56°", carry: 72 },
    { club: "Putter", carry: 0 },
  ]
};

function getBag() {
  try { return JSON.parse(localStorage.getItem(BAG_STORAGE_KEY)) || DEFAULT_BAG; }
  catch { return DEFAULT_BAG; }
}
function saveBag(d) { try { localStorage.setItem(BAG_STORAGE_KEY, JSON.stringify(d)); } catch {} }
function getRivalry() {
  try { return JSON.parse(localStorage.getItem(RIVALRY_KEY)) || { colleen: 0, dave: 0, rounds: [] }; }
  catch { return { colleen: 0, dave: 0, rounds: [] }; }
}
function saveRivalry(d) { try { localStorage.setItem(RIVALRY_KEY, JSON.stringify(d)); } catch {} }

// ── MURPH'S BRAIN ────────────────────────────────────────────────
function murphRead({ golfer, distance, lie, wind, pinPosition, tendency, preferredShape, bag, golferKey }) {
  const dist = parseInt(distance);
  const clubs = (bag[golferKey] || []).filter(c => c.carry > 0).sort((a, b) => b.carry - a.carry);

  // Wind yardage adjustment
  const windAdj = {
    "None": 0,
    "Into — light": 8, "Into — strong": 18,
    "With — light": -6, "With — strong": -14,
    "Left-to-right": 3, "Right-to-left": 3,
    "Swirling": 5
  }[wind] || 0;

  // Lie adjustment
  const lieAdj = {
    "Fairway": 0, "Light rough": 5, "Thick rough": 12,
    "Fairway bunker": 10, "Greenside bunker": 0,
    "Tight lie / hardpan": 3, "Uphill": -8, "Downhill": 8,
    "Sidehill — ball above feet": 5, "Sidehill — ball below feet": 5
  }[lie] || 0;

  const playDist = dist + windAdj + lieAdj;

  // ── FIXED club selection: single pass, clean logic
  // Sort descending by carry. Find the shortest club that still reaches playDist.
  // If nothing reaches, give them the longest club in the bag.
  const reachable = clubs.filter(c => c.carry >= playDist);
  let rec, between = false;

  if (reachable.length === 0) {
    // Over every club — give the longest
    rec = clubs[0];
  } else {
    // Take the shortest club that still covers it (last in reachable, since sorted desc)
    const shortest = reachable[reachable.length - 1];
    // Check if a longer club is within 8y — if so, they're between clubs
    const nextLonger = clubs[clubs.indexOf(shortest) - 1];
    if (nextLonger && (nextLonger.carry - playDist) <= 8 && (shortest.carry - playDist) <= 6) {
      between = true;
      rec = nextLonger; // Take the longer club and take something off
    } else {
      rec = shortest;
    }
  }

  const clubName = rec.club;
  const carryDiff = rec.carry - playDist;

  // ── Club note
  let clubNote = "";
  if (between) {
    clubNote = `you're between clubs — I'm giving you the ${clubName}, take a little off it`;
  } else if (carryDiff > 10) {
    clubNote = `that's a comfortable ${clubName} — you've got room to make a smooth swing`;
  } else {
    clubNote = `right at the ${clubName} — full commitment, no steering`;
  }

  // ── Wind line
  const windLines = {
    "None": "",
    "Into — light": "slight breeze into you — take one more and swing easy",
    "Into — strong": "wind's in your face — that's why I added yardage, trust the club",
    "With — light": "little wind helping — don't go chasing distance, just hit it solid",
    "With — strong": "good wind at your back — I've already taken off yardage",
    "Left-to-right": "wind's pushing left to right — aim a touch left and let it work",
    "Right-to-left": "right-to-left wind — start it right of target",
    "Swirling": "wind's swirling, don't trust it — pick a line and commit"
  };
  const windLine = windLines[wind] || "";

  // ── Lie advice
  const lieLines = {
    "Fairway": "clean lie, no excuses",
    "Light rough": "light rough — ball might come out a little hot, plan for it",
    "Thick rough": "flier lie — it'll come out with less spin, aim short of the pin",
    "Fairway bunker": "fairway bunker — take one more club, pick it clean, don't try to be a hero",
    "Greenside bunker": "splash it out — open the face, hit the sand not the ball",
    "Tight lie / hardpan": "tight lie — you need a descending blow, don't try to help it up",
    "Uphill": "uphill adds loft — I've accounted for it",
    "Downhill": "downhill takes loft away — stay with the club I gave you",
    "Sidehill — ball above feet": "ball above your feet wants to go left — aim right of target",
    "Sidehill — ball below feet": "ball below your feet — bend those knees, hold on to it"
  };
  const lieLine = lieLines[lie] || "";

  // ── Pin position — now driven by exact dropdown value
  const pinLines = {
    "Middle": "middle pin — aim for the center, give yourself a putt",
    "Front / short": "pin's up front — land it on the front edge, you don't need to be cute",
    "Back / deep": "pin's back — don't short-side yourself chasing it, land it middle and let it release",
    "Left": "pin left means trouble left — aim at the middle of the green, let the shot work toward it",
    "Right": "pin right — play to the fat part of the green, don't get sucked into chasing it right",
    "Tucked left": "tucked left pin — do not go at it, aim for the fat of the green and make your par putt",
    "Tucked right": "tucked right pin — same answer, fat of the green, don't be a hero"
  };
  const aimLine = pinLines[pinPosition] || "aim for the center of the green";

  // ── Tendency — now driven by exact dropdown value
  const tendencyLines = {
    "None": "",
    "Pull left": "you pull under pressure — feel like you're aiming a hair right and make a full finish",
    "Push right": "you push it — stay through the ball and keep that face square",
    "Hook": "you're hooking it — weaken that grip a touch and keep the face open through impact",
    "Slice": "you're slicing — check that grip, strengthen it, and feel like you're swinging out to right field",
    "Fat / chunk": "stop thinking about the fat shot or you'll hit it — just pick a target and go",
    "Thin / skull": "keep your head down through impact — you're not watching it land until after you've hit it",
    "Always come up short": "you always come up short under pressure — commit to the full swing",
    "Flip at impact": "don't flip at it — lead with the handle, hands ahead at impact, trust the loft"
  };
  const tendencyLine = tendencyLines[tendency] || "";

  // ── Shot shape line
  const shapeLines = {
    "Straight": "play it straight",
    "Draw": "start it a touch right and let it draw back",
    "Fade": "open the face slightly, aim left, let it fade to the target",
    "Punch/knockdown": "punch it — choke down, half swing, keep it under the wind",
    "High soft landing": "high shot — let it land soft, make sure you've got enough club",
    "Bump and run": "bump and run — land it short and let it chase up, less risk"
  };
  const shapeLine = shapeLines[preferredShape] || "play it straight";

  // ── Swing thought — deterministic but varied across more inputs
  const swingThoughts = [
    "one thought: finish the swing",
    "just pick a spot and trust it",
    "slow back, through the ball",
    "don't steer it — swing through, not at",
    "tempo. that's all. tempo.",
    "you know how to hit this shot. get out of your own way.",
    "breathe out before you take it back",
    "eyes on the back of the ball, nowhere else"
  ];
  const swingThought = swingThoughts[(dist + lie.length + wind.length) % swingThoughts.length];

  // ── Murph openers by golfer
  const openers = golfer === "Colleen"
    ? ["Alright Colleen,", "Here's what I see, Colleen —", "Listen,", "Colleen —", "Okay kid —"]
    : golfer === "Dave"
    ? ["Alright Dave,", "Dave —", "Here's the read —", "Listen up —", "Okay —"]
    : ["Alright kid,", "Here's what I see —", "Listen,", "Okay —"];
  const opener = openers[dist % openers.length];

  // ── Assemble Murph's read
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const parts = [
    `${opener} ${clubNote}.`,
    windLine ? `${cap(windLine)}.` : "",
    `${cap(lieLine)}.`,
    `${cap(aimLine)}.`,
    `${cap(shapeLine)}.`,
    tendencyLine ? `${cap(tendencyLine)}.` : "",
    `And ${swingThought}.`
  ].filter(Boolean);

  return { club: clubName, carry: rec.carry, playDist, read: parts.join(" ") };
}

const windOptions = ["None", "Into — light", "Into — strong", "With — light", "With — strong", "Left-to-right", "Right-to-left", "Swirling"];
const lieOptions = ["Fairway", "Light rough", "Thick rough", "Fairway bunker", "Greenside bunker", "Tight lie / hardpan", "Uphill", "Downhill", "Sidehill — ball above feet", "Sidehill — ball below feet"];
const shotShapeOptions = ["Straight", "Draw", "Fade", "Punch/knockdown", "High soft landing", "Bump and run"];
const pinOptions = ["Middle", "Front / short", "Back / deep", "Left", "Right", "Tucked left", "Tucked right"];
const tendencyOptions = ["None", "Pull left", "Push right", "Hook", "Slice", "Fat / chunk", "Thin / skull", "Always come up short", "Flip at impact"];

// ── VOICE PARSING ────────────────────────────────────────────────
function parseVoiceInput(transcript) {
  const t = transcript.toLowerCase();
  const result = {};

  // Distance — pull first number mentioned
  const distMatch = t.match(/\b(\d{2,3})\b/);
  if (distMatch) result.distance = distMatch[1];

  // Wind
  if (/into.*(strong|hard)|strong.*into|head.*(strong|hard)/.test(t)) result.wind = "Into — strong";
  else if (/into|headwind|against|in my face/.test(t)) result.wind = "Into — light";
  else if (/with.*(strong|hard)|strong.*tail|strong.*down/.test(t)) result.wind = "With — strong";
  else if (/with|tailwind|helping|behind/.test(t)) result.wind = "With — light";
  else if (/left.*(to|2).right|left to right/.test(t)) result.wind = "Left-to-right";
  else if (/right.*(to|2).left|right to left/.test(t)) result.wind = "Right-to-left";
  else if (/swirl|gusty|all over/.test(t)) result.wind = "Swirling";
  else if (/no wind|calm|still/.test(t)) result.wind = "None";

  // Lie
  if (/thick rough|deep rough|buried/.test(t)) result.lie = "Thick rough";
  else if (/light rough|little rough|rough/.test(t)) result.lie = "Light rough";
  else if (/fairway bunker|bunker.*fairway/.test(t)) result.lie = "Fairway bunker";
  else if (/greenside bunker|bunker|sand/.test(t)) result.lie = "Greenside bunker";
  else if (/tight|hardpan|bare/.test(t)) result.lie = "Tight lie / hardpan";
  else if (/uphill|up the hill|going up/.test(t)) result.lie = "Uphill";
  else if (/downhill|down the hill|going down/.test(t)) result.lie = "Downhill";
  else if (/ball above|above my feet/.test(t)) result.lie = "Sidehill — ball above feet";
  else if (/ball below|below my feet/.test(t)) result.lie = "Sidehill — ball below feet";
  else if (/fairway|clean lie/.test(t)) result.lie = "Fairway";

  // Pin position
  if (/tuck.*left|left.*tuck/.test(t)) result.pin = "Tucked left";
  else if (/tuck.*right|right.*tuck/.test(t)) result.pin = "Tucked right";
  else if (/tuck/.test(t)) result.pin = "Tucked left"; // fallback
  else if (/back|deep|long/.test(t)) result.pin = "Back / deep";
  else if (/front|short|up front/.test(t)) result.pin = "Front / short";
  else if (/pin.*left|left.*pin|flag.*left/.test(t)) result.pin = "Left";
  else if (/pin.*right|right.*pin|flag.*right/.test(t)) result.pin = "Right";
  else if (/middle|center/.test(t)) result.pin = "Middle";

  // Tendency
  if (/flip/.test(t)) result.tendency = "Flip at impact";
  else if (/slice|block.*(right|fade)/.test(t)) result.tendency = "Slice";
  else if (/hook|snap|duck/.test(t)) result.tendency = "Hook";
  else if (/pull|yank|left/.test(t)) result.tendency = "Pull left";
  else if (/push|right/.test(t)) result.tendency = "Push right";
  else if (/fat|chunk|heavy/.test(t)) result.tendency = "Fat / chunk";
  else if (/thin|skull|blade/.test(t)) result.tendency = "Thin / skull";
  else if (/short|come up short/.test(t)) result.tendency = "Always come up short";

  // Shot shape
  if (/punch|knockdown|knock down|stinger/.test(t)) result.shape = "Punch/knockdown";
  else if (/bump.*(run|roll)|run.*up/.test(t)) result.shape = "Bump and run";
  else if (/high|soft landing/.test(t)) result.shape = "High soft landing";
  else if (/draw/.test(t)) result.shape = "Draw";
  else if (/fade|cut/.test(t)) result.shape = "Fade";
  else if (/straight/.test(t)) result.shape = "Straight";

  return result;
}

export default function CaddieBrain() {
  const [golfer, setGolfer] = useState("Colleen");
  const [distance, setDistance] = useState("");
  const [lie, setLie] = useState("Fairway");
  const [wind, setWind] = useState("None");
  const [pinPosition, setPinPosition] = useState("Middle");
  const [tendency, setTendency] = useState("None");
  const [preferredShape, setPreferredShape] = useState("Straight");
  const [result, setResult] = useState(null);
  const [rivalry, setRivalry] = useState(getRivalry());
  const [bag, setBag] = useState(getBag());
  const [activeTab, setActiveTab] = useState("shot");
  const [scoreInput, setScoreInput] = useState({ colleen: "", dave: "", holes: "18" });
  const [bagEdit, setBagEdit] = useState({ colleen: JSON.parse(JSON.stringify(getBag().colleen)), dave: JSON.parse(JSON.stringify(getBag().dave)) });
  const [bagGolfer, setBagGolfer] = useState("colleen");
  const [bagSaved, setBagSaved] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("");
  const [voiceOut, setVoiceOut] = useState(() => {
    try { return localStorage.getItem(VOICE_OUT_KEY) === "true"; } catch { return false; }
  });
  const [irishBannerDismissed, setIrishBannerDismissed] = useState(() => {
    try { return localStorage.getItem("caddie_irish_banner") === "true"; } catch { return false; }
  });

  function dismissIrishBanner() {
    setIrishBannerDismissed(true);
    try { localStorage.setItem("caddie_irish_banner", "true"); } catch {}
  }

  const golferKey = golfer === "Colleen" ? "colleen" : golfer === "Dave" ? "dave" : "colleen";

  function startListening() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setVoiceStatus("Voice not supported in this browser."); return; }
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    setListening(true);
    setVoiceStatus("Listening…");
    rec.start();
    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      const parsed = parseVoiceInput(transcript);
      if (parsed.distance) setDistance(parsed.distance);
      if (parsed.wind) setWind(parsed.wind);
      if (parsed.lie) setLie(parsed.lie);
      if (parsed.pin) setPinPosition(parsed.pin);
      if (parsed.tendency) setTendency(parsed.tendency);
      if (parsed.shape) setPreferredShape(parsed.shape);
      setResult(null);
      const filled = Object.keys(parsed);
      setVoiceStatus(`Got it — ${filled.length} field${filled.length !== 1 ? "s" : ""} filled. Review and adjust, then Ask Murph.`);
      setListening(false);
    };
    rec.onerror = (e) => {
      setVoiceStatus(e.error === "not-allowed" ? "Mic access denied — check Safari settings." : "Didn't catch that. Try again.");
      setListening(false);
    };
    rec.onend = () => setListening(false);
  }

  function toggleVoiceOut() {
    const next = !voiceOut;
    setVoiceOut(next);
    try { localStorage.setItem(VOICE_OUT_KEY, String(next)); } catch {}
    if (!next) window.speechSynthesis?.cancel();
  }

  function murphSpeak(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 1.15;
    utt.pitch = 0.9;
    utt.volume = 1;
    const voices = window.speechSynthesis.getVoices();
    // Priority: Irish voice → en-IE → any male English
    const preferred =
      voices.find(v => /moira|aaron|daniel.*irish|irish/i.test(v.name)) ||
      voices.find(v => v.lang === "en-IE") ||
      voices.find(v => /^en/.test(v.lang) && /daniel|gordon|arthur|lee|oliver|fred|bruce/i.test(v.name)) ||
      voices.find(v => v.lang === "en-GB") ||
      null;
    if (preferred) utt.voice = preferred;
    window.speechSynthesis.speak(utt);
  }

  function getAdvice() {
    if (!distance) return;
    const r = murphRead({ golfer, distance, lie, wind, pinPosition, tendency, preferredShape, bag, golferKey });
    setResult(r);
    if (voiceOut) murphSpeak(r.read);
  }

  function logScore() {
    const c = parseInt(scoreInput.colleen);
    const d = parseInt(scoreInput.dave);
    if (isNaN(c) || isNaN(d)) return;
    const updated = { ...rivalry };
    if (c < d) updated.colleen += 1;
    else if (d < c) updated.dave += 1;
    updated.rounds = [...(updated.rounds || []), {
      date: new Date().toLocaleDateString(),
      colleen: c, dave: d, holes: scoreInput.holes,
      winner: c < d ? "Colleen" : d < c ? "Dave" : "Tie"
    }];
    saveRivalry(updated);
    setRivalry(updated);
    setScoreInput({ colleen: "", dave: "", holes: "18" });
  }

  function saveBagEdits() {
    const updated = { colleen: bagEdit.colleen, dave: bagEdit.dave };
    saveBag(updated);
    setBag(updated);
    setBagSaved(true);
    setTimeout(() => setBagSaved(false), 2000);
  }

  function addClub(who) {
    setBagEdit(prev => ({ ...prev, [who]: [...prev[who], { club: "", carry: "" }] }));
  }
  function removeClub(who, idx) {
    setBagEdit(prev => ({ ...prev, [who]: prev[who].filter((_, i) => i !== idx) }));
  }
  function updateClub(who, idx, field, val) {
    setBagEdit(prev => {
      const updated = prev[who].map((c, i) => i === idx ? { ...c, [field]: val } : c);
      return { ...prev, [who]: updated };
    });
  }

  const totalRounds = rivalry.rounds?.length || 0;
  const colleenWinPct = totalRounds ? Math.round((rivalry.colleen / totalRounds) * 100) : 0;
  const daveWinPct = totalRounds ? Math.round((rivalry.dave / totalRounds) * 100) : 0;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0d1a0f",
      backgroundImage: "radial-gradient(ellipse at 20% 50%, #1a2e1a 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, #0f2416 0%, transparent 50%)",
      fontFamily: "'Georgia', serif", color: "#e8dcc8", padding: 0, position: "relative", overflow: "hidden"
    }}>
      <div style={{ position: "fixed", inset: 0, opacity: 0.04, backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")", pointerEvents: "none", zIndex: 0 }} />

      {/* Header */}
      <div style={{ borderBottom: "1px solid #2d4a2d", padding: "20px 32px", display: "flex", alignItems: "center", gap: "16px", background: "rgba(0,0,0,0.3)", position: "relative", zIndex: 1 }}>
        <div style={{ fontSize: "30px" }}>🏌️</div>
        <div>
          <div style={{ fontSize: "24px", fontWeight: "bold", color: "#c8a84b", textTransform: "uppercase", letterSpacing: "0.02em" }}>Loop with Murph</div>
          <div style={{ fontSize: "11px", color: "#7a9a7a", letterSpacing: "0.12em", textTransform: "uppercase" }}>Murph · 60 Years on the Bag</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
          {["shot", "bag", "rivalry"].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: "7px 14px", border: "1px solid",
              borderColor: activeTab === tab ? "#c8a84b" : "#2d4a2d",
              background: activeTab === tab ? "rgba(200,168,75,0.15)" : "transparent",
              color: activeTab === tab ? "#c8a84b" : "#7a9a7a",
              borderRadius: "4px", cursor: "pointer", fontSize: "12px",
              letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "Georgia, serif"
            }}>{tab === "shot" ? "Get a Read" : tab === "bag" ? "The Bag" : "Rivalry"}</button>
          ))}
        </div>
      </div>

      {/* Irish Voice Banner — shows once, only when voice is on or not yet dismissed */}
      {!irishBannerDismissed && (
        <div style={{
          background: "rgba(200,168,75,0.08)", borderBottom: "1px solid #3a3010",
          padding: "10px 24px", display: "flex", alignItems: "center", gap: "12px",
          position: "relative", zIndex: 1, flexWrap: "wrap"
        }}>
          <span style={{ fontSize: "16px" }}>🍀</span>
          <span style={{ fontSize: "13px", color: "#c8a84b", flex: 1 }}>
            <strong>Get Murph's real Irish accent</strong> — install the Irish voice on your device.
          </span>
          <a
            href="https://support.apple.com/en-us/111900"
            target="_blank"
            rel="noreferrer"
            style={{
              fontSize: "12px", color: "#0d1a0f", background: "#c8a84b",
              padding: "5px 14px", borderRadius: "4px", textDecoration: "none",
              fontFamily: "Georgia, serif", whiteSpace: "nowrap", fontWeight: "bold"
            }}
          >
            iPhone instructions ↗
          </a>
          <span style={{ fontSize: "11px", color: "#7a9a7a", maxWidth: "260px", lineHeight: 1.5 }}>
            Settings → Accessibility → Spoken Content → Voices → English → Irish (Ireland) → Download
          </span>
          <button onClick={dismissIrishBanner} style={{
            background: "transparent", border: "none", color: "#4a6a4a",
            cursor: "pointer", fontSize: "18px", lineHeight: 1, padding: "0 4px"
          }}>×</button>
        </div>
      )}

      <div style={{ maxWidth: "880px", margin: "0 auto", padding: "36px 24px", position: "relative", zIndex: 1 }}>

        {/* ── SHOT TAB ── */}
        {activeTab === "shot" && (
          <div>
            <div style={{ display: "flex", gap: "10px", marginBottom: "24px" }}>
              {["Colleen", "Dave"].map(name => (
                <button key={name} onClick={() => { setGolfer(name); setResult(null); }} style={{
                  padding: "10px 28px", border: "1px solid",
                  borderColor: golfer === name ? "#c8a84b" : "#2d4a2d",
                  background: golfer === name ? "rgba(200,168,75,0.12)" : "rgba(0,0,0,0.2)",
                  color: golfer === name ? "#c8a84b" : "#7a9a7a",
                  borderRadius: "4px", cursor: "pointer", fontSize: "15px", fontFamily: "Georgia, serif"
                }}>{name}</button>
              ))}
            </div>

            {/* Bag strip */}
            {bag[golferKey]?.filter(c => c.carry > 0).length > 0 && (
              <div style={{ marginBottom: "18px", padding: "10px 14px", background: "rgba(0,0,0,0.3)", border: "1px solid #1d3a1d", borderRadius: "4px", display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
                <span style={{ fontSize: "10px", color: "#4a6a4a", letterSpacing: "0.12em", textTransform: "uppercase" }}>Bag</span>
                {bag[golferKey].filter(c => c.carry > 0).map((c, i) => (
                  <span key={i} style={{ fontSize: "12px", color: "#7a9a7a" }}>
                    <span style={{ color: "#c8a84b" }}>{c.club}</span> {c.carry}y
                  </span>
                ))}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
              <Field label="Distance to Pin (yards)">
                <input type="number" value={distance} onChange={e => { setDistance(e.target.value); setResult(null); }}
                  placeholder="e.g. 145" style={inputStyle} />
              </Field>
              <Field label="Lie">
                <select value={lie} onChange={e => { setLie(e.target.value); setResult(null); }} style={inputStyle}>
                  {lieOptions.map(o => <option key={o}>{o}</option>)}
                </select>
              </Field>
              <Field label="Wind">
                <select value={wind} onChange={e => { setWind(e.target.value); setResult(null); }} style={inputStyle}>
                  {windOptions.map(o => <option key={o}>{o}</option>)}
                </select>
              </Field>
              <Field label="Pin Position">
                <select value={pinPosition} onChange={e => { setPinPosition(e.target.value); setResult(null); }} style={inputStyle}>
                  {pinOptions.map(o => <option key={o}>{o}</option>)}
                </select>
              </Field>
              <Field label="Your Tendency / Miss">
                <select value={tendency} onChange={e => { setTendency(e.target.value); setResult(null); }} style={inputStyle}>
                  {tendencyOptions.map(o => <option key={o}>{o}</option>)}
                </select>
              </Field>
              <Field label="Preferred Shape">
                <select value={preferredShape} onChange={e => { setPreferredShape(e.target.value); setResult(null); }} style={inputStyle}>
                  {shotShapeOptions.map(o => <option key={o}>{o}</option>)}
                </select>
              </Field>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={getAdvice} disabled={!distance} style={{
                flex: 1, padding: "15px",
                background: !distance ? "#1a2e1a" : "linear-gradient(135deg, #c8a84b, #a8882b)",
                border: "none", borderRadius: "6px",
                color: !distance ? "#4a6a4a" : "#0d1a0f",
                fontSize: "16px", fontWeight: "bold", cursor: !distance ? "not-allowed" : "pointer",
                letterSpacing: "0.05em", textTransform: "uppercase", fontFamily: "Georgia, serif", transition: "all 0.2s"
              }}>Ask Murph</button>
              <button onClick={startListening} disabled={listening} title="Describe your shot by voice" style={{
                padding: "15px 18px", border: "1px solid",
                borderColor: listening ? "#c8a84b" : "#2d4a2d",
                background: listening ? "rgba(200,168,75,0.15)" : "rgba(0,0,0,0.3)",
                borderRadius: "6px", cursor: listening ? "default" : "pointer",
                fontSize: "22px", lineHeight: 1, transition: "all 0.2s",
                animation: listening ? "pulse 1s ease-in-out infinite" : "none"
              }}>{listening ? "🎙️" : "🎤"}</button>
              <button
                onClick={toggleVoiceOut}
                title={voiceOut ? "Murph reads aloud — click to mute" : "Click to have Murph read aloud"}
                style={{
                  padding: "15px 18px", border: "1px solid",
                  borderColor: voiceOut ? "#c8a84b" : "#2d4a2d",
                  background: voiceOut ? "rgba(200,168,75,0.15)" : "rgba(0,0,0,0.3)",
                  borderRadius: "6px", cursor: "pointer",
                  fontSize: "22px", lineHeight: 1, transition: "all 0.2s",
                  position: "relative"
                }}
              >
                {voiceOut ? "🔊" : "🔇"}
              </button>
            </div>
            {voiceStatus && (
              <div style={{ marginTop: "8px", fontSize: "12px", color: listening ? "#c8a84b" : "#7a9a7a", letterSpacing: "0.04em", textAlign: "center" }}>
                {voiceStatus}
              </div>
            )}
            {!voiceStatus && (
              <div style={{ marginTop: "8px", fontSize: "11px", color: "#4a6a4a", letterSpacing: "0.04em", textAlign: "right" }}>
                {voiceOut ? "🔊 Murph will read it aloud" : "🔇 Voice off"}
              </div>
            )}
            <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>

            {result && (
              <div style={{ marginTop: "24px" }}>
                <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
                  <div style={{ padding: "8px 18px", background: "rgba(200,168,75,0.15)", border: "1px solid #c8a84b", borderRadius: "4px", fontSize: "14px", color: "#c8a84b", fontWeight: "bold" }}>
                    🏌️ {result.club}
                  </div>
                  <div style={{ padding: "8px 18px", background: "rgba(0,0,0,0.3)", border: "1px solid #2d4a2d", borderRadius: "4px", fontSize: "13px", color: "#7a9a7a" }}>
                    Plays {result.playDist}y · Carry {result.carry}y
                  </div>
                </div>
                <div style={{ padding: "24px 28px", background: "rgba(0,0,0,0.4)", border: "1px solid #2d4a2d", borderLeft: "4px solid #c8a84b", borderRadius: "6px", position: "relative" }}>
                  <div style={{ position: "absolute", top: "-11px", left: "20px", background: "#0d1a0f", padding: "0 10px", fontSize: "10px", color: "#c8a84b", letterSpacing: "0.15em", textTransform: "uppercase" }}>Murph's Read</div>
                  <div style={{ fontSize: "16px", lineHeight: "1.8", fontStyle: "italic" }}>"{result.read}"</div>
                  {voiceOut && (
                    <button onClick={() => murphSpeak(result.read)} style={{
                      marginTop: "14px", padding: "6px 16px",
                      background: "transparent", border: "1px solid #2d4a2d",
                      borderRadius: "4px", color: "#7a9a7a", cursor: "pointer",
                      fontSize: "12px", fontFamily: "Georgia, serif", letterSpacing: "0.06em"
                    }}>▶ Replay</button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── BAG TAB ── */}
        {activeTab === "bag" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "22px" }}>
              <div style={{ fontSize: "20px", color: "#c8a84b", fontWeight: "bold" }}>🎒 Club Bags</div>
              <button onClick={saveBagEdits} style={{
                padding: "9px 22px",
                background: bagSaved ? "rgba(100,180,100,0.2)" : "rgba(200,168,75,0.2)",
                border: `1px solid ${bagSaved ? "#7ab87a" : "#c8a84b"}`,
                borderRadius: "4px", color: bagSaved ? "#7ab87a" : "#c8a84b",
                cursor: "pointer", fontSize: "13px", fontFamily: "Georgia, serif"
              }}>{bagSaved ? "✓ Saved" : "Save Bags"}</button>
            </div>

            <div style={{ display: "flex", gap: "10px", marginBottom: "22px" }}>
              {["colleen", "dave"].map(who => (
                <button key={who} onClick={() => setBagGolfer(who)} style={{
                  padding: "8px 22px", border: "1px solid",
                  borderColor: bagGolfer === who ? "#c8a84b" : "#2d4a2d",
                  background: bagGolfer === who ? "rgba(200,168,75,0.12)" : "transparent",
                  color: bagGolfer === who ? "#c8a84b" : "#7a9a7a",
                  borderRadius: "4px", cursor: "pointer", fontSize: "14px", fontFamily: "Georgia, serif", textTransform: "capitalize"
                }}>{who}</button>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 40px", gap: "10px", marginBottom: "6px" }}>
              <div style={{ fontSize: "10px", color: "#4a6a4a", letterSpacing: "0.12em", textTransform: "uppercase" }}>Club</div>
              <div style={{ fontSize: "10px", color: "#4a6a4a", letterSpacing: "0.12em", textTransform: "uppercase" }}>Carry (yds)</div>
              <div />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "14px" }}>
              {bagEdit[bagGolfer].map((club, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 120px 40px", gap: "10px", alignItems: "center" }}>
                  <input value={club.club} onChange={e => updateClub(bagGolfer, i, "club", e.target.value)} placeholder="Club name" style={inputStyle} />
                  <input type="number" value={club.carry} onChange={e => updateClub(bagGolfer, i, "carry", e.target.value)} placeholder="yds" style={inputStyle} />
                  <button onClick={() => removeClub(bagGolfer, i)} style={{ background: "transparent", border: "1px solid #3a1a1a", color: "#7a4a4a", borderRadius: "4px", cursor: "pointer", fontSize: "16px", padding: "8px", lineHeight: 1 }}>×</button>
                </div>
              ))}
            </div>

            <button onClick={() => addClub(bagGolfer)} style={{ padding: "9px 20px", background: "transparent", border: "1px dashed #2d4a2d", borderRadius: "4px", color: "#4a6a4a", cursor: "pointer", fontSize: "13px", fontFamily: "Georgia, serif", width: "100%" }}>+ Add Club</button>
            <div style={{ marginTop: "14px", padding: "12px 14px", background: "rgba(200,168,75,0.05)", border: "1px solid #2d3a1a", borderRadius: "4px", fontSize: "12px", color: "#7a8a5a" }}>
              Murph reads these carry distances when picking your club. Set carry to 0 for putter. Colleen's Reva Rise fairway woods are pre-loaded.
            </div>
          </div>
        )}

        {/* ── RIVALRY TAB ── */}
        {activeTab === "rivalry" && (
          <div>
            <div style={{ fontSize: "20px", color: "#c8a84b", marginBottom: "22px", fontWeight: "bold" }}>⚔️ The Eternal Rivalry</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", marginBottom: "32px", border: "1px solid #2d4a2d", borderRadius: "8px", overflow: "hidden" }}>
              <ScorePanel name="Colleen" wins={rivalry.colleen} pct={colleenWinPct} color="#c8a84b" />
              <div style={{ background: "#0a120b", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px 14px", gap: "6px" }}>
                <div style={{ fontSize: "10px", color: "#4a6a4a", letterSpacing: "0.15em", textTransform: "uppercase" }}>Rounds</div>
                <div style={{ fontSize: "28px", fontWeight: "bold", color: "#e8dcc8" }}>{totalRounds}</div>
              </div>
              <ScorePanel name="Dave" wins={rivalry.dave} pct={daveWinPct} color="#7ab87a" right />
            </div>

            <div style={{ background: "rgba(0,0,0,0.3)", border: "1px solid #2d4a2d", borderRadius: "6px", padding: "20px", marginBottom: "24px" }}>
              <div style={{ fontSize: "11px", color: "#c8a84b", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "14px" }}>Log a Round</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: "12px", alignItems: "end" }}>
                <Field label="Colleen's Score">
                  <input type="number" value={scoreInput.colleen} onChange={e => setScoreInput(s => ({...s, colleen: e.target.value}))} placeholder="e.g. 82" style={inputStyle} />
                </Field>
                <Field label="Dave's Score">
                  <input type="number" value={scoreInput.dave} onChange={e => setScoreInput(s => ({...s, dave: e.target.value}))} placeholder="e.g. 87" style={inputStyle} />
                </Field>
                <Field label="Holes">
                  <select value={scoreInput.holes} onChange={e => setScoreInput(s => ({...s, holes: e.target.value}))} style={inputStyle}>
                    <option>9</option><option>18</option>
                  </select>
                </Field>
                <button onClick={logScore} style={{ padding: "10px 16px", background: "rgba(200,168,75,0.2)", border: "1px solid #c8a84b", borderRadius: "4px", color: "#c8a84b", cursor: "pointer", fontSize: "13px", fontFamily: "Georgia, serif", whiteSpace: "nowrap" }}>Log It</button>
              </div>
            </div>

            {rivalry.rounds?.length > 0 && (
              <div>
                <div style={{ fontSize: "11px", color: "#4a6a4a", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "10px" }}>History</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                  {[...rivalry.rounds].reverse().map((r, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "rgba(0,0,0,0.25)", border: "1px solid #1d3a1d", borderRadius: "4px", fontSize: "13px" }}>
                      <span style={{ color: "#7a9a7a" }}>{r.date} · {r.holes}h</span>
                      <span>Colleen <strong style={{ color: "#c8a84b" }}>{r.colleen}</strong> · Dave <strong style={{ color: "#7ab87a" }}>{r.dave}</strong></span>
                      <span style={{ color: r.winner === "Colleen" ? "#c8a84b" : r.winner === "Dave" ? "#7ab87a" : "#7a9a7a", fontWeight: "bold" }}>
                        {r.winner === "Tie" ? "—" : `${r.winner} wins`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: "10px", color: "#7a9a7a", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "7px" }}>{label}</div>
      {children}
    </div>
  );
}

function ScorePanel({ name, wins, pct, color, right }) {
  return (
    <div style={{ background: "rgba(0,0,0,0.3)", padding: "24px 20px", textAlign: right ? "right" : "left", display: "flex", flexDirection: "column", gap: "5px" }}>
      <div style={{ fontSize: "11px", color: "#7a9a7a", letterSpacing: "0.1em", textTransform: "uppercase" }}>{name}</div>
      <div style={{ fontSize: "44px", fontWeight: "bold", color, lineHeight: 1 }}>{wins}</div>
      <div style={{ fontSize: "12px", color: "#4a6a4a" }}>{pct}% win rate</div>
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "9px 11px",
  background: "rgba(0,0,0,0.4)", border: "1px solid #2d4a2d",
  borderRadius: "4px", color: "#e8dcc8", fontSize: "14px",
  fontFamily: "Georgia, serif", outline: "none", boxSizing: "border-box"
};
