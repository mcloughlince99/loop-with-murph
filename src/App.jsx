import { useState } from "react";

const BAG_STORAGE_KEY = "caddie_bag_v2";
const RIVALRY_KEY = "caddie_rivalry_v2";

const DEFAULT_PLAYERS = ["Colleen", "Dave"];
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

function nameToKey(name) { return name.toLowerCase().replace(/\s+/g, "_"); }

function getBagData() {
  try {
    const d = JSON.parse(localStorage.getItem(BAG_STORAGE_KEY));
    return d || { players: DEFAULT_PLAYERS, bags: DEFAULT_BAG };
  } catch { return { players: DEFAULT_PLAYERS, bags: DEFAULT_BAG }; }
}
function saveBagData(d) { try { localStorage.setItem(BAG_STORAGE_KEY, JSON.stringify(d)); } catch {} }

function getRivalry() {
  try { return JSON.parse(localStorage.getItem(RIVALRY_KEY)) || { wins: {}, rounds: [] }; }
  catch { return { wins: {}, rounds: [] }; }
}
function saveRivalry(d) { try { localStorage.setItem(RIVALRY_KEY, JSON.stringify(d)); } catch {} }

// ── MURPH'S BRAIN ─────────────────────────────────────────────────
function murphRead({ golfer, distance, lie, wind, pinPosition, tendency, preferredShape, clubs }) {
  const dist = parseInt(distance);
  const sortedClubs = (clubs || []).filter(c => c.carry > 0).sort((a, b) => b.carry - a.carry);

  const windAdj = {
    "None": 0, "Into — light": 8, "Into — strong": 18,
    "With — light": -6, "With — strong": -14,
    "Left-to-right": 3, "Right-to-left": 3, "Swirling": 5
  }[wind] || 0;

  const lieAdj = {
    "Fairway": 0, "Light rough": 5, "Thick rough": 12,
    "Fairway bunker": 10, "Greenside bunker": 0,
    "Tight lie / hardpan": 3, "Uphill": -8, "Downhill": 8,
    "Sidehill — ball above feet": 5, "Sidehill — ball below feet": 5
  }[lie] || 0;

  const playDist = dist + windAdj + lieAdj;
  const reachable = sortedClubs.filter(c => c.carry >= playDist);
  let rec, between = false;

  if (reachable.length === 0) {
    rec = sortedClubs[0];
  } else {
    const shortest = reachable[reachable.length - 1];
    const nextLonger = sortedClubs[sortedClubs.indexOf(shortest) - 1];
    if (nextLonger && (nextLonger.carry - playDist) <= 8 && (shortest.carry - playDist) <= 6) {
      between = true; rec = nextLonger;
    } else { rec = shortest; }
  }

  const clubName = rec?.club || "your club";
  const carryDiff = (rec?.carry || 0) - playDist;
  let clubNote = between
    ? `you're between clubs — I'm giving you the ${clubName}, take a little off it`
    : carryDiff > 10
    ? `that's a comfortable ${clubName} — you've got room to make a smooth swing`
    : `right at the ${clubName} — full commitment, no steering`;

  const windLines = {
    "None": "", "Into — light": "slight breeze into you — take one more and swing easy",
    "Into — strong": "wind's in your face — that's why I added yardage, trust the club",
    "With — light": "little wind helping — don't go chasing distance, just hit it solid",
    "With — strong": "good wind at your back — I've already taken off yardage",
    "Left-to-right": "wind's pushing left to right — aim a touch left and let it work",
    "Right-to-left": "right-to-left wind — start it right of target",
    "Swirling": "wind's swirling, don't trust it — pick a line and commit"
  };

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

  const pinLines = {
    "Middle": "middle pin — aim for the center, give yourself a putt",
    "Front / short": "pin's up front — land it on the front edge, you don't need to be cute",
    "Back / deep": "pin's back — don't short-side yourself chasing it, land it middle and let it release",
    "Left": "pin left means trouble left — aim at the middle of the green, let the shot work toward it",
    "Right": "pin right — play to the fat part of the green, don't get sucked into chasing it right",
    "Tucked left": "tucked left pin — do not go at it, aim for the fat of the green and make your par putt",
    "Tucked right": "tucked right pin — same answer, fat of the green, don't be a hero"
  };

  const tendencyLines = {
    "None": "", "Pull left": "you pull under pressure — feel like you're aiming a hair right and make a full finish",
    "Push right": "you push it — stay through the ball and keep that face square",
    "Hook": "you're hooking it — weaken that grip a touch and keep the face open through impact",
    "Slice": "you're slicing — check that grip, strengthen it, and feel like you're swinging out to right field",
    "Fat / chunk": "stop thinking about the fat shot or you'll hit it — just pick a target and go",
    "Thin / skull": "keep your head down through impact — you're not watching it land until after you've hit it",
    "Always come up short": "you always come up short under pressure — commit to the full swing",
    "Flip at impact": "don't flip at it — lead with the handle, hands ahead at impact, trust the loft"
  };

  const shapeLines = {
    "Straight": "play it straight", "Draw": "start it a touch right and let it draw back",
    "Fade": "open the face slightly, aim left, let it fade to the target",
    "Punch/knockdown": "punch it — choke down, half swing, keep it under the wind",
    "High soft landing": "high shot — let it land soft, make sure you've got enough club",
    "Bump and run": "bump and run — land it short and let it chase up, less risk"
  };

  const swingThoughts = [
    "one thought: finish the swing", "just pick a spot and trust it",
    "slow back, through the ball", "don't steer it — swing through, not at",
    "tempo. that's all. tempo.", "you know how to hit this shot. get out of your own way.",
    "breathe out before you take it back", "eyes on the back of the ball, nowhere else"
  ];
  const swingThought = swingThoughts[(dist + lie.length + wind.length) % swingThoughts.length];

  const openers = ["Alright,", `${golfer} —`, "Here's what I see —", "Listen,", "Okay —"];
  const opener = openers[dist % openers.length];
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

  const parts = [
    `${opener} ${clubNote}.`,
    windLines[wind] ? `${cap(windLines[wind])}.` : "",
    `${cap(lieLines[lie] || "clean lie")}.`,
    `${cap(pinLines[pinPosition] || "aim for the center")}.`,
    `${cap(shapeLines[preferredShape] || "play it straight")}.`,
    tendencyLines[tendency] ? `${cap(tendencyLines[tendency])}.` : "",
    `And ${swingThought}.`
  ].filter(Boolean);

  return { club: clubName, carry: rec?.carry || 0, playDist, read: parts.join(" ") };
}

const windOptions = ["None","Into — light","Into — strong","With — light","With — strong","Left-to-right","Right-to-left","Swirling"];
const lieOptions = ["Fairway","Light rough","Thick rough","Fairway bunker","Greenside bunker","Tight lie / hardpan","Uphill","Downhill","Sidehill — ball above feet","Sidehill — ball below feet"];
const shotShapeOptions = ["Straight","Draw","Fade","Punch/knockdown","High soft landing","Bump and run"];
const pinOptions = ["Middle","Front / short","Back / deep","Left","Right","Tucked left","Tucked right"];
const tendencyOptions = ["None","Pull left","Push right","Hook","Slice","Fat / chunk","Thin / skull","Always come up short","Flip at impact"];

function parseVoiceInput(transcript) {
  const t = transcript.toLowerCase();
  const result = {};
  const distMatch = t.match(/\b(\d{2,3})\b/);
  if (distMatch) result.distance = distMatch[1];
  if (/into.*(strong|hard)|strong.*into/.test(t)) result.wind = "Into — strong";
  else if (/into|headwind|against/.test(t)) result.wind = "Into — light";
  else if (/with.*(strong|hard)|strong.*tail/.test(t)) result.wind = "With — strong";
  else if (/with|tailwind|helping/.test(t)) result.wind = "With — light";
  else if (/left.*(to|2).right/.test(t)) result.wind = "Left-to-right";
  else if (/right.*(to|2).left/.test(t)) result.wind = "Right-to-left";
  else if (/swirl|gusty/.test(t)) result.wind = "Swirling";
  if (/thick rough|deep rough/.test(t)) result.lie = "Thick rough";
  else if (/light rough|rough/.test(t)) result.lie = "Light rough";
  else if (/fairway bunker/.test(t)) result.lie = "Fairway bunker";
  else if (/bunker|sand/.test(t)) result.lie = "Greenside bunker";
  else if (/tight|hardpan/.test(t)) result.lie = "Tight lie / hardpan";
  else if (/uphill/.test(t)) result.lie = "Uphill";
  else if (/downhill/.test(t)) result.lie = "Downhill";
  else if (/fairway/.test(t)) result.lie = "Fairway";
  if (/tuck.*left/.test(t)) result.pin = "Tucked left";
  else if (/tuck.*right/.test(t)) result.pin = "Tucked right";
  else if (/back|deep/.test(t)) result.pin = "Back / deep";
  else if (/front|short/.test(t)) result.pin = "Front / short";
  else if (/pin.*left|flag.*left/.test(t)) result.pin = "Left";
  else if (/pin.*right|flag.*right/.test(t)) result.pin = "Right";
  return result;
}

// ── COLORS from icon ──────────────────────────────────────────────
const C = {
  bg:        "#1a1f14",       // very dark olive-black
  bgCard:    "rgba(10,12,8,0.55)",
  border:    "#3a4a2a",
  borderFaint: "#2a3a1e",
  gold:      "#c9a84c",       // warm antique gold
  goldDim:   "#8a6f2e",
  parchment: "#e8dfc8",       // warm parchment text
  parchDim:  "#9a9080",
  green:     "#2d4a1e",       // deep hunter green
  greenMid:  "#4a6a30",
  greenLight:"#7a9a5a",
  burgundy:  "#7a2828",       // icon's cross-clubs circle
  tan:       "#b5956a",       // icon's background tan
};



export default function CaddieBrain() {
  const initData = getBagData();
  const [players, setPlayers] = useState(initData.players || DEFAULT_PLAYERS);
  const [bags, setBags] = useState(initData.bags || DEFAULT_BAG);
  const [golfer, setGolfer] = useState(initData.players?.[0] || "Colleen");

  const [distance, setDistance] = useState("");
  const [lie, setLie] = useState("Fairway");
  const [wind, setWind] = useState("None");
  const [pinPosition, setPinPosition] = useState("Middle");
  const [tendency, setTendency] = useState("None");
  const [preferredShape, setPreferredShape] = useState("Straight");
  const [result, setResult] = useState(null);

  const [rivalry, setRivalry] = useState(getRivalry());
  const [scoreInput, setScoreInput] = useState({});
  const [holesInput, setHolesInput] = useState("18");

  const [activeTab, setActiveTab] = useState("shot");

  // Bag editing state
  const [bagEdit, setBagEdit] = useState(() => JSON.parse(JSON.stringify(bags)));
  const [bagGolfer, setBagGolfer] = useState(nameToKey(initData.players?.[0] || "Colleen"));
  const [bagSaved, setBagSaved] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");

  const [listening, setListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("");

  const golferKey = nameToKey(golfer);
  const golferClubs = bags[golferKey] || [];

  function startListening() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setVoiceStatus("Voice not supported in this browser."); return; }
    const rec = new SR();
    rec.lang = "en-US"; rec.interimResults = false; rec.maxAlternatives = 1;
    setListening(true); setVoiceStatus("Listening…"); rec.start();
    rec.onresult = (e) => {
      const parsed = parseVoiceInput(e.results[0][0].transcript);
      if (parsed.distance) setDistance(parsed.distance);
      if (parsed.wind) setWind(parsed.wind);
      if (parsed.lie) setLie(parsed.lie);
      if (parsed.pin) setPinPosition(parsed.pin);
      setResult(null);
      setVoiceStatus(`Got it — ${Object.keys(parsed).length} fields filled. Review and Ask Murph.`);
      setListening(false);
    };
    rec.onerror = (e) => {
      setVoiceStatus(e.error === "not-allowed" ? "Mic access denied." : "Didn't catch that.");
      setListening(false);
    };
    rec.onend = () => setListening(false);
  }

  function getAdvice() {
    if (!distance) return;
    setResult(murphRead({ golfer, distance, lie, wind, pinPosition, tendency, preferredShape, clubs: golferClubs }));
  }

  // ── Bag management ──────────────────────────────────────────────
  function saveBagEdits() {
    const newBags = { ...bags, ...bagEdit };
    saveBagData({ players, bags: newBags });
    setBags(newBags);
    setBagSaved(true);
    setTimeout(() => setBagSaved(false), 2000);
  }

  function addPlayer() {
    const name = newPlayerName.trim();
    if (!name || players.map(p => p.toLowerCase()).includes(name.toLowerCase())) return;
    const key = nameToKey(name);
    const newPlayers = [...players, name];
    const newBags = { ...bags, [key]: [] };
    const newEdit = { ...bagEdit, [key]: [] };
    setPlayers(newPlayers);
    setBags(newBags);
    setBagEdit(newEdit);
    saveBagData({ players: newPlayers, bags: newBags });
    setBagGolfer(key);
    setNewPlayerName("");
  }

  function removePlayer(name) {
    if (players.length <= 1) return;
    const key = nameToKey(name);
    const newPlayers = players.filter(p => p !== name);
    const newBags = { ...bags };
    const newEdit = { ...bagEdit };
    delete newBags[key]; delete newEdit[key];
    setPlayers(newPlayers);
    setBags(newBags);
    setBagEdit(newEdit);
    saveBagData({ players: newPlayers, bags: newBags });
    if (bagGolfer === key) setBagGolfer(nameToKey(newPlayers[0]));
    if (golfer === name) setGolfer(newPlayers[0]);
  }

  function addClub(who) {
    setBagEdit(prev => ({ ...prev, [who]: [...(prev[who] || []), { club: "", carry: "" }] }));
  }
  function removeClub(who, idx) {
    setBagEdit(prev => ({ ...prev, [who]: prev[who].filter((_, i) => i !== idx) }));
  }
  function updateClub(who, idx, field, val) {
    setBagEdit(prev => {
      const updated = (prev[who] || []).map((c, i) => i === idx ? { ...c, [field]: val } : c);
      return { ...prev, [who]: updated };
    });
  }

  // ── Rivalry ─────────────────────────────────────────────────────
  function logScore() {
    const scores = {};
    players.forEach(p => {
      const v = parseInt(scoreInput[nameToKey(p)]);
      if (!isNaN(v)) scores[nameToKey(p)] = v;
    });
    if (Object.keys(scores).length < 2) return;
    const minScore = Math.min(...Object.values(scores));
    const winners = Object.entries(scores).filter(([, v]) => v === minScore).map(([k]) => k);
    const updated = { ...rivalry };
    if (!updated.wins) updated.wins = {};
    if (winners.length === 1) updated.wins[winners[0]] = (updated.wins[winners[0]] || 0) + 1;
    const winnerName = winners.length === 1
      ? players.find(p => nameToKey(p) === winners[0]) || winners[0]
      : "Tie";
    updated.rounds = [...(updated.rounds || []), {
      date: new Date().toLocaleDateString(), holes: holesInput,
      scores, winner: winnerName
    }];
    saveRivalry(updated);
    setRivalry(updated);
    setScoreInput({});
  }

  const totalRounds = rivalry.rounds?.length || 0;

  // ── Styles ──────────────────────────────────────────────────────
  const iStyle = {
    width: "100%", padding: "9px 11px",
    background: "rgba(0,0,0,0.45)", border: `1px solid ${C.border}`,
    borderRadius: "3px", color: C.parchment, fontSize: "14px",
    fontFamily: "Georgia, serif", outline: "none", boxSizing: "border-box"
  };

  const tabBtn = (t) => ({
    padding: "8px 16px", border: `1px solid`,
    borderColor: activeTab === t ? C.gold : C.border,
    background: activeTab === t ? `rgba(201,168,76,0.13)` : "transparent",
    color: activeTab === t ? C.gold : C.parchDim,
    borderRadius: "3px", cursor: "pointer", fontSize: "11px",
    letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "Georgia, serif",
    whiteSpace: "nowrap"
  });

  return (
    <div style={{ minHeight: "100vh", background: C.bg,
      backgroundImage: `radial-gradient(ellipse at 15% 40%, #202b16 0%, transparent 55%), radial-gradient(ellipse at 85% 15%, #141d0e 0%, transparent 50%)`,
      fontFamily: "Georgia, serif", color: C.parchment, position: "relative" }}>

      {/* Grain texture */}
      <div style={{ position: "fixed", inset: 0, opacity: 0.05, pointerEvents: "none", zIndex: 0,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />

      {/* ── HEADER ── */}
      <div style={{ borderBottom: `1px solid ${C.border}`, background: "rgba(0,0,0,0.4)", position: "relative", zIndex: 1 }}>
        {/* Title row */}
        <div style={{ padding: "16px 20px 10px", display: "flex", alignItems: "center", gap: "14px", borderBottom: `1px solid ${C.borderFaint}` }}>
          <img src="/icon-192.png" alt="Murph" style={{ width: "48px", height: "48px", borderRadius: "8px", objectFit: "cover", border: `1px solid ${C.goldDim}` }} />
          <div>
            <div style={{ fontSize: "22px", fontWeight: "bold", color: C.gold, textTransform: "uppercase", letterSpacing: "0.06em", lineHeight: 1 }}>Loop with Murph</div>
            <div style={{ fontSize: "10px", color: C.greenLight, letterSpacing: "0.18em", textTransform: "uppercase", marginTop: "4px" }}>60 Years on the Bag</div>
          </div>
          {/* Crossed clubs badge */}
          <div style={{ marginLeft: "auto", width: "36px", height: "36px", borderRadius: "50%", background: C.burgundy, border: `2px solid ${C.goldDim}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>⛳</div>
        </div>
        {/* Tab row */}
        <div style={{ padding: "10px 20px", display: "flex", gap: "8px", overflowX: "auto" }}>
          {["shot", "bag", "rivalry"].map(t => (
            <button key={t} onClick={() => setActiveTab(t)} style={tabBtn(t)}>
              {t === "shot" ? "Get a Read" : t === "bag" ? "The Bag" : "Rivalry"}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: "860px", margin: "0 auto", padding: "28px 18px", position: "relative", zIndex: 1 }}>

        {/* ── SHOT TAB ── */}
        {activeTab === "shot" && (
          <div>
            {/* Player selector */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "22px", flexWrap: "wrap" }}>
              {players.map(name => (
                <button key={name} onClick={() => { setGolfer(name); setResult(null); }} style={{
                  padding: "9px 24px", border: "1px solid",
                  borderColor: golfer === name ? C.gold : C.border,
                  background: golfer === name ? `rgba(201,168,76,0.12)` : "rgba(0,0,0,0.2)",
                  color: golfer === name ? C.gold : C.parchDim,
                  borderRadius: "3px", cursor: "pointer", fontSize: "15px", fontFamily: "Georgia, serif"
                }}>{name}</button>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "18px" }}>
              <Field label="Distance to Pin (yards)" c={C}>
                <input type="number" value={distance} onChange={e => { setDistance(e.target.value); setResult(null); }} placeholder="e.g. 145" style={iStyle} />
              </Field>
              <Field label="Lie" c={C}>
                <select value={lie} onChange={e => { setLie(e.target.value); setResult(null); }} style={iStyle}>
                  {lieOptions.map(o => <option key={o}>{o}</option>)}
                </select>
              </Field>
              <Field label="Wind" c={C}>
                <select value={wind} onChange={e => { setWind(e.target.value); setResult(null); }} style={iStyle}>
                  {windOptions.map(o => <option key={o}>{o}</option>)}
                </select>
              </Field>
              <Field label="Pin Position" c={C}>
                <select value={pinPosition} onChange={e => { setPinPosition(e.target.value); setResult(null); }} style={iStyle}>
                  {pinOptions.map(o => <option key={o}>{o}</option>)}
                </select>
              </Field>
              <Field label="Your Tendency" c={C}>
                <select value={tendency} onChange={e => { setTendency(e.target.value); setResult(null); }} style={iStyle}>
                  {tendencyOptions.map(o => <option key={o}>{o}</option>)}
                </select>
              </Field>
              <Field label="Shot Shape" c={C}>
                <select value={preferredShape} onChange={e => { setPreferredShape(e.target.value); setResult(null); }} style={iStyle}>
                  {shotShapeOptions.map(o => <option key={o}>{o}</option>)}
                </select>
              </Field>
            </div>

            <div style={{ display: "flex", gap: "10px", marginBottom: "8px" }}>
              <button onClick={getAdvice} disabled={!distance} style={{
                flex: 1, padding: "15px",
                background: !distance ? "#1a2410" : `linear-gradient(135deg, ${C.gold}, #a8862a)`,
                border: "none", borderRadius: "4px",
                color: !distance ? C.greenMid : C.bg,
                fontSize: "16px", fontWeight: "bold", cursor: !distance ? "not-allowed" : "pointer",
                letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "Georgia, serif"
              }}>Ask Murph</button>
              <button onClick={startListening} disabled={listening} title="Describe your shot" style={{
                padding: "15px 18px", border: `1px solid ${listening ? C.gold : C.border}`,
                background: listening ? `rgba(201,168,76,0.15)` : "rgba(0,0,0,0.3)",
                borderRadius: "4px", cursor: listening ? "default" : "pointer", fontSize: "22px", lineHeight: 1,
                animation: listening ? "pulse 1s ease-in-out infinite" : "none"
              }}>{listening ? "🎙️" : "🎤"}</button>
            </div>
            {voiceStatus && <div style={{ fontSize: "12px", color: listening ? C.gold : C.parchDim, textAlign: "center", marginBottom: "8px" }}>{voiceStatus}</div>}
            <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>

            {result && (
              <div style={{ marginTop: "22px", background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: "6px", overflow: "hidden" }}>
                {/* Club badge */}
                <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.borderFaint}`, display: "flex", gap: "12px", alignItems: "center" }}>
                  <div style={{ padding: "7px 18px", background: `rgba(201,168,76,0.15)`, border: `1px solid ${C.gold}`, borderRadius: "3px", fontSize: "15px", color: C.gold, fontWeight: "bold" }}>
                    {result.club}
                  </div>
                  <div style={{ fontSize: "12px", color: C.greenLight }}>
                    Plays {result.playDist}y · Carry {result.carry}y
                  </div>
                </div>
                {/* Murph's read */}
                <div style={{ padding: "20px", position: "relative" }}>
                  <div style={{ fontSize: "9px", color: C.gold, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "12px" }}>Murph's Read</div>
                  <div style={{ fontSize: "15px", lineHeight: "1.85", fontStyle: "italic", color: C.parchment, borderLeft: `3px solid ${C.gold}`, paddingLeft: "16px" }}>"{result.read}"</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── BAG TAB ── */}
        {activeTab === "bag" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div style={{ fontSize: "18px", color: C.gold, fontWeight: "bold", letterSpacing: "0.04em" }}>Club Bags</div>
              <button onClick={saveBagEdits} style={{
                padding: "8px 20px",
                background: bagSaved ? "rgba(80,160,80,0.2)" : `rgba(201,168,76,0.15)`,
                border: `1px solid ${bagSaved ? "#6ab06a" : C.gold}`,
                borderRadius: "3px", color: bagSaved ? "#6ab06a" : C.gold,
                cursor: "pointer", fontSize: "13px", fontFamily: "Georgia, serif"
              }}>{bagSaved ? "✓ Saved" : "Save Bags"}</button>
            </div>

            {/* Player tabs + add player */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap", alignItems: "center" }}>
              {players.map(name => {
                const key = nameToKey(name);
                return (
                  <div key={key} style={{ display: "flex", alignItems: "center", gap: "0" }}>
                    <button onClick={() => setBagGolfer(key)} style={{
                      padding: "7px 18px", border: "1px solid",
                      borderColor: bagGolfer === key ? C.gold : C.border,
                      background: bagGolfer === key ? `rgba(201,168,76,0.12)` : "transparent",
                      color: bagGolfer === key ? C.gold : C.parchDim,
                      borderRadius: "3px 0 0 3px", cursor: "pointer", fontSize: "13px",
                      fontFamily: "Georgia, serif"
                    }}>{name}</button>
                    {players.length > 1 && (
                      <button onClick={() => removePlayer(name)} title={`Remove ${name}`} style={{
                        padding: "7px 8px", border: "1px solid", borderLeft: "none",
                        borderColor: bagGolfer === key ? C.gold : C.border,
                        background: "transparent", color: "#7a4040", cursor: "pointer",
                        fontSize: "13px", borderRadius: "0 3px 3px 0", lineHeight: 1
                      }}>×</button>
                    )}
                  </div>
                );
              })}
              {/* Add player */}
              <div style={{ display: "flex", gap: "0", marginLeft: "auto" }}>
                <input
                  value={newPlayerName}
                  onChange={e => setNewPlayerName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addPlayer()}
                  placeholder="Add player…"
                  style={{ ...iStyle, width: "130px", borderRadius: "3px 0 0 3px", padding: "7px 10px", fontSize: "13px" }}
                />
                <button onClick={addPlayer} style={{
                  padding: "7px 12px", background: `rgba(201,168,76,0.15)`,
                  border: `1px solid ${C.gold}`, borderLeft: "none",
                  borderRadius: "0 3px 3px 0", color: C.gold, cursor: "pointer", fontSize: "14px"
                }}>+</button>
              </div>
            </div>

            {/* Club list */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 110px 36px", gap: "8px", marginBottom: "6px" }}>
              <div style={{ fontSize: "9px", color: C.greenMid, letterSpacing: "0.14em", textTransform: "uppercase" }}>Club</div>
              <div style={{ fontSize: "9px", color: C.greenMid, letterSpacing: "0.14em", textTransform: "uppercase" }}>Carry (yds)</div>
              <div />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "7px", marginBottom: "12px" }}>
              {(bagEdit[bagGolfer] || []).map((club, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 110px 36px", gap: "8px", alignItems: "center" }}>
                  <input value={club.club} onChange={e => updateClub(bagGolfer, i, "club", e.target.value)} placeholder="Club name" style={iStyle} />
                  <input type="number" value={club.carry} onChange={e => updateClub(bagGolfer, i, "carry", e.target.value)} placeholder="yds" style={iStyle} />
                  <button onClick={() => removeClub(bagGolfer, i)} style={{ background: "transparent", border: `1px solid #4a2020`, color: "#8a4040", borderRadius: "3px", cursor: "pointer", fontSize: "16px", padding: "7px", lineHeight: 1 }}>×</button>
                </div>
              ))}
            </div>
            <button onClick={() => addClub(bagGolfer)} style={{ padding: "9px 20px", background: "transparent", border: `1px dashed ${C.border}`, borderRadius: "3px", color: C.greenMid, cursor: "pointer", fontSize: "13px", fontFamily: "Georgia, serif", width: "100%" }}>+ Add Club</button>
            <div style={{ marginTop: "12px", fontSize: "11px", color: C.greenMid }}>Set carry to 0 for putter. Murph reads these distances when picking your club.</div>
          </div>
        )}

        {/* ── RIVALRY TAB ── */}
        {activeTab === "rivalry" && (
          <div>
            <div style={{ fontSize: "18px", color: C.gold, marginBottom: "22px", fontWeight: "bold", letterSpacing: "0.04em" }}>The Rivalry</div>

            {/* Scoreboard */}
            <div style={{ display: "flex", gap: "1px", marginBottom: "28px", border: `1px solid ${C.border}`, borderRadius: "6px", overflow: "hidden" }}>
              {players.map((name, i) => {
                const key = nameToKey(name);
                const wins = rivalry.wins?.[key] || 0;
                const pct = totalRounds ? Math.round((wins / totalRounds) * 100) : 0;
                const colors = [C.gold, C.greenLight, C.tan, "#a07ab0"];
                const col = colors[i % colors.length];
                return (
                  <div key={key} style={{ flex: 1, background: "rgba(0,0,0,0.3)", padding: "20px 16px", textAlign: i % 2 === 0 ? "left" : "right" }}>
                    <div style={{ fontSize: "10px", color: C.parchDim, letterSpacing: "0.12em", textTransform: "uppercase" }}>{name}</div>
                    <div style={{ fontSize: "42px", fontWeight: "bold", color: col, lineHeight: 1 }}>{wins}</div>
                    <div style={{ fontSize: "11px", color: C.greenMid }}>{pct}% win rate</div>
                  </div>
                );
              })}
              <div style={{ background: "#0a0e07", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "16px 12px", gap: "4px", minWidth: "60px" }}>
                <div style={{ fontSize: "9px", color: C.greenMid, letterSpacing: "0.14em", textTransform: "uppercase" }}>Rounds</div>
                <div style={{ fontSize: "26px", fontWeight: "bold", color: C.parchment }}>{totalRounds}</div>
              </div>
            </div>

            {/* Log a round */}
            <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: "6px", padding: "18px", marginBottom: "22px" }}>
              <div style={{ fontSize: "10px", color: C.gold, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "14px" }}>Log a Round</div>
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${players.length}, 1fr) 80px auto`, gap: "10px", alignItems: "end" }}>
                {players.map(name => (
                  <Field key={name} label={`${name}'s Score`} c={C}>
                    <input type="number" value={scoreInput[nameToKey(name)] || ""} onChange={e => setScoreInput(s => ({ ...s, [nameToKey(name)]: e.target.value }))} placeholder="Score" style={iStyle} />
                  </Field>
                ))}
                <Field label="Holes" c={C}>
                  <select value={holesInput} onChange={e => setHolesInput(e.target.value)} style={iStyle}>
                    <option>9</option><option>18</option>
                  </select>
                </Field>
                <button onClick={logScore} style={{ padding: "10px 14px", background: `rgba(201,168,76,0.15)`, border: `1px solid ${C.gold}`, borderRadius: "3px", color: C.gold, cursor: "pointer", fontSize: "13px", fontFamily: "Georgia, serif", whiteSpace: "nowrap" }}>Log It</button>
              </div>
            </div>

            {/* History */}
            {rivalry.rounds?.length > 0 && (
              <div>
                <div style={{ fontSize: "10px", color: C.greenMid, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "10px" }}>History</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {[...rivalry.rounds].reverse().map((r, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 14px", background: "rgba(0,0,0,0.25)", border: `1px solid ${C.borderFaint}`, borderRadius: "3px", fontSize: "13px", flexWrap: "wrap", gap: "6px" }}>
                      <span style={{ color: C.parchDim }}>{r.date} · {r.holes}h</span>
                      <span style={{ color: C.parchment }}>
                        {players.map(name => {
                          const key = nameToKey(name);
                          return <span key={key}>{name} <strong style={{ color: C.gold }}>{r.scores?.[key] ?? r[key] ?? "—"}</strong>{" "}</span>;
                        })}
                      </span>
                      <span style={{ color: r.winner === "Tie" ? C.parchDim : C.gold, fontWeight: "bold" }}>
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

function Field({ label, children, c }) {
  return (
    <div>
      <div style={{ fontSize: "9px", color: c.greenLight, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "6px" }}>{label}</div>
      {children}
    </div>
  );
}
