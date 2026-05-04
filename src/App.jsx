import { useState, useEffect } from "react";

// ── preset data ──────────────────────────────────────────────
const LABOR_RATES = {
  "Crew Lead": 45, "Skilled Laborer": 32,
  "General Laborer": 22, "Equipment Operator": 55,
};
const EQUIPMENT_RATES = {
  "Mini Excavator": 320, "Full-Size Excavator": 580,
  "Skid Steer": 280, "Plate Compactor": 65,
  "Dump Truck (10yd)": 180, "Concrete Mixer": 90,
};
const MATERIAL_PRESETS = {
  "Concrete Pavers":    { unit: "sq ft",       cost: 4.50 },
  "Natural Stone":      { unit: "sq ft",       cost: 12.00 },
  "Gravel Base (4\")":  { unit: "sq ft",       cost: 1.80 },
  "Sand Bedding (1\")": { unit: "sq ft",       cost: 0.65 },
  "Retaining Wall Block":{ unit: "sq ft",      cost: 18.00 },
  "Crushed Stone":      { unit: "ton",         cost: 42.00 },
  "Fill Dirt":          { unit: "cubic yard",  cost: 28.00 },
  "Topsoil":            { unit: "cubic yard",  cost: 38.00 },
  "Concrete (ready-mix)":{ unit: "cubic yard", cost: 165.00 },
  "Rebar (1/2\")":      { unit: "linear ft",   cost: 1.20 },
};
const JOB_TYPES = [
  "Patio / Paver Install","Retaining Wall","Driveway",
  "Excavation / Grading","Pool Deck","Walkway","French Drain","Custom",
];

const fmt = (v) => (v || 0).toLocaleString("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0});
const pct = (a,b) => b > 0 ? Math.round(a/b*100) : 0;

// ── tiny shared components ────────────────────────────────────
const Label = ({children}) => (
  <div style={{fontSize:10,fontWeight:800,letterSpacing:"0.1em",textTransform:"uppercase",
    color:"#6b7f8f",marginBottom:5}}>{children}</div>
);

const Field = ({label,children,span=1}) => (
  <div style={{gridColumn:`span ${span}`}}>
    {label && <Label>{label}</Label>}
    {children}
  </div>
);

const inputBase = {
  width:"100%", boxSizing:"border-box", background:"#0b1520",
  border:"1px solid #1c2e3e", borderRadius:7, color:"#ddeeff",
  padding:"9px 11px", fontSize:13, fontFamily:"inherit", outline:"none",
};

const Inp = ({value, onChange, min=0, step=1, placeholder=""}) => {
  const [display, setDisplay] = useState(value === 0 ? "" : String(value));

  useEffect(() => {
    // Sync when parent changes value externally (e.g. picking a material preset)
    setDisplay(d => parseFloat(d) === value ? d : (value === 0 ? "" : String(value)));
  }, [value]);

  return (
    <input
      type="number"
      inputMode="numeric"
      min={min}
      step={step}
      placeholder={placeholder}
      value={display}
      onChange={e => {
        const raw = e.target.value;
        setDisplay(raw);
        onChange(parseFloat(raw) || 0);
      }}
      onBlur={() => {
        if (display === "" || isNaN(parseFloat(display))) {
          setDisplay("");
          onChange(0);
        }
      }}
      style={inputBase}
    />
  );
};

const Sel = ({value,onChange,options}) => (
  <select value={value} onChange={e=>onChange(e.target.value)}
    style={{...inputBase,cursor:"pointer"}}>
    {options.map(o=><option key={o} value={o}>{o}</option>)}
  </select>
);

const Txt = ({value,onChange,placeholder}) => (
  <input type="text" value={value} placeholder={placeholder}
    onChange={e=>onChange(e.target.value)}
    style={inputBase} />
);

const Card = ({children,accent=false,style={}}) => (
  <div style={{
    background: accent ? "#0f1f0f" : "#0c1825",
    border:`1px solid ${accent?"#2a4a2a":"#192838"}`,
    borderRadius:12, padding:22, ...style,
  }}>{children}</div>
);

const SectionHead = ({icon,title,right}) => (
  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
    <div style={{display:"flex",alignItems:"center",gap:9}}>
      <span style={{fontSize:16}}>{icon}</span>
      <span style={{fontSize:11,fontWeight:900,letterSpacing:"0.14em",
        textTransform:"uppercase",color:"#b8963a"}}>{title}</span>
    </div>
    {right}
  </div>
);

const RemBtn = ({onClick}) => (
  <button onClick={onClick} style={{background:"transparent",border:"1px solid #5a2020",
    borderRadius:6,color:"#c06060",padding:"8px 10px",cursor:"pointer",fontSize:13,lineHeight:1}}>✕</button>
);

const AddBtn = ({onClick,label}) => (
  <button onClick={onClick} style={{background:"transparent",border:"1px solid #b8963a",
    borderRadius:7,color:"#b8963a",padding:"7px 14px",fontSize:11,fontWeight:800,
    letterSpacing:"0.07em",cursor:"pointer",fontFamily:"inherit"}}>+ {label}</button>
);

const grid = (cols,gap=10) => ({display:"grid",gridTemplateColumns:cols,gap,alignItems:"end"});
const divider = {borderTop:"1px solid #192838",marginBottom:14,paddingBottom:14};

// ── tabs ──────────────────────────────────────────────────────
const TABS = ["⚙️  Business Setup","📋  Job Builder","💰  Bid Results"];

export default function App() {
  const [tab, setTab] = useState(0);
  const [lead, setLead] = useState({firstName:"", businessName:"", email:"", phone:""});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [phoneError, setPhoneError] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("veritasbid_contractor");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.email && parsed.firstName && parsed.businessName && parsed.phone) {
          setLead(parsed);
          setSubmitted(true);
        }
      }
    } catch (e) {
      // corrupt or missing — ignore, gate will show normally
    }
  }, []);

  const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(e.trim());
  const isValidPhone = (p) => /\d{7,}/.test(p.replace(/\D/g, ""));

  const handleLeadSubmit = () => {
    if(!lead.firstName||!lead.businessName||!lead.email||!lead.phone) return;
    if(!isValidEmail(lead.email)) { setEmailError("Please enter a valid email address (e.g. john@example.com)"); return; }
    if(!isValidPhone(lead.phone)) { setPhoneError("Please enter a valid phone number"); return; }
    setSubmitting(true);

    // Fire-and-forget: log to Veritas dashboard
    fetch("https://dashboardveritas.netlify.app/.netlify/functions/log-tool-usage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email:         lead.email,
        first_name:    lead.firstName,
        business_name: lead.businessName,
        phone:         lead.phone,
        bid_inputs: {
          client:       job.client,
          jobType:      job.type,
          sqft:         job.sqft,
          jobName:      job.name,
          labor:        labor,
          equipment:    equip,
          materials:    mats,
          variableCosts: variable,
          monthlyJobs:  monthlyJobs,
          fixedCosts:   fixed,
          margin:       margin,
        },
        floor_price:   floorBid,
        target_price:  targetBid,
        premium_price: premiumBid,
        user_agent:    navigator.userAgent,
      }),
    }).catch(() => {/* fire-and-forget — never blocks unlock */});

    setSubmitting(false);
    try {
      localStorage.setItem("veritasbid_contractor", JSON.stringify(lead));
    } catch (e) {
      // storage full or blocked — silent fail, doesn't affect unlock
    }
    setSubmitted(true);
  };

  // ── FIXED OVERHEAD (monthly) ──
  const [monthlyJobs, setMonthlyJobs] = useState(4);
  const [fixed, setFixed] = useState([
    {label:"General Liability Insurance", monthly:400},
    {label:"Workers Comp Insurance",      monthly:300},
    {label:"Vehicle / Truck Payment",     monthly:650},
    {label:"Fuel (avg monthly)",          monthly:350},
    {label:"Phone & Software",            monthly:150},
    {label:"Equipment Loan / Lease",      monthly:500},
    {label:"Storage / Yard",              monthly:200},
    {label:"Tools & Small Equipment",     monthly:100},
  ]);
  const addFixed = () => setFixed([...fixed,{label:"",monthly:0}]);
  const removeFixed = i => setFixed(fixed.filter((_,idx)=>idx!==i));
  const updateFixed = (i,k,v) => setFixed(fixed.map((r,idx)=>idx===i?{...r,[k]:v}:r));
  const totalMonthlyFixed = fixed.reduce((s,r)=>s+r.monthly,0);
  const fixedPerJob = monthlyJobs > 0 ? totalMonthlyFixed / monthlyJobs : 0;

  // ── JOB INFO ──
  const [job, setJob] = useState({client:"",name:"",type:"Patio / Paver Install",sqft:0});

  // ── LABOR ──
  const [labor, setLabor] = useState([{role:"Crew Lead",hours:8,workers:1,rate:LABOR_RATES["Crew Lead"]}]);
  const addLabor = () => setLabor([...labor,{role:"General Laborer",hours:8,workers:1,rate:LABOR_RATES["General Laborer"]}]);
  const removeLabor = i => setLabor(labor.filter((_,idx)=>idx!==i));
  const updateLabor = (i,k,v) => setLabor(labor.map((r,idx)=>idx===i?{...r,[k]:v}:r));
  const totalLabor = labor.reduce((s,r)=>(s+(r.rate||0)*r.hours*r.workers),0);

  // ── EQUIPMENT ──
  const [equip, setEquip] = useState([{item:"Mini Excavator",days:1,rate:EQUIPMENT_RATES["Mini Excavator"]}]);
  const addEquip = () => setEquip([...equip,{item:"Skid Steer",days:1,rate:EQUIPMENT_RATES["Skid Steer"]}]);
  const removeEquip = i => setEquip(equip.filter((_,idx)=>idx!==i));
  const updateEquip = (i,k,v) => setEquip(equip.map((r,idx)=>idx===i?{...r,[k]:v}:r));
  const totalEquip = equip.reduce((s,r)=>(s+(r.rate||0)*r.days),0);

  // ── MATERIALS ──
  const [mats, setMats] = useState([{name:"Concrete Pavers",qty:0,unit:"sq ft",unitCost:4.5}]);
  const addMat = () => setMats([...mats,{name:"Gravel Base (4\")",qty:0,unit:"sq ft",unitCost:1.8}]);
  const removeMat = i => setMats(mats.filter((_,idx)=>idx!==i));
  const updateMat = (i,k,v) => setMats(mats.map((r,idx)=>idx===i?{...r,[k]:v}:r));
  const pickPreset = (i,name) => {
    const p=MATERIAL_PRESETS[name];
    if(p) setMats(mats.map((r,idx)=>idx===i?{...r,name,unit:p.unit,unitCost:p.cost}:r));
  };
  const totalMats = mats.reduce((s,r)=>s+r.qty*r.unitCost,0);

  // ── VARIABLE JOB COSTS ──
  const [variable, setVariable] = useState([
    {label:"Fuel for this job",    amount:0},
    {label:"Dump / Disposal fees", amount:0},
    {label:"Permit fees",          amount:0},
    {label:"Subcontractor",        amount:0},
  ]);
  const addVar = () => setVariable([...variable,{label:"",amount:0}]);
  const removeVar = i => setVariable(variable.filter((_,idx)=>idx!==i));
  const updateVar = (i,k,v) => setVariable(variable.map((r,idx)=>idx===i?{...r,[k]:v}:r));
  const totalVariable = variable.reduce((s,r)=>s+r.amount,0);

  // ── MARGIN ──
  const [margin, setMargin] = useState(30);

  // ── CALCULATIONS ──
  const directCosts   = totalLabor + totalEquip + totalMats;
  const totalCost     = directCosts + totalVariable + fixedPerJob;
  const floorBid      = totalCost * 1.05;
  const targetBid     = totalCost > 0 ? totalCost / (1 - margin/100) : 0;
  const premiumBid    = totalCost > 0 ? totalCost / (1 - Math.min(margin+15,55)/100) : 0;
  const costPerSqft   = job.sqft > 0 ? totalCost / job.sqft : 0;
  const targetPerSqft = job.sqft > 0 ? targetBid / job.sqft : 0;

  // ── STYLES ──
  const tabBtn = (active) => ({
    flex:1, padding:"12px 8px", background:"transparent",
    border:"none", borderBottom:`2px solid ${active?"#b8963a":"transparent"}`,
    color: active ? "#b8963a" : "#4a6070", fontSize:12, fontWeight:800,
    letterSpacing:"0.06em", cursor:"pointer", fontFamily:"inherit",
    textTransform:"uppercase", transition:"all 0.2s",
  });

  const BidTile = ({label,amount,tag,highlight,note}) => (
    <div style={{
      flex:1, background: highlight?"#0e1e0e":"#0b1520",
      border:`1px solid ${highlight?"#3a6a3a":"#192838"}`,
      borderRadius:12, padding:"18px 16px", textAlign:"center",
      boxShadow: highlight?"0 0 24px rgba(50,120,50,0.15)":"none",
    }}>
      {tag && <div style={{fontSize:9,fontWeight:900,letterSpacing:"0.15em",
        textTransform:"uppercase",color:highlight?"#5aaa5a":"#6b7f8f",marginBottom:8}}>{tag}</div>}
      <div style={{fontSize:11,color:"#6b7f8f",letterSpacing:"0.07em",
        textTransform:"uppercase",marginBottom:6,fontWeight:700}}>{label}</div>
      <div style={{fontSize:26,fontWeight:900,color:highlight?"#6dcc6d":"#b8963a",
        letterSpacing:"-0.02em",fontFamily:"Georgia,serif"}}>{fmt(amount)}</div>
      {note && <div style={{fontSize:11,color:"#4a6070",marginTop:7}}>{note}</div>}
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:"#080e16",color:"#ccdde8",
      fontFamily:"'DM Sans','Segoe UI',sans-serif"}}>

      {/* ── HEADER ── */}
      <div style={{background:"linear-gradient(135deg,#0c1820,#0f2030)",
        borderBottom:"1px solid #192838",padding:"24px 28px 0"}}>
        <div style={{maxWidth:900,margin:"0 auto"}}>
          <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:6}}>
            <img
              src="/SiteVERITASLogo.png"
              alt="Site Veritas"
              style={{width:48,height:48,borderRadius:"50%",objectFit:"cover",
                border:"1px solid rgba(184,150,58,0.3)"}}
            />
            <div>
              <div style={{fontSize:10,fontWeight:900,letterSpacing:"0.2em",
                color:"#b8963a",textTransform:"uppercase",marginBottom:4}}>
                Site Veritas · Contractor Tools
              </div>
              <h1 style={{margin:0,fontSize:24,fontWeight:900,
                color:"#eef4fa",letterSpacing:"-0.03em"}}>
                VeritasBid Calculator
              </h1>
            </div>
          </div>
          {/* tabs */}
          <div style={{display:"flex",gap:0}}>
            {TABS.map((t,i)=>(
              <button key={i} onClick={()=>setTab(i)} style={tabBtn(tab===i)}>{t}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{maxWidth:900,margin:"0 auto",padding:"28px 20px 60px"}}>

        {/* ════════════ TAB 0 — BUSINESS SETUP ════════════ */}
        {tab===0 && (
          <div>
            <div style={{background:"#0e1f10",border:"1px solid #2a4a2a",borderRadius:10,
              padding:"14px 18px",marginBottom:24,fontSize:13,color:"#7acc7a",lineHeight:1.6}}>
              <strong>Set this up once.</strong> These are your monthly fixed costs — insurance, truck payment, phone, etc.
              The tool will automatically split them across your jobs so every bid recovers the right share.
            </div>

            <Card style={{marginBottom:20}}>
              <SectionHead icon="📅" title="Monthly Business Volume" />
              <div style={{maxWidth:320}}>
                <Field label="How many jobs do you complete per month (avg)?">
                  <Inp value={monthlyJobs} onChange={setMonthlyJobs} min={1} step={1} />
                </Field>
              </div>
            </Card>

            <Card>
              <SectionHead icon="🏢" title="Monthly Fixed Costs"
                right={<span style={{fontSize:13,color:"#b8963a",fontWeight:800}}>{fmt(totalMonthlyFixed)}/mo</span>} />

              {/* column headers */}
              <div style={{...grid("1fr 160px 36px"),marginBottom:8}}>
                <Label>Cost Category</Label>
                <Label>Monthly Amount ($)</Label>
                <div/>
              </div>

              {fixed.map((r,i)=>(
                <div key={i} style={{...grid("1fr 160px 36px"),marginBottom:10}}>
                  <Txt value={r.label} onChange={v=>updateFixed(i,"label",v)} placeholder="e.g. Health Insurance" />
                  <Inp value={r.monthly} onChange={v=>updateFixed(i,"monthly",v)} step={10} />
                  <RemBtn onClick={()=>removeFixed(i)} />
                </div>
              ))}

              <div style={{display:"flex",justifyContent:"space-between",
                alignItems:"center",marginTop:8}}>
                <AddBtn onClick={addFixed} label="Add Cost" />
                <div style={{fontSize:12,color:"#6b7f8f"}}>
                  {fmt(totalMonthlyFixed)}/mo ÷ {monthlyJobs} jobs =&nbsp;
                  <strong style={{color:"#b8963a"}}>{fmt(fixedPerJob)} per job</strong>
                </div>
              </div>

              {/* per-job breakdown pills */}
              {fixed.filter(r=>r.monthly>0).length > 0 && (
                <div style={{marginTop:20,borderTop:"1px solid #192838",paddingTop:16}}>
                  <Label>Per-Job Cost Breakdown</Label>
                  <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:8}}>
                    {fixed.filter(r=>r.monthly>0).map((r,i)=>(
                      <div key={i} style={{background:"#0b1520",border:"1px solid #192838",
                        borderRadius:20,padding:"5px 12px",fontSize:11,color:"#8aaabb"}}>
                        {r.label || "Unnamed"}: <strong style={{color:"#b8963a"}}>{fmt(r.monthly/monthlyJobs)}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            <div style={{marginTop:20,textAlign:"center"}}>
              <button onClick={()=>setTab(1)} style={{
                background:"#b8963a",border:"none",borderRadius:8,color:"#080e16",
                padding:"12px 32px",fontSize:13,fontWeight:900,letterSpacing:"0.08em",
                cursor:"pointer",fontFamily:"inherit",textTransform:"uppercase",
              }}>Setup Complete → Build a Job</button>
            </div>
          </div>
        )}

        {/* ════════════ TAB 1 — JOB BUILDER ════════════ */}
        {tab===1 && (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>

            {/* LEFT */}
            <div>
              {/* Job Info */}
              <Card style={{marginBottom:20}}>
                <SectionHead icon="📋" title="Job Details" />
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                  <Field label="Client Name"><Txt value={job.client} onChange={v=>setJob({...job,client:v})} placeholder="ABC Property" /></Field>
                  <Field label="Job Type"><Sel value={job.type} onChange={v=>setJob({...job,type:v})} options={JOB_TYPES} /></Field>
                  <Field label="Square Footage"><Inp value={job.sqft} onChange={v=>setJob({...job,sqft:v})} /></Field>
                  <Field label="Job Description"><Txt value={job.name} onChange={v=>setJob({...job,name:v})} placeholder="Rear patio + steps" /></Field>
                </div>
              </Card>

              {/* Labor */}
              <Card style={{marginBottom:20}}>
                <SectionHead icon="👷" title="Labor"
                  right={<span style={{fontSize:13,color:"#b8963a",fontWeight:800}}>{fmt(totalLabor)}</span>} />
                {labor.map((r,i)=>(
                  <div key={i} style={{...grid("2fr 90px 1fr 1fr 36px"),marginBottom:10}}>
                    <Field label={i===0?"Role":""}>
                      <Sel value={r.role}
                        onChange={v=>setLabor(labor.map((row,idx)=>idx===i?{...row,role:v,rate:LABOR_RATES[v]}:row))}
                        options={Object.keys(LABOR_RATES)} />
                    </Field>
                    <Field label={i===0?"$/hr":""}>
                      <Inp value={r.rate} onChange={v=>updateLabor(i,"rate",v)} min={0} step={1} />
                    </Field>
                    <Field label={i===0?"Hours":""}>
                      <Inp value={r.hours} onChange={v=>updateLabor(i,"hours",v)} min={0.5} step={0.5} />
                    </Field>
                    <Field label={i===0?"Workers":""}>
                      <Inp value={r.workers} onChange={v=>updateLabor(i,"workers",v)} min={1} />
                    </Field>
                    <div style={{display:"flex",alignItems:"flex-end",paddingBottom:i===0?18:0}}>
                      <RemBtn onClick={()=>removeLabor(i)} />
                    </div>
                  </div>
                ))}
                <AddBtn onClick={addLabor} label="Add Role" />
              </Card>

              {/* Equipment */}
              <Card>
                <SectionHead icon="🚜" title="Equipment / Rentals"
                  right={<span style={{fontSize:13,color:"#b8963a",fontWeight:800}}>{fmt(totalEquip)}</span>} />
                {equip.map((r,i)=>(
                  <div key={i} style={{...grid("2fr 90px 1fr 36px"),marginBottom:10}}>
                    <Field label={i===0?"Equipment":""}>
                      <Sel value={r.item}
                        onChange={v=>setEquip(equip.map((row,idx)=>idx===i?{...row,item:v,rate:EQUIPMENT_RATES[v]}:row))}
                        options={Object.keys(EQUIPMENT_RATES)} />
                    </Field>
                    <Field label={i===0?"$/day":""}>
                      <Inp value={r.rate} onChange={v=>updateEquip(i,"rate",v)} min={0} step={1} />
                    </Field>
                    <Field label={i===0?"Days":""}>
                      <Inp value={r.days} onChange={v=>updateEquip(i,"days",v)} min={0.5} step={0.5} />
                    </Field>
                    <div style={{display:"flex",alignItems:"flex-end",paddingBottom:i===0?18:0}}>
                      <RemBtn onClick={()=>removeEquip(i)} />
                    </div>
                  </div>
                ))}
                <AddBtn onClick={addEquip} label="Add Equipment" />
              </Card>
            </div>

            {/* RIGHT */}
            <div>
              {/* Materials */}
              <Card style={{marginBottom:20}}>
                <SectionHead icon="🧱" title="Materials"
                  right={<span style={{fontSize:13,color:"#b8963a",fontWeight:800}}>{fmt(totalMats)}</span>} />
                {mats.map((r,i)=>(
                  <div key={i} style={{marginBottom:14,paddingBottom:14,
                    borderBottom:"1px solid #192838"}}>
                    <div style={{...grid("1fr 36px"),marginBottom:8}}>
                      <Field label={i===0?"Material":""}>
                        <Sel value={r.name} onChange={v=>pickPreset(i,v)} options={Object.keys(MATERIAL_PRESETS)} />
                      </Field>
                      <div style={{display:"flex",alignItems:"flex-end",paddingBottom:i===0?18:0}}>
                        <RemBtn onClick={()=>removeMat(i)} />
                      </div>
                    </div>
                    <div style={grid("1fr 1fr 1fr")}>
                      <Field label="Qty"><Inp value={r.qty} onChange={v=>updateMat(i,"qty",v)} /></Field>
                      <Field label={`Unit Cost ($/${r.unit})`}><Inp value={r.unitCost} onChange={v=>updateMat(i,"unitCost",v)} step={0.01} /></Field>
                      <Field label="Line Total">
                        <div style={{...inputBase,background:"#060d14",color:"#b8963a",
                          fontWeight:800,cursor:"default"}}>{fmt(r.qty*r.unitCost)}</div>
                      </Field>
                    </div>
                  </div>
                ))}
                <AddBtn onClick={addMat} label="Add Material" />
              </Card>

              {/* Variable costs */}
              <Card style={{marginBottom:20}}>
                <SectionHead icon="🔧" title="Variable Job Costs"
                  right={<span style={{fontSize:13,color:"#b8963a",fontWeight:800}}>{fmt(totalVariable)}</span>} />
                <div style={{background:"#0a1a0a",border:"1px solid #1a3a1a",borderRadius:8,
                  padding:"10px 14px",marginBottom:14,fontSize:12,color:"#5aaa5a"}}>
                  These costs only happen because of this specific job.
                </div>
                {variable.map((r,i)=>(
                  <div key={i} style={{...grid("2fr 1fr 36px"),marginBottom:10}}>
                    <Field label={i===0?"What is it?":""}>
                      <Txt value={r.label} onChange={v=>updateVar(i,"label",v)} placeholder="e.g. Concrete pump rental" />
                    </Field>
                    <Field label={i===0?"Amount ($)":""}>
                      <Inp value={r.amount} onChange={v=>updateVar(i,"amount",v)} step={25} />
                    </Field>
                    <div style={{display:"flex",alignItems:"flex-end",paddingBottom:i===0?18:0}}>
                      <RemBtn onClick={()=>removeVar(i)} />
                    </div>
                  </div>
                ))}
                <AddBtn onClick={addVar} label="Add Cost" />
              </Card>

              {/* Margin */}
              <Card>
                <SectionHead icon="📊" title="Profit Margin" />
                <Field label={`Target Margin: ${margin}%`}>
                  <input type="range" min={5} max={55} step={1} value={margin}
                    onChange={e=>setMargin(parseInt(e.target.value))}
                    style={{width:"100%",accentColor:"#b8963a",cursor:"pointer",marginBottom:8}} />
                </Field>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:11}}>
                  {[{v:20,l:"Risky"},{v:28,l:"OK"},{v:35,l:"Healthy"},{v:45,l:"Premium"}].map(m=>(
                    <span key={m.v} style={{
                      color: margin>=m.v ? "#b8963a" : "#3a5060",
                      fontWeight: margin>=m.v ? 800 : 400,
                    }}>{m.l} ({m.v}%)</span>
                  ))}
                </div>
                <div style={{marginTop:12,fontSize:13,textAlign:"center",
                  color: margin<20?"#cc6060":margin<28?"#ccaa40":"#60cc80",fontWeight:700}}>
                  {margin<20?"⚠️ Too low — a small overrun wipes your profit"
                    :margin<28?"△ Acceptable but tight"
                    :"✓ Healthy margin"}
                </div>
              </Card>
            </div>

            <div style={{gridColumn:"span 2",textAlign:"center",marginTop:8}}>
              <button onClick={()=>setTab(2)} style={{
                background: totalCost>0?"#b8963a":"#1a2a3a",
                border:"none",borderRadius:8,
                color: totalCost>0?"#080e16":"#4a6070",
                padding:"12px 32px",fontSize:13,fontWeight:900,
                letterSpacing:"0.08em",cursor:"pointer",
                fontFamily:"inherit",textTransform:"uppercase",
              }}>
                {totalCost>0?"See My Bid Numbers →":"Enter job details above first"}
              </button>
            </div>
          </div>
        )}

        {/* ════════════ TAB 2 — BID RESULTS ════════════ */}
        {tab===2 && (
          <div>
            {totalCost===0 ? (
              <div style={{textAlign:"center",padding:"60px 20px",color:"#3a5060",fontSize:14}}>
                Go to Job Builder tab and enter your job details first.
              </div>
            ) : (
              <>
                {/* Cost breakdown */}
                <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12,marginBottom:24}}>
                  {[
                    {label:"Labor",          val:totalLabor},
                    {label:"Equipment",       val:totalEquip},
                    {label:"Materials",       val:totalMats},
                    {label:"Job Expenses",    val:totalVariable},
                    {label:"Fixed Overhead",  val:fixedPerJob},
                  ].map(c=>(
                    <div key={c.label} style={{background:"#0b1520",border:"1px solid #192838",
                      borderRadius:10,padding:"14px 12px",textAlign:"center"}}>
                      <div style={{fontSize:10,color:"#4a6070",letterSpacing:"0.08em",
                        textTransform:"uppercase",marginBottom:6,fontWeight:700}}>{c.label}</div>
                      <div style={{fontSize:15,fontWeight:800,color:"#ccdde8"}}>{fmt(c.val)}</div>
                      <div style={{fontSize:11,color:"#3a5060",marginTop:3}}>{pct(c.val,totalCost)}%</div>
                    </div>
                  ))}
                </div>

                {/* Total cost bar */}
                <Card style={{marginBottom:24}}>
                  <div style={{display:"flex",justifyContent:"space-between",
                    alignItems:"center",marginBottom:14}}>
                    <span style={{fontSize:11,fontWeight:900,letterSpacing:"0.1em",
                      textTransform:"uppercase",color:"#6b7f8f"}}>Total Job Cost</span>
                    <span style={{fontSize:22,fontWeight:900,color:"#b8963a",
                      fontFamily:"Georgia,serif"}}>{fmt(totalCost)}</span>
                  </div>
                  {/* stacked bar */}
                  <div style={{height:12,borderRadius:6,overflow:"hidden",display:"flex"}}>
                    {[
                      {val:totalLabor,   color:"#4a7aa0"},
                      {val:totalEquip,   color:"#7a5aa0"},
                      {val:totalMats,    color:"#4a9a6a"},
                      {val:totalVariable,color:"#a07a3a"},
                      {val:fixedPerJob,  color:"#a04a4a"},
                    ].map((s,i)=>(
                      <div key={i} style={{
                        width:`${pct(s.val,totalCost)}%`,
                        background:s.color,transition:"width 0.4s",
                      }} />
                    ))}
                  </div>
                  <div style={{display:"flex",gap:16,marginTop:10,flexWrap:"wrap"}}>
                    {[
                      {color:"#4a7aa0",label:"Labor"},
                      {color:"#7a5aa0",label:"Equipment"},
                      {color:"#4a9a6a",label:"Materials"},
                      {color:"#a07a3a",label:"Job Expenses"},
                      {color:"#a04a4a",label:"Fixed Overhead"},
                    ].map(l=>(
                      <div key={l.label} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"#6b7f8f"}}>
                        <div style={{width:8,height:8,borderRadius:2,background:l.color}} />
                        {l.label}
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Bid tiers — Floor + Target always visible, Premium locked behind email */}
                <div style={{display:"flex",gap:14,marginBottom:20}}>
                  <BidTile label="Floor — Never Go Below" amount={floorBid}
                    tag="Absolute Minimum" note="5% above total cost. Zero profit." />
                  <BidTile label={`Target Bid (${margin}% margin)`} amount={targetBid}
                    tag="⭐ Recommended Bid" highlight note="This is the number to submit." />

                  {/* Premium tile — locked until email submitted */}
                  {submitted ? (
                    <BidTile label={`Premium (${Math.min(margin+15,55)}% margin)`} amount={premiumBid}
                      tag="🔓 Unlocked" note="Complex scope or difficult access." />
                  ) : (
                    <div style={{flex:1,background:"#0c1420",border:"1px dashed #2a3a4a",
                      borderRadius:12,padding:"18px 16px",textAlign:"center",
                      display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",gap:10}}>
                      <div style={{fontSize:9,fontWeight:900,letterSpacing:"0.15em",
                        textTransform:"uppercase",color:"#4a6070"}}>Premium Tier</div>
                      <div style={{fontSize:32}}>🔒</div>
                      <div style={{fontSize:12,color:"#4a6a7a",lineHeight:1.5,maxWidth:160}}>
                        Enter your info below to unlock your premium bid + free website audit
                      </div>
                    </div>
                  )}
                </div>

                {/* Per sq ft — only show after unlock */}
                {submitted && job.sqft > 0 && (
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20}}>
                    {[
                      {label:"Your Cost / sq ft",   val:costPerSqft},
                      {label:"Target Bid / sq ft",  val:targetPerSqft},
                      {label:"Premium Bid / sq ft", val:premiumBid/job.sqft},
                    ].map(c=>(
                      <div key={c.label} style={{background:"#0b1e10",border:"1px solid #1a3a20",
                        borderRadius:10,padding:"14px",textAlign:"center"}}>
                        <div style={{fontSize:10,color:"#4a8a5a",letterSpacing:"0.08em",
                          textTransform:"uppercase",marginBottom:6,fontWeight:700}}>{c.label}</div>
                        <div style={{fontSize:18,fontWeight:900,color:"#6dcc7a"}}>
                          {fmt(c.val)}<span style={{fontSize:11,fontWeight:400}}>/sf</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Intelligence flags — only show after unlock */}
                {submitted && (
                  <Card style={{marginBottom:24}}>
                    <SectionHead icon="🧠" title="Bid Intelligence" />
                    <div style={{display:"flex",flexDirection:"column",gap:10}}>
                      <div style={{background:"#0b1e0b",border:"1px solid #2a4a2a",borderRadius:8,
                        padding:"12px 16px",fontSize:13,color:"#8acc8a",lineHeight:1.6}}>
                        ✅ Your cost floor is <strong style={{color:"#b8963a"}}>{fmt(floorBid)}</strong>. If a competitor bids significantly lower, they're cutting corners, uninsured, or losing money.
                      </div>
                      {margin<20 && (
                        <div style={{background:"#1e0b0b",border:"1px solid #5a2020",borderRadius:8,
                          padding:"12px 16px",fontSize:13,color:"#cc8080",lineHeight:1.6}}>
                          ⚠️ <strong>Low margin warning:</strong> At {margin}%, one unexpected delay or material price increase could put you in the red. Raise to at least 25%.
                        </div>
                      )}
                      {pct(totalLabor,totalCost) > 50 && (
                        <div style={{background:"#1a1a0a",border:"1px solid #4a4a20",borderRadius:8,
                          padding:"12px 16px",fontSize:13,color:"#cccc80",lineHeight:1.6}}>
                          📋 <strong>Labor-heavy job ({pct(totalLabor,totalCost)}% of cost):</strong> Build in contingency for overtime, weather delays, or crew issues. Consider adding a 10% buffer.
                        </div>
                      )}
                      {pct(totalMats,totalCost) > 50 && (
                        <div style={{background:"#0a1a1a",border:"1px solid #204a4a",borderRadius:8,
                          padding:"12px 16px",fontSize:13,color:"#80cccc",lineHeight:1.6}}>
                          🧱 <strong>Material-heavy job ({pct(totalMats,totalCost)}% of cost):</strong> Get supplier quotes in writing before submitting this bid. Material prices can shift.
                        </div>
                      )}
                      {fixedPerJob > 0 && (
                        <div style={{background:"#0f0f1e",border:"1px solid #2a2a5a",borderRadius:8,
                          padding:"12px 16px",fontSize:13,color:"#9090dd",lineHeight:1.6}}>
                          🏢 <strong>Fixed overhead included:</strong> {fmt(fixedPerJob)} of your business overhead is already baked into this bid based on {monthlyJobs} jobs/month.
                        </div>
                      )}
                    </div>
                  </Card>
                )}

                {/* ── EMAIL CAPTURE / UNLOCK ── */}
                <div style={{
                  marginTop: submitted ? 0 : 8,
                  background:"linear-gradient(135deg,#0e1e2e,#0a1a10)",
                  border:`1px solid ${submitted?"#2a4a2a":"#b8963a"}`,
                  borderRadius:14,
                  padding:"32px 28px",
                  textAlign:"center",
                }}>
                  {!submitted ? (
                    <>
                      <div style={{fontSize:10,fontWeight:900,letterSpacing:"0.2em",
                        textTransform:"uppercase",color:"#b8963a",marginBottom:10}}>
                        Unlock Your Full Results
                      </div>
                      <div style={{fontSize:20,fontWeight:900,color:"#eef4fa",
                        letterSpacing:"-0.02em",marginBottom:8}}>
                        Get your premium bid + free website audit
                      </div>
                      <div style={{fontSize:13,color:"#5a8a6a",lineHeight:1.6,
                        maxWidth:440,margin:"0 auto 24px"}}>
                        Unlock your premium tier bid, per square foot breakdown, and bid intelligence report — plus we'll send you a free audit of how your business looks online compared to your competitors.
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",
                        gap:12,maxWidth:560,margin:"0 auto 16px"}}>
                        {[
                          {key:"firstName",    label:"First Name",    placeholder:"John",             type:"text",  inputMode:"text"},
                          {key:"businessName", label:"Business Name", placeholder:"ABC Hardscape",    type:"text",  inputMode:"text"},
                          {key:"email",        label:"Email Address", placeholder:"john@example.com", type:"email", inputMode:"email"},
                          {key:"phone",        label:"Phone Number",  placeholder:"(555) 123-4567",   type:"tel",   inputMode:"tel"},
                        ].map(f=>(
                          <div key={f.key} style={{textAlign:"left"}}>
                            <Label>{f.label}</Label>
                            <input
                              type={f.type}
                              inputMode={f.inputMode}
                              placeholder={f.placeholder}
                              value={lead[f.key]}
                              onChange={e=>{
                                setLead({...lead,[f.key]:e.target.value});
                                if(f.key==="email") setEmailError("");
                                if(f.key==="phone") setPhoneError("");
                              }}
                              style={{
                                ...inputBase, background:"#080e16",
                                ...(f.key==="email"&&emailError ? {borderColor:"#cc4444"} : {}),
                                ...(f.key==="phone"&&phoneError ? {borderColor:"#cc4444"} : {}),
                              }}
                            />
                            {f.key==="email"&&emailError&&(
                              <div style={{fontSize:11,color:"#cc6060",marginTop:5,lineHeight:1.4}}>{emailError}</div>
                            )}
                            {f.key==="phone"&&phoneError&&(
                              <div style={{fontSize:11,color:"#cc6060",marginTop:5,lineHeight:1.4}}>{phoneError}</div>
                            )}
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={handleLeadSubmit}
                        disabled={submitting||!lead.firstName||!lead.businessName||!isValidEmail(lead.email)||!isValidPhone(lead.phone)}
                        style={{
                          background: (lead.firstName&&lead.businessName&&isValidEmail(lead.email)&&isValidPhone(lead.phone))?"#b8963a":"#1a2a2a",
                          border:"none",borderRadius:8,
                          color:(lead.firstName&&lead.businessName&&isValidEmail(lead.email)&&isValidPhone(lead.phone))?"#080e16":"#3a5a4a",
                          padding:"13px 36px",fontSize:13,fontWeight:900,
                          letterSpacing:"0.08em",cursor:"pointer",
                          fontFamily:"inherit",textTransform:"uppercase",
                          transition:"all 0.2s",
                        }}>
                        {submitting ? "Unlocking…" : "🔓 Unlock My Full Results →"}
                      </button>
                      <div style={{fontSize:11,color:"#3a5a4a",marginTop:12}}>
                        No spam. No sales calls. Free audit included.
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{fontSize:36,marginBottom:12}}>{"\u{1F513}"}</div>
                      <div style={{fontSize:20,fontWeight:900,color:"#6dcc7a",
                        letterSpacing:"-0.02em",marginBottom:8}}>
                        Full results unlocked, {lead.firstName}!
                      </div>
                      <button
                        onClick={() => {
                          localStorage.removeItem("veritasbid_contractor");
                          setLead({ firstName: "", businessName: "", email: "", phone: "" });
                          setSubmitted(false);
                        }}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#b8963a",
                          fontSize: "12px",
                          textDecoration: "underline",
                          cursor: "pointer",
                          padding: "4px 0",
                          marginTop: "4px",
                        }}
                      >
                        Not {lead.firstName}? Switch contractor
                      </button>
                      <div style={{fontSize:13,color:"#5a8a6a",lineHeight:1.7,maxWidth:400,margin:"0 auto"}}>
                        Your premium bid, per square foot breakdown, and bid intelligence are now visible above.
                      </div>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"center",
                        gap:10,marginTop:20,paddingTop:20,borderTop:"1px solid #1a3a2a"}}>
                        <img
                          src="/SiteVERITASLogo.png"
                          alt="Site Veritas"
                          style={{width:32,height:32,borderRadius:"50%",objectFit:"cover",
                            border:"1px solid rgba(184,150,58,0.3)"}}
                        />
                        <div style={{fontSize:11,color:"#4a6a5a",fontWeight:700,
                          letterSpacing:"0.08em",textTransform:"uppercase"}}>
                          Powered by Site Veritas
                        </div>
                      </div>
                    </>
                  )}
                </div>

              </>
            )}
          </div>
        )}
      </div>

      <footer style={{
        marginTop: "48px",
        padding: "24px 16px",
        borderTop: "1px solid rgba(184, 150, 58, 0.2)",
        textAlign: "center",
        fontSize: "12px",
        color: "#7a8a8a",
        lineHeight: "1.6",
      }}>
        <div style={{ marginBottom: "8px" }}>
          <a href="/privacy" style={{ color: "#b8963a", textDecoration: "none", margin: "0 8px" }}>
            Privacy Policy
          </a>
          <span style={{ color: "#3a5a4a" }}>|</span>
          <a href="/terms" style={{ color: "#b8963a", textDecoration: "none", margin: "0 8px" }}>
            Terms of Service
          </a>
        </div>
        <div>
          © 2026 VeritasBid · Designed by{" "}
          <a href="https://siteveritas.com" target="_blank" rel="noopener noreferrer"
            style={{ color: "#b8963a", textDecoration: "none" }}>
            Site Veritas
          </a>
        </div>
      </footer>
    </div>
  );
}
