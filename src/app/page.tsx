"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Material = "PLA" | "PETG" | "TPU";
type Quality = "draft" | "standard" | "fine";
type FieldErrors = Partial<
  Record<"customerName" | "customerEmail" | "notes" | "file", string>
>;


/* ─────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────── */

const ITEMS = [
  {
    icon: "⬡",
    title: "Replacement Parts",
    desc: "Broken knobs, clips, covers, latches — printed same or next day to exact specs.",
  },
  {
    icon: "◫",
    title: "Mounts & Brackets",
    desc: "TV, router, camera, sensor mounts. Custom dimensions from your measurements.",
  },
  {
    icon: "⌀",
    title: "Adapters & Couplers",
    desc: "Hose adapters, odd-size converters, thread reducers. We'll make it fit.",
  },
  {
    icon: "▦",
    title: "Fixtures & Jigs",
    desc: "Shop fixtures, alignment jigs, signage mounts, organizers, cable guides.",
  },
  {
    icon: "◈",
    title: "Prototypes",
    desc: "Quick functional iterations for local businesses. Test before you invest.",
  },
  {
    icon: "✦",
    title: "Custom Requests",
    desc: "No STL? Send a photo and describe what you need — we'll model and quote.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Send us your part",
    body: "Upload an STL, drop a photo, or just describe it in plain English. Dimensions help but aren't required.",
  },
  {
    n: "02",
    title: "Receive your quote",
    body: "We respond with a firm price and turnaround time. No surprises, no hidden fees. You approve before anything is charged.",
  },
  {
    n: "03",
    title: "Pick up or we ship",
    body: "We notify you when it's ready. Grab it locally in North NJ or we ship it to you. Most parts done in 24–72 hours.",
  },
];

const MATERIALS = [
  {
    name: "PLA",
    tags: ["Default", "Precise", "Affordable"],
    desc: "Best for indoor parts, clips, covers, and anything where dimensional accuracy matters. Fastest to print.",
    bestFor: "Replacement clips, covers, indoor mounts, decorative parts",
    specs: [
      ["Tolerance", "±0.2 mm"],
      ["Max temp", "60°C"],
      ["Layer height", "0.1–0.3 mm"],
    ],
  },
  {
    name: "PETG",
    tags: ["Structural", "Functional", "Outdoor-ok"],
    desc: "Better for brackets, mounts, and anything exposed to heat, moisture, or mechanical stress. Slightly more flexible than PLA.",
    bestFor: "Brackets, outdoor mounts, parts that take impact or heat",
    specs: [
      ["Tolerance", "±0.3 mm"],
      ["Max temp", "80°C"],
      ["Layer height", "0.1–0.3 mm"],
    ],
  },
  {
    name: "TPU",
    tags: ["Flexible", "Rubber-like", "Impact-resistant"],
    desc: "For gaskets, bumpers, grip sleeves, and any part that needs to flex or absorb shock without breaking.",
    bestFor: "Bumpers, gaskets, grips, anything that needs to flex",
    specs: [
      ["Shore", "95A"],
      ["Elongation", "~580%"],
      ["Best for", "Flexible / Protective"],
    ],
  },
];

const PRICING = [
  {
    label: "Local Pickup",
    price: "Firm quote",
    note: "Pickup in North NJ. Address provided after quote approval.",
    examples: "Most small parts: same/next day available",
    highlight: false,
  },
  {
    label: "Shipped Order",
    price: "Firm quote",
    note: "Packaging and postage included. Ships nationwide.",
    examples: "Typical turnaround: 24–72 hours",
    highlight: true,
  },
  {
    label: "Rush",
    price: "Available",
    note: "Same-day / next-day when our queue allows.",
    examples: "We confirm availability in your quote",
    highlight: false,
  },
  {
    label: "Design + Print",
    price: "Quoted first",
    note: "We model the file if you don't have one.",
    examples: "Send a photo / sketch / dimensions",
    highlight: false,
  },
];

const FAQS = [
  {
    q: "Do you design files from scratch?",
    a: "Yes. If you don't have an STL, we can model it from a photo, sketch, or description. We always quote before any work begins.",
  },
  {
    q: "Do you ship outside NJ?",
    a: "Yes — we ship nationwide. Pickup is available in North NJ.",
  },
  {
    q: "What if the part doesn't fit?",
    a: "We offer one free adjustment on fit issues when dimensions were provided upfront. We take accuracy seriously and will make it right.",
  },
  {
    q: "How fast is same-day or rush?",
    a: "Same-day and next-day are available when our queue allows. Tell us your deadline — we confirm availability in your quote.",
  },
  {
    q: "What file types do you accept?",
    a: "STL is preferred. We also accept STEP, OBJ, and 3MF. No file? Send a photo and describe what you need.",
  },
  {
    q: "Which material should I choose?",
    a: "PLA for most indoor parts — precise and affordable. PETG for anything structural, functional, or exposed to heat and moisture. TPU for flexible or impact-absorbing parts. Not sure? Describe the use case and we'll recommend.",
  },
  {
    q: "What are your payment terms?",
    a: "You pay only after approving your quote. We use Stripe — all major credit and debit cards accepted. Nothing is charged until you confirm.",
  },
];

const PRINTS = [
  { label: "Appliance Door Clip", material: "PLA" },
  { label: "Router Wall Mount", material: "PETG" },
  { label: "Garden Hose Adapter", material: "PLA" },
  { label: "Cable Management Clip", material: "TPU" },
  { label: "Security Camera Bracket", material: "PETG" },
  { label: "Replacement Drawer Knob", material: "PLA" },
];

const TESTIMONIALS = [
  {
    text: "Ordered a replacement clip for my dishwasher rack. Had the part in my hands the next day. Fits perfectly.",
    name: "Mike R.",
    location: "Parsippany, NJ",
  },
  {
    text: "Needed a custom mount for my outdoor camera. Sent a photo, got a quote in an hour, picked it up two days later. Solid work.",
    name: "Dana S.",
    location: "Montclair, NJ",
  },
  {
    text: "Fast, local, and the part actually fits. Beats waiting two weeks for something from overseas that may or may not be right.",
    name: "Tom K.",
    location: "Wayne, NJ",
  },
];

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const ACCEPTED_EXT = /\.(stl|step|obj|3mf)$/i;

/* ─────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────── */

export default function Home() {
  // form state
  const [file, setFile] = useState<File | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerCity, setCustomerCity] = useState("");
  const [material, setMaterial] = useState<Material>("PLA");
  const [color, setColor] = useState("Black");
  const [quality, setQuality] = useState<Quality>("standard");
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [deadline, setDeadline] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [globalErr, setGlobalErr] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const formRef = useRef<HTMLDivElement>(null);
  const scrollToForm = () =>
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const hasFile = !!file;

  function clearErr(field: keyof FieldErrors) {
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null;

    if (f) {
      if (f.size > MAX_FILE_BYTES) {
        setErrors((p) => ({ ...p, file: "File must be under 25 MB." }));
        setFile(null);
        return;
      }
      if (!ACCEPTED_EXT.test(f.name)) {
        setErrors((p) => ({ ...p, file: "Accepted: .stl .step .obj .3mf" }));
        setFile(null);
        return;
      }
    }
    clearErr("file");
    setFile(f);
  }

  function validate(): boolean {
    const e: FieldErrors = {};
    if (!customerName.trim()) e.customerName = "Name is required.";
    if (!customerEmail.includes("@"))
      e.customerEmail = "Enter a valid email address.";
    if (!hasFile && notes.trim().length < 10)
      e.notes = "Please describe what you need — or attach a file above.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function uploadStlToSupabase(f: File) {
    const safeName = f.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `orders/${Date.now()}_${crypto.randomUUID()}_${safeName}`;

    const signRes = await fetch("/api/storage/sign-upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filePath: path }),
    });

    if (!signRes.ok) throw new Error("Could not get upload URL.");

    const { signedUrl } = await signRes.json();

    const uploadRes = await fetch(signedUrl, {
      method: "PUT",
      body: f,
      headers: { "Content-Type": f.type || "application/octet-stream" },
    });

    if (!uploadRes.ok) throw new Error("Upload failed.");

    return { path, fileName: f.name };
  }

  async function submitQuote() {
    if (honeypot) return;
    setGlobalErr(null);
    if (!validate()) return;

    setLoading(true);
    try {
      // Upload file first if one is attached, then include the path in the quote
      let filePath: string | null = null;
      let fileName: string | null = null;
      if (file) {
        const uploaded = await uploadStlToSupabase(file);
        filePath = uploaded.path;
        fileName = uploaded.fileName;
      }

      const res = await fetch("/api/quote-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          customerEmail,
          customerPhone,
          customerCity,
          material,
          color,
          quality,
          quantity,
          notes,
          deadline,
          ...(filePath ? { filePath, fileName } : {}),
        }),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch {
        data = { error: "Server error." };
      }

      if (!res.ok) throw new Error(data?.error || "Submission failed.");
      setSubmitted(true);
    } catch (e: any) {
      setGlobalErr(e.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePrimarySubmit() {
    await submitQuote();
  }

  function resetForm() {
    setFile(null);
    setCustomerName("");
    setCustomerEmail("");
    setCustomerPhone("");
    setCustomerCity("");
    setMaterial("PLA");
    setColor("Black");
    setQuality("standard");
    setQuantity(1);
    setNotes("");
    setDeadline("");
    setErrors({});
    setGlobalErr(null);
    setSubmitted(false);
  }

  return (
    <>
      <style>{CSS}</style>

      {/* ── NAV ── */}
      <nav className="nav">
        <div className="nav-inner">
          <a href="/" className="nav-logo">
            Create<span>3D</span>Parts
          </a>

          <div className="nav-links">
            <a href="#how-it-works" className="nav-link">
              How it works
            </a>
            <a href="#materials" className="nav-link">
              Materials
            </a>
            <a href="#pricing" className="nav-link">
              Pricing
            </a>
            <a href="#faq" className="nav-link">
              FAQ
            </a>
          </div>

          <Link href="/login?redirect=/dashboard" className="nav-cta">
            My Account
          </Link>

          <button
            className="nav-hamburger"
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            aria-label="Toggle menu"
            aria-expanded={mobileNavOpen}
          >
            <span className={`hamburger-icon${mobileNavOpen ? " open" : ""}`} />
          </button>
        </div>

        {/* Mobile slide-down panel */}
        <div className={`nav-mobile-panel${mobileNavOpen ? " nav-mobile-open" : ""}`}>
          <a href="#how-it-works" className="nav-mobile-link" onClick={() => setMobileNavOpen(false)}>
            How it works
          </a>
          <a href="#materials" className="nav-mobile-link" onClick={() => setMobileNavOpen(false)}>
            Materials
          </a>
          <a href="#pricing" className="nav-mobile-link" onClick={() => setMobileNavOpen(false)}>
            Pricing
          </a>
          <a href="#faq" className="nav-mobile-link" onClick={() => setMobileNavOpen(false)}>
            FAQ
          </a>
          <Link href="/login?redirect=/dashboard" className="nav-mobile-link nav-mobile-cta" onClick={() => setMobileNavOpen(false)}>
            My Account
          </Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-glow" aria-hidden="true" />
        <div className="hero-content">
          <p className="hero-eyebrow">// North NJ · Local 3D Printing</p>
          <h1 className="hero-headline">
            The part you need,
            <br />
            <em>printed fast.</em>
          </h1>
          <p className="hero-sub">
            Send a photo or STL — we quote within hours. No payment until you
            approve. Pickup in North NJ or we ship anywhere. Most parts done in
            24–72 hours.
          </p>
          <div className="hero-actions">
            <button className="btn-primary" onClick={scrollToForm}>
              Get a free quote →
            </button>
            <button className="btn-ghost" onClick={scrollToForm}>
              Upload STL file
            </button>
          </div>
          <div className="hero-trust">
            <span className="trust-badge">
              <span className="trust-dot" />
              No payment until you approve
            </span>
            <span className="trust-badge">
              <span className="trust-dot" />
              Same &amp; next-day available
            </span>
            <span className="trust-badge">
              <span className="trust-dot" />
              NJ pickup or ship anywhere
            </span>
            <span className="trust-badge">
              <span className="trust-dot" />
              One free fit adjustment
            </span>
          </div>
        </div>
      </section>

      {/* ── PROOF STRIP ── */}
      <div className="proof-strip">
        {[
          { icon: "◎", title: "North NJ", sub: "Local pickup available" },
          { icon: "⚡", title: "Fast Turnaround", sub: "24–72 hrs, rush available" },
          { icon: "⬡", title: "3 Materials", sub: "PLA · PETG · TPU in stock" },
          { icon: "✦", title: "Fit Guarantee", sub: "Free adjustment if it doesn't fit" },
        ].map((p) => (
          <div className="proof-item" key={p.title}>
            <span className="proof-icon">{p.icon}</span>
            <span className="proof-title">{p.title}</span>
            <span className="proof-sub">{p.sub}</span>
          </div>
        ))}
      </div>

      {/* ── WHAT WE PRINT ── */}
      <section className="section-wrap">
        <div className="section reveal">
          <div className="section-header">
            <p className="eyebrow">// What we print</p>
            <h2 className="section-title">Useful parts, not trinkets.</h2>
            <p className="section-sub">
              We focus on functional prints that solve real problems — the kind you
              can't easily find at a hardware store.
            </p>
          </div>
          <div className="items-grid">
            {ITEMS.map((it) => (
              <div className="item-card" key={it.title}>
                <span className="item-icon" aria-hidden="true">
                  {it.icon}
                </span>
                <h3 className="item-title">{it.title}</h3>
                <p className="item-desc">{it.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="section-wrap alt" id="how-it-works">
        <div className="section reveal">
          <div className="section-header">
            <p className="eyebrow">// Process</p>
            <h2 className="section-title">Three steps to your part.</h2>
          </div>
          <div className="steps-row">
            {STEPS.map((s) => (
              <div className="step" key={s.n}>
                <div className="step-num">{s.n}</div>
                <h3 className="step-title">{s.title}</h3>
                <p className="step-body">{s.body}</p>
                <div className="step-accent" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MATERIALS ── */}
      <section className="section-wrap" id="materials">
        <div className="section reveal">
          <div className="section-header">
            <p className="eyebrow">// Materials & Specs</p>
            <h2 className="section-title">Three materials. Every functional need.</h2>
            <p className="section-sub">
              Not sure which to pick? Describe the use case in your quote request
              and we'll recommend the right one.
            </p>
          </div>
          <div className="mats-grid">
            {MATERIALS.map((m) => (
              <div className="mat-card" key={m.name}>
                <div className="mat-name">{m.name}</div>
                <div className="mat-tags">
                  {m.tags.map((t) => (
                    <span className="mat-tag" key={t}>
                      {t}
                    </span>
                  ))}
                </div>
                <p className="mat-desc">{m.desc}</p>
                <p className="mat-best-for">→ {m.bestFor}</p>
                <div className="mat-specs">
                  {m.specs.map(([k, v]) => (
                    <div className="mat-spec-row" key={k}>
                      <span className="mat-spec-k">{k}</span>
                      <span className="mat-spec-v">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section className="section-wrap alt" id="pricing">
        <div className="section reveal">
          <div className="section-header">
            <p className="eyebrow">// Pricing</p>
            <h2 className="section-title">Transparent pricing. No surprises.</h2>
            <p className="section-sub">
              Every order gets a firm quote before you pay. These cards explain what
              changes pricing (size, material, complexity, quantity).
            </p>
          </div>
          <div className="pricing-grid">
            {PRICING.map((p) => (
              <div
                className={`price-card${p.highlight ? " price-card-highlight" : ""}`}
                key={p.label}
              >
                <div className="price-label">{p.label}</div>
                <div className="price-amount">{p.price}</div>
                <p className="price-note">{p.note}</p>
                <p className="price-examples">{p.examples}</p>
              </div>
            ))}
          </div>
          <div className="pricing-footer">
            <span className="trust-badge">
              <span className="trust-dot" />
              Fit Guarantee — one free adjustment if dimensions were provided and the
              part doesn't fit
            </span>
          </div>
        </div>
      </section>

      {/* ── RECENT PRINTS ── */}
      <section className="section-wrap">
        <div className="section reveal">
          <div className="section-header">
            <p className="eyebrow">// Recent Work</p>
            <h2 className="section-title">Prints from the last few weeks.</h2>
            <p className="section-sub">
              A sample of real orders we've completed for local customers.
            </p>
          </div>
          <div className="prints-list">
            {PRINTS.map((p) => (
              <div className="print-row" key={p.label}>
                <span className="print-icon" aria-hidden="true">◈</span>
                <span className="print-label">{p.label}</span>
                <span className="print-line" />
                <span className="print-mat">{p.material}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="section-wrap alt">
        <div className="section reveal">
          <div className="section-header">
            <p className="eyebrow">// What customers say</p>
            <h2 className="section-title">Real orders. Real results.</h2>
          </div>
          <div className="testimonials-grid">
            {TESTIMONIALS.map((t) => (
              <div className="testimonial-card" key={t.name}>
                <div className="testimonial-stars" aria-label="5 stars">
                  ★★★★★
                </div>
                <p className="testimonial-text">"{t.text}"</p>
                <div className="testimonial-byline">
                  <span className="testimonial-name">{t.name}</span>
                  <span className="testimonial-loc">{t.location}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="section-wrap" id="faq">
        <div className="section reveal">
          <div className="section-header">
            <p className="eyebrow">// FAQ</p>
            <h2 className="section-title">Common questions.</h2>
          </div>
          <FaqList faqs={FAQS} />
        </div>
      </section>

      {/* ── QUOTE FORM ── */}
      <section className="section-wrap form-bg" id="quote">
        <div className="section">
          <div className="form-wrap reveal" ref={formRef}>
            {submitted ? (
              <div className="form-success">
                <div className="form-success-icon">✓</div>
                <h2 className="form-success-title">Quote request sent.</h2>
                <p className="form-success-body">
                  We'll email <strong>{customerEmail}</strong> within 2 hours with a firm
                  price and turnaround time.
                </p>
                <p className="form-success-note">Nothing has been charged.</p>
                <p className="form-success-contact">
                  Need to follow up? Email{" "}
                  <a href="mailto:projects@create3dparts.com" style={{ color: "#f4621f" }}>
                    projects@create3dparts.com
                  </a>
                </p>
                <div className="form-success-actions">
                  <button className="btn-ghost" onClick={resetForm}>
                    Submit another request
                  </button>
                  <a href="/" className="btn-ghost" style={{ display: "inline-block" }}>
                    ← Back to site
                  </a>
                </div>
              </div>
            ) : (
              <>
                <div className="form-header">
                  <p className="eyebrow">// Get started</p>
                  <h2 className="form-title">Request a Quote</h2>
                  <p className="form-subtitle">
                    Describe what you need or attach a file. We'll send a firm quote within
                    2 hours. No payment until you approve.
                  </p>
                </div>

                {/* honeypot */}
                <div style={{ display: "none" }} aria-hidden="true">
                  <input
                    tabIndex={-1}
                    autoComplete="off"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                  />
                </div>

                <div className="form-body">
                  {/* CONTACT FIRST */}
                  <div className="field">
                    <label htmlFor="name">Name *</label>
                    <input
                      id="name"
                      value={customerName}
                      onChange={(e) => {
                        setCustomerName(e.target.value);
                        clearErr("customerName");
                      }}
                      placeholder="Your name"
                      style={{ borderColor: errors.customerName ? "#ff5555" : undefined }}
                    />
                    {errors.customerName && (
                      <p className="field-error">{errors.customerName}</p>
                    )}
                  </div>

                  <div className="field">
                    <label htmlFor="email">Email *</label>
                    <input
                      id="email"
                      type="email"
                      value={customerEmail}
                      onChange={(e) => {
                        setCustomerEmail(e.target.value);
                        clearErr("customerEmail");
                      }}
                      placeholder="you@email.com"
                      style={{ borderColor: errors.customerEmail ? "#ff5555" : undefined }}
                    />
                    {errors.customerEmail && (
                      <p className="field-error">{errors.customerEmail}</p>
                    )}
                  </div>

                  <div className="field">
                    <label htmlFor="phone">
                      Phone <span className="field-opt">(optional — for faster response)</span>
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="(201) 555-0100"
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="city">
                      City / Town <span className="field-opt">(optional)</span>
                    </label>
                    <input
                      id="city"
                      value={customerCity}
                      onChange={(e) => setCustomerCity(e.target.value)}
                      placeholder="e.g. Wayne, NJ"
                    />
                  </div>

                  {/* FILE MID-FORM */}
                  <div className="field field-full">
                    <label htmlFor="stl-file">
                      File{" "}
                      <span className="field-opt">(optional — .stl .step .obj .3mf · max 25 MB)</span>
                    </label>
                    <input
                      id="stl-file"
                      type="file"
                      accept=".stl,.step,.obj,.3mf"
                      onChange={handleFileChange}
                    />
                    {errors.file && <p className="field-error">{errors.file}</p>}
                    {!errors.file && file && (
                      <p className="file-note ok">
                        ✓ {file.name} — {Math.round(file.size / 1024)} KB attached
                      </p>
                    )}
                    {!errors.file && !file && (
                      <p className="file-note">
                        No file? Describe what you need in the notes below — we'll quote from
                        that.
                      </p>
                    )}
                  </div>

                  {/* SPEC */}
                  <div className="field">
                    <label htmlFor="material">Material</label>
                    <select
                      id="material"
                      value={material}
                      onChange={(e) => setMaterial(e.target.value as Material)}
                    >
                      <option value="PLA">PLA — precise, affordable (most parts)</option>
                      <option value="PETG">PETG — stronger, heat &amp; outdoor-ok</option>
                      <option value="TPU">TPU — flexible, rubber-like</option>
                    </select>
                  </div>

                  <div className="field">
                    <label htmlFor="color">
                      Color <span className="field-opt">(we'll confirm availability)</span>
                    </label>
                    <input
                      id="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      placeholder="Black, White, Gray…"
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="quality">Print Quality</label>
                    <select
                      id="quality"
                      value={quality}
                      onChange={(e) => setQuality(e.target.value as Quality)}
                    >
                      <option value="standard">Standard — recommended for most parts</option>
                      <option value="fine">Fine — smoother surface, slower print</option>
                      <option value="draft">Draft — fastest, visible layer lines</option>
                    </select>
                  </div>

                  <div className="field">
                    <label htmlFor="qty">Quantity</label>
                    <input
                      id="qty"
                      type="number"
                      min={1}
                      max={500}
                      value={quantity}
                      onChange={(e) =>
                        setQuantity(Math.max(1, parseInt(e.target.value || "1", 10)))
                      }
                    />
                  </div>

                  <div className="field field-full">
                    <label htmlFor="deadline">
                      Deadline <span className="field-opt">(optional)</span>
                    </label>
                    <select
                      id="deadline"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                    >
                      <option value="">No rush (24–72 hrs)</option>
                      <option value="ASAP">ASAP</option>
                      <option value="2–3 days">2–3 days</option>
                      <option value="1 week">1 week</option>
                    </select>
                  </div>

                  {/* NOTES */}
                  <div className="field field-full">
                    <label htmlFor="notes">
                      Description / Notes{" "}
                      {hasFile ? (
                        <span className="field-opt">(optional)</span>
                      ) : (
                        <span className="field-req">* required when no file attached</span>
                      )}
                    </label>
                    <textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => {
                        setNotes(e.target.value);
                        clearErr("notes");
                      }}
                      placeholder={
                        hasFile
                          ? "Any extra details: fit requirements, dimensions, color notes, intended use…"
                          : "Describe the part, its purpose, and key dimensions. The more detail, the more accurate your quote."
                      }
                      rows={4}
                      style={{ borderColor: errors.notes ? "#ff5555" : undefined }}
                    />
                    {errors.notes && <p className="field-error">{errors.notes}</p>}
                  </div>

                  {/* CTA */}
                  <div className="form-actions">
                    <button
                      className="btn-primary btn-full"
                      disabled={loading}
                      onClick={handlePrimarySubmit}
                    >
                      {loading ? "Sending quote..." : "Send Quote Request"}
                    </button>
                    <div className="form-reassurance">
                      <span>No payment until you approve the quote.</span>
                      <span>Quotes returned within 2 hours during business hours.</span>
                    </div>
                    {globalErr && <p className="form-msg">{globalErr}</p>}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="footer-logo">
              Create<span>3D</span>Parts
            </div>
            <p className="footer-tagline">
              Local 3D printing in North NJ.
              <br />
              Fast turnaround. Firm quotes. Parts that fit.
            </p>
            <a href="mailto:hello@create3dparts.com" className="footer-email">
              hello@create3dparts.com
            </a>
          </div>

          <div className="footer-col">
            <div className="footer-col-title">Services</div>
            <a href="#quote" className="footer-link">
              Request a Quote
            </a>
            <a href="#materials" className="footer-link">
              Materials
            </a>
            <a href="#pricing" className="footer-link">
              Pricing
            </a>
            <a href="#how-it-works" className="footer-link">
              How it works
            </a>
          </div>

          <div className="footer-col">
            <div className="footer-col-title">Contact</div>
            <a href="mailto:hello@create3dparts.com" className="footer-link">
              hello@create3dparts.com
            </a>
            <a href="mailto:projects@create3dparts.com" className="footer-link">
              projects@create3dparts.com
            </a>
            <a href="#faq" className="footer-link">
              FAQ
            </a>
            <a href="/login" className="footer-link">
              Client Login
            </a>
            <span className="footer-info">Mon–Fri 9am–8pm</span>
            <span className="footer-info">Sat–Sun 10am–6pm</span>
          </div>

          <div className="footer-col">
            <div className="footer-col-title">Guarantee</div>
            <p className="footer-guarantee">
              <span className="guarantee-badge">✓ Fit Guarantee</span>
              <br />
              One free adjustment if dimensions were provided and the part doesn't fit.{" "}
              <a href="#faq" className="footer-link">
                Learn more →
              </a>
            </p>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Create3DParts. All rights reserved.</span>
          <span>North New Jersey · create3dparts.com</span>
        </div>
      </footer>

      <RevealObserver />
    </>
  );
}

/* ─────────────────────────────────────────
   FAQ ACCORDION
───────────────────────────────────────── */
function FaqList({ faqs }: { faqs: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="faq-list">
      {faqs.map((f, i) => (
        <div className="faq-item" key={i}>
          <button
            className={`faq-q${open === i ? " open" : ""}`}
            onClick={() => setOpen(open === i ? null : i)}
            aria-expanded={open === i}
          >
            {f.q}
            <span className="faq-arrow" aria-hidden="true">
              {open === i ? "−" : "+"}
            </span>
          </button>
          {open === i && <div className="faq-a">{f.a}</div>}
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────
   SCROLL REVEAL
───────────────────────────────────────── */
function RevealObserver() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const obs = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("visible");
        }),
      { threshold: 0.08 }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);
  return null;
}

/* ─────────────────────────────────────────
   STYLES
───────────────────────────────────────── */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Space+Grotesk:wght@500;600;700&family=Space+Mono:wght@400;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:       #0a0a0a;
    --bg-alt:   #0f0f0f;
    --bg-card:  #131313;
    --bg-input: #161616;
    --border:   #1e1e1e;
    --border2:  #282828;
    --orange:   #f4621f;
    --orange-h: #ff7340;
    --text:     #efefef;
    --text-2:   #a0a0a0;
    --text-3:   #5a5a5a;
    --body:     'DM Sans', system-ui, sans-serif;
    --display:  'Space Grotesk', system-ui, sans-serif;
    --mono:     'Space Mono', monospace;
    --container: 1200px;
    --px-mobile: 20px;
    --px-tablet: 32px;
    --px-desktop: 40px;
  }

  html { scroll-behavior: smooth; font-size: 16px; }
  body { background: var(--bg); color: var(--text); font-family: var(--body); line-height: 1.6; -webkit-font-smoothing: antialiased; overflow-x: hidden; }
  a { color: inherit; text-decoration: none; }

  /* ===== NAV ===== */
  .nav {
    position: fixed; top: 0; left: 0; right: 0; z-index: 100;
    background: rgba(10,10,10,0.92);
    border-bottom: 1px solid var(--border);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
  }
  .nav-inner {
    display: flex; align-items: center; gap: 1.5rem;
    max-width: var(--container); margin: 0 auto;
    padding: 0 var(--px-mobile); height: 60px;
  }
  .nav-logo { font-family: var(--display); font-size: 1rem; font-weight: 700; letter-spacing: -0.02em; color: var(--text); flex-shrink: 0; }
  .nav-logo span { color: var(--orange); }
  .nav-links { display: none; gap: 1.5rem; flex: 1; }
  .nav-link { font-family: var(--body); font-size: 0.875rem; font-weight: 500; color: var(--text-2); transition: color 0.15s; }
  .nav-link:hover { color: var(--text); }
  .nav-cta {
    display: none; margin-left: auto;
    font-family: var(--mono); font-size: 0.8125rem; font-weight: 700;
    letter-spacing: 0.04em; text-transform: uppercase;
    color: var(--text-2); background: transparent;
    border: 1px solid var(--border2);
    padding: 0.4rem 0.85rem; border-radius: 4px;
    cursor: pointer; transition: color 0.15s, border-color 0.15s;
    white-space: nowrap; align-items: center; justify-content: center;
  }
  .nav-cta:hover { color: var(--text); border-color: var(--text-3); }

  /* Hamburger button */
  .nav-hamburger {
    display: flex; margin-left: auto;
    background: none; border: none; cursor: pointer;
    width: 44px; height: 44px; align-items: center; justify-content: center;
    padding: 0; flex-shrink: 0;
  }
  .hamburger-icon,
  .hamburger-icon::before,
  .hamburger-icon::after {
    display: block; width: 22px; height: 2px;
    background: var(--text); border-radius: 1px;
    transition: transform 0.25s ease, opacity 0.2s ease;
  }
  .hamburger-icon { position: relative; }
  .hamburger-icon::before,
  .hamburger-icon::after { content: ''; position: absolute; left: 0; }
  .hamburger-icon::before { top: -7px; }
  .hamburger-icon::after { top: 7px; }
  .hamburger-icon.open { background: transparent; }
  .hamburger-icon.open::before { top: 0; transform: rotate(45deg); }
  .hamburger-icon.open::after { top: 0; transform: rotate(-45deg); }

  /* Mobile panel */
  .nav-mobile-panel {
    display: flex; flex-direction: column;
    max-height: 0; overflow: hidden;
    background: rgba(10,10,10,0.98);
    border-top: 1px solid var(--border);
    transition: max-height 0.3s ease;
  }
  .nav-mobile-panel.nav-mobile-open { max-height: 320px; }
  .nav-mobile-link {
    font-family: var(--body); font-size: 0.875rem; font-weight: 500;
    color: var(--text-2); padding: 14px var(--px-mobile);
    border-bottom: 1px solid var(--border);
    transition: color 0.15s, background 0.15s;
  }
  .nav-mobile-link:hover { color: var(--text); background: rgba(255,255,255,0.03); }
  .nav-mobile-cta { color: var(--orange); font-weight: 600; }

  /* ===== HERO ===== */
  .hero {
    min-height: auto; padding: calc(60px + 40px) var(--px-mobile) 40px;
    display: flex; align-items: center; justify-content: center;
    position: relative; overflow: hidden;
  }
  .hero-grid {
    position: absolute; inset: 0; z-index: 0;
    background-image: linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px);
    background-size: 56px 56px;
    mask-image: radial-gradient(ellipse 90% 80% at 50% 100%, black 30%, transparent 100%);
  }
  .hero-glow {
    position: absolute; width: 400px; height: 400px; border-radius: 50%;
    background: radial-gradient(circle, rgba(244,98,31,0.12) 0%, transparent 65%);
    top: -100px; right: -80px; pointer-events: none; z-index: 0;
  }
  .hero-content {
    position: relative; z-index: 1;
    width: 100%; max-width: var(--container);
    margin: 0 auto; text-align: center;
  }
  .hero-eyebrow { font-family: var(--mono); font-size: 0.75rem; letter-spacing: 0.15em; color: var(--orange); text-transform: uppercase; margin-bottom: 1rem; }
  .hero-headline { font-family: var(--display); font-weight: 700; font-size: 1.75rem; line-height: 1.08; letter-spacing: -0.03em; color: var(--text); }
  .hero-headline em { font-style: normal; color: var(--orange); display: block; }
  .hero-sub { font-size: 1rem; font-weight: 300; color: var(--text-2); margin: 1rem auto 0; max-width: 520px; line-height: 1.6; }
  .hero-actions { display: flex; flex-direction: column; gap: 0.75rem; margin-top: 1.5rem; align-items: center; }
  .hero-trust { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 1.5rem; justify-items: start; }
  .trust-badge { font-family: var(--mono); font-size: 0.75rem; letter-spacing: 0.06em; color: var(--text-3); text-transform: uppercase; display: flex; align-items: center; gap: 0.4rem; }
  .trust-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--orange); flex-shrink: 0; }

  /* ===== BUTTONS ===== */
  .btn-primary {
    font-family: var(--mono); font-size: 0.875rem; font-weight: 700;
    letter-spacing: 0.05em; text-transform: uppercase;
    background: var(--orange); color: #000; border: none;
    padding: 0 1.5rem; height: 44px; border-radius: 4px;
    cursor: pointer; transition: background 0.15s, transform 0.1s;
    display: inline-flex; align-items: center; justify-content: center;
  }
  .btn-primary:hover { background: var(--orange-h); transform: translateY(-1px); }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
  .btn-ghost {
    font-family: var(--mono); font-size: 0.875rem;
    letter-spacing: 0.05em; text-transform: uppercase;
    background: transparent; color: var(--text-2);
    border: 1px solid var(--border2);
    padding: 0 1.5rem; height: 44px; border-radius: 4px;
    cursor: pointer; transition: color 0.15s, border-color 0.15s, transform 0.1s;
    display: inline-flex; align-items: center; justify-content: center;
  }
  .btn-ghost:hover { color: var(--text); border-color: var(--text-3); transform: translateY(-1px); }
  .btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
  .btn-full { width: 100%; }

  /* ===== PROOF STRIP ===== */
  .proof-strip {
    display: grid; grid-template-columns: 1fr 1fr;
    border-top: 1px solid var(--border); border-bottom: 1px solid var(--border);
    background: var(--bg-alt);
  }
  .proof-item {
    display: flex; flex-direction: column; align-items: center;
    padding: 16px 12px; border-bottom: 1px solid var(--border);
    text-align: center; gap: 0.2rem;
  }
  .proof-item:nth-child(odd) { border-right: 1px solid var(--border); }
  .proof-item:nth-last-child(-n+2) { border-bottom: none; }
  .proof-icon { font-size: 0.875rem; color: var(--orange); }
  .proof-title { font-family: var(--display); font-size: 0.875rem; font-weight: 600; color: var(--text); }
  .proof-sub { font-family: var(--mono); font-size: 0.75rem; letter-spacing: 0.04em; color: var(--text-3); text-transform: uppercase; }

  /* ===== SECTION SHELL ===== */
  .section-wrap { border-bottom: 1px solid var(--border); }
  .section-wrap.alt { background: var(--bg-alt); }
  .section-wrap.form-bg { background: var(--bg-alt); }
  .section {
    padding: 40px var(--px-mobile);
    max-width: var(--container); margin: 0 auto;
  }
  .section-header { margin-bottom: 24px; }
  .eyebrow { font-family: var(--mono); font-size: 0.75rem; letter-spacing: 0.18em; color: var(--orange); text-transform: uppercase; margin-bottom: 0.5rem; }
  .section-title { font-family: var(--display); font-weight: 700; font-size: 1.35rem; letter-spacing: -0.03em; line-height: 1.15; color: var(--text); margin-bottom: 0.5rem; }
  .section-sub { font-size: 0.875rem; font-weight: 300; color: var(--text-2); max-width: 540px; line-height: 1.7; }

  /* ===== SCROLL REVEAL ===== */
  .reveal { opacity: 0; transform: translateY(20px); transition: opacity 0.6s ease, transform 0.6s ease; }
  .reveal.visible { opacity: 1; transform: none; }

  /* ===== ITEMS GRID (What We Print) ===== */
  .items-grid { display: grid; grid-template-columns: 1fr; gap: 1px; background: var(--border); border: 1px solid var(--border); }
  .item-card { background: var(--bg-card); padding: 16px; transition: background 0.2s; }
  .item-card:hover { background: #181818; }
  .item-card:hover .item-icon { color: var(--orange); }
  .item-icon { font-size: 1.25rem; color: var(--text-3); margin-bottom: 0.5rem; display: block; transition: color 0.2s; }
  .item-title { font-family: var(--display); font-weight: 600; font-size: 1rem; color: var(--text); margin-bottom: 0.3rem; }
  .item-desc { font-size: 0.875rem; color: var(--text-2); line-height: 1.6; }

  /* ===== STEPS ===== */
  .steps-row { display: grid; grid-template-columns: 1fr; gap: 1px; background: var(--border); border: 1px solid var(--border); }
  .step { background: var(--bg-card); padding: 20px 16px; position: relative; overflow: hidden; }
  .step-num { font-family: var(--mono); font-size: 1.5rem; font-weight: 700; letter-spacing: 0.05em; color: var(--orange); margin-bottom: 0.6rem; }
  .step-title { font-family: var(--display); font-weight: 700; font-size: 1rem; letter-spacing: -0.02em; margin-bottom: 0.4rem; color: var(--text); }
  .step-body { font-size: 0.875rem; color: var(--text-2); line-height: 1.65; }
  .step-accent { position: absolute; bottom: 0; left: 0; width: 2.5rem; height: 2px; background: var(--orange); }

  /* ===== MATERIALS ===== */
  .mats-grid { display: grid; grid-template-columns: 1fr; gap: 1px; background: var(--border); border: 1px solid var(--border); }
  .mat-card { background: var(--bg-card); padding: 20px 16px; display: flex; flex-direction: column; max-width: 100%; }
  .mat-name { font-family: var(--mono); font-weight: 700; font-size: 1.25rem; color: var(--orange); margin-bottom: 0.4rem; }
  .mat-tags { display: flex; gap: 0.35rem; flex-wrap: wrap; margin-bottom: 0.6rem; }
  .mat-tag { font-family: var(--mono); font-size: 0.6875rem; letter-spacing: 0.06em; border: 1px solid var(--border2); color: var(--text-3); padding: 0.2rem 0.5rem; border-radius: 3px; text-transform: uppercase; }
  .mat-desc { font-size: 0.875rem; color: var(--text-2); line-height: 1.6; margin-bottom: 0.4rem; }
  .mat-best-for { font-family: var(--mono); font-size: 0.75rem; letter-spacing: 0.04em; color: var(--orange); line-height: 1.55; margin-bottom: 0.6rem; }
  .mat-specs { display: flex; flex-direction: column; margin-top: auto; }
  .mat-spec-row { display: flex; justify-content: space-between; padding: 0.35rem 0; border-top: 1px solid var(--border); font-size: 0.8125rem; }
  .mat-spec-k { font-family: var(--mono); font-size: 0.8125rem; color: var(--text-3); letter-spacing: 0.04em; }
  .mat-spec-v { color: var(--text); font-weight: 500; }

  /* ===== PRICING ===== */
  .pricing-grid { display: grid; grid-template-columns: 1fr; gap: 1px; background: var(--border); border: 1px solid var(--border); margin-bottom: 1rem; }
  .price-card { background: var(--bg-card); padding: 20px 16px; }
  .price-card-highlight { background: #161410; border-left: 2px solid var(--orange); }
  .price-label { font-family: var(--mono); font-size: 0.75rem; letter-spacing: 0.1em; color: var(--text-3); text-transform: uppercase; margin-bottom: 0.35rem; }
  .price-amount { font-family: var(--display); font-weight: 700; font-size: 1rem; letter-spacing: -0.03em; color: var(--text); margin-bottom: 0.3rem; }
  .price-card-highlight .price-amount { color: var(--orange); }
  .price-note { font-size: 0.8125rem; color: var(--text-2); line-height: 1.55; }
  .price-examples { font-family: var(--mono); font-size: 0.75rem; letter-spacing: 0.03em; color: var(--text-3); line-height: 1.7; margin-top: 0.4rem; border-top: 1px solid var(--border); padding-top: 0.4rem; }
  .pricing-footer { padding-top: 0.6rem; }

  /* ===== PRINTS LIST ===== */
  .prints-list { border: 1px solid var(--border); background: var(--bg-card); }
  .print-row { display: flex; align-items: center; gap: 0.6rem; padding: 12px 16px; border-bottom: 1px solid var(--border); transition: background 0.15s; }
  .print-row:last-child { border-bottom: none; }
  .print-row:hover { background: #181818; }
  .print-icon { color: var(--orange); font-size: 0.875rem; flex-shrink: 0; }
  .print-label { font-size: 0.875rem; font-weight: 500; color: var(--text); white-space: nowrap; }
  .print-line { flex: 1; height: 1px; background: var(--border); min-width: 16px; }
  .print-mat { font-family: var(--mono); font-size: 0.75rem; letter-spacing: 0.06em; color: var(--orange); text-transform: uppercase; flex-shrink: 0; }

  /* ===== TESTIMONIALS ===== */
  .testimonials-grid { display: grid; grid-template-columns: 1fr; gap: 1px; background: var(--border); border: 1px solid var(--border); }
  .testimonial-card { background: var(--bg-card); padding: 20px 16px; display: flex; flex-direction: column; gap: 0.6rem; }
  .testimonial-stars { color: var(--orange); font-size: 1rem; letter-spacing: 0.08em; }
  .testimonial-text { font-size: 1rem; color: var(--text-2); line-height: 1.65; font-style: italic; flex: 1; max-width: 480px; }
  .testimonial-byline { display: flex; flex-direction: column; gap: 0.15rem; }
  .testimonial-name { font-family: var(--display); font-size: 0.875rem; font-weight: 600; color: var(--text); }
  .testimonial-loc { font-family: var(--mono); font-size: 0.8125rem; letter-spacing: 0.06em; color: var(--text-3); text-transform: uppercase; }

  /* ===== FAQ ===== */
  .faq-list { display: flex; flex-direction: column; gap: 1px; background: var(--border); border: 1px solid var(--border); max-width: 720px; margin: 0 auto; }
  .faq-item { background: var(--bg-card); }
  .faq-q { width: 100%; text-align: left; background: none; border: none; padding: 14px 16px; font-family: var(--body); font-size: 1rem; font-weight: 500; color: var(--text); cursor: pointer; display: flex; justify-content: space-between; align-items: center; gap: 0.8rem; transition: color 0.15s; min-height: 44px; }
  .faq-q:hover, .faq-q.open { color: var(--orange); }
  .faq-arrow { font-size: 1.125rem; font-weight: 300; color: var(--orange); flex-shrink: 0; width: 20px; text-align: center; }
  .faq-a { font-size: 0.875rem; color: var(--text-2); line-height: 1.7; padding: 0 16px 16px; border-top: 1px solid var(--border); padding-top: 12px; }

  /* ===== FORM ===== */
  .form-wrap { background: var(--bg-card); border: 1px solid var(--border); border-top: 3px solid var(--orange); padding: 24px 16px; max-width: 640px; margin: 0 auto; scroll-margin-top: 70px; border-radius: 6px; }
  .form-header { margin-bottom: 1.5rem; }
  .form-title { font-family: var(--display); font-weight: 700; font-size: 1.35rem; letter-spacing: -0.03em; margin-bottom: 0.3rem; color: var(--text); }
  .form-subtitle { font-size: 0.875rem; color: var(--text-2); line-height: 1.65; }
  .form-body { display: grid; grid-template-columns: 1fr; gap: 0.85rem; }
  .field { display: flex; flex-direction: column; gap: 0.3rem; }
  .field-full { grid-column: 1 / -1; }
  .field-opt { font-weight: 400; color: var(--text-3); font-size: 0.75em; }
  .field-req { font-weight: 600; color: var(--orange); font-size: 0.75em; }
  label { font-family: var(--mono); font-size: 0.8125rem; letter-spacing: 0.08em; color: var(--text-3); text-transform: uppercase; }
  input, select, textarea {
    background: var(--bg-input); border: 1px solid var(--border2);
    color: var(--text); padding: 0 0.75rem;
    font-family: var(--body); font-size: 0.9375rem;
    outline: none; transition: border-color 0.15s;
    width: 100%; height: 44px; border-radius: 6px;
    -webkit-appearance: none; appearance: none;
  }
  input:focus, select:focus, textarea:focus { border-color: var(--orange); }
  select { cursor: pointer; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23666' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 0.75rem center; padding-right: 2rem; }
  textarea { resize: vertical; min-height: 120px; line-height: 1.55; height: auto; padding: 0.65rem 0.75rem; }
  input[type="file"] { padding: 0.55rem 0.75rem; cursor: pointer; color: var(--text-2); height: 44px; }
  .file-note { font-family: var(--mono); font-size: 0.75rem; letter-spacing: 0.04em; color: var(--text-3); margin-top: 0.2rem; line-height: 1.55; }
  .file-note.ok { color: #6abf69; }
  .field-error { font-family: var(--mono); font-size: 0.75rem; color: #ff5555; letter-spacing: 0.04em; margin-top: 0.15rem; }
  .form-actions { grid-column: 1 / -1; display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.3rem; }
  .form-reassurance { display: flex; flex-direction: column; align-items: center; gap: 0.15rem; }
  .form-reassurance span { font-family: var(--mono); font-size: 0.75rem; letter-spacing: 0.04em; color: var(--text-3); text-align: center; }
  .form-msg { font-family: var(--mono); font-size: 0.8125rem; color: #ff5555; padding: 0.5rem 0.75rem; border: 1px solid rgba(255,85,85,0.25); background: rgba(255,85,85,0.05); border-radius: 4px; }

  /* ===== SUCCESS STATE ===== */
  .form-success { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 2rem 1rem; gap: 0.7rem; }
  .form-success-icon { font-size: 2rem; color: var(--orange); }
  .form-success-title { font-family: var(--display); font-weight: 700; font-size: 1.25rem; letter-spacing: -0.03em; }
  .form-success-body { font-size: 0.875rem; color: var(--text-2); line-height: 1.65; max-width: 340px; }
  .form-success-note { font-family: var(--mono); font-size: 0.75rem; letter-spacing: 0.08em; color: var(--text-3); text-transform: uppercase; }
  .form-success-contact { font-family: var(--mono); font-size: 0.8125rem; color: var(--text-3); letter-spacing: 0.04em; }
  .form-success-actions { display: flex; gap: 0.7rem; flex-wrap: wrap; justify-content: center; margin-top: 0.5rem; }

  /* ===== FOOTER ===== */
  .footer { border-top: 1px solid var(--border); background: #060606; }
  .footer-inner {
    display: grid; grid-template-columns: 1fr;
    gap: 1.5rem; padding: 32px var(--px-mobile) 24px;
    max-width: var(--container); margin: 0 auto;
  }
  .footer-logo { font-family: var(--display); font-size: 1rem; font-weight: 700; letter-spacing: -0.02em; color: var(--text); margin-bottom: 0.4rem; }
  .footer-logo span { color: var(--orange); }
  .footer-tagline { font-size: 0.8125rem; color: var(--text-3); line-height: 1.65; margin-bottom: 0.5rem; }
  .footer-email { font-family: var(--mono); font-size: 0.8125rem; letter-spacing: 0.03em; color: var(--orange); }
  .footer-email:hover { text-decoration: underline; }
  .footer-col { display: flex; flex-direction: column; gap: 0.4rem; }
  .footer-col-title { font-family: var(--mono); font-size: 0.75rem; letter-spacing: 0.1em; color: var(--text-3); text-transform: uppercase; margin-bottom: 0.1rem; }
  .footer-link { font-size: 0.8125rem; color: var(--text-2); transition: color 0.15s; }
  .footer-link:hover { color: var(--text); }
  .footer-info { font-size: 0.8125rem; color: var(--text-3); }
  .footer-guarantee { font-size: 0.8125rem; color: var(--text-2); line-height: 1.65; }
  .guarantee-badge { font-family: var(--mono); font-size: 0.8125rem; letter-spacing: 0.04em; color: var(--orange); }
  .footer-bottom {
    display: flex; justify-content: space-between; align-items: center;
    flex-wrap: wrap; gap: 0.4rem;
    padding: 12px var(--px-mobile);
    border-top: 1px solid var(--border);
    font-family: var(--mono); font-size: 0.75rem; letter-spacing: 0.04em; color: var(--text-3);
    max-width: var(--container); margin: 0 auto;
  }

  /* ======================================================
     TABLET BREAKPOINT — 768px+
  ====================================================== */
  @media (min-width: 768px) {
    .nav-inner { padding: 0 var(--px-tablet); }

    /* Hero */
    .hero { padding: calc(60px + 60px) var(--px-tablet) 60px; }
    .hero-headline { font-size: 2.25rem; }
    .hero-sub { font-size: 1rem; }
    .hero-actions { flex-direction: row; justify-content: center; }
    .hero-trust { grid-template-columns: 1fr 1fr; gap: 12px 32px; max-width: 520px; margin: 1.5rem auto 0; }

    /* Proof strip */
    .proof-strip { grid-template-columns: repeat(4, 1fr); }
    .proof-item { border-bottom: none; padding: 16px; }
    .proof-item:nth-child(odd) { border-right: none; }
    .proof-item { border-right: 1px solid var(--border); }
    .proof-item:last-child { border-right: none; }

    /* Section */
    .section { padding: 60px var(--px-tablet); }
    .section-header { margin-bottom: 28px; }
    .section-title { font-size: 1.5rem; }

    /* Items grid */
    .items-grid { grid-template-columns: repeat(2, 1fr); }
    .item-card { padding: 20px; }

    /* Steps */
    .steps-row { grid-template-columns: repeat(3, 1fr); }

    /* Materials */
    .mats-grid { grid-template-columns: repeat(3, 1fr); }
    .mat-card { padding: 20px; }

    /* Pricing */
    .pricing-grid { grid-template-columns: repeat(2, 1fr); }
    .price-card { padding: 20px; }

    /* Testimonials */
    .testimonials-grid { grid-template-columns: 1fr; }

    /* Form */
    .form-wrap { padding: 28px 24px; }
    .form-body { grid-template-columns: 1fr 1fr; gap: 0.85rem; }

    /* Footer */
    .footer-inner { grid-template-columns: 1fr 1fr; gap: 2rem; padding: 40px var(--px-tablet) 28px; }
    .footer-bottom { padding: 12px var(--px-tablet); }
  }

  /* ======================================================
     DESKTOP BREAKPOINT — 1024px+
  ====================================================== */
  @media (min-width: 1024px) {
    .nav-inner { padding: 0 var(--px-desktop); }
    .nav-links { display: flex; }
    .nav-cta { display: inline-flex; }
    .nav-hamburger { display: none; }
    .nav-mobile-panel { display: none; }

    /* Hero */
    .hero {
      min-height: 85vh; max-height: 900px;
      padding: calc(60px + 80px) var(--px-desktop) 80px;
    }
    .hero-content { max-width: 600px; }
    .hero-headline { font-size: clamp(2rem, 4vw, 3.25rem); }
    .hero-sub { font-size: 1.125rem; max-width: 520px; }
    .hero-trust { grid-template-columns: 1fr 1fr; gap: 8px 32px; max-width: 520px; margin: 2rem auto 0; }

    /* Section */
    .section { padding: 80px var(--px-desktop); }
    .section-header { margin-bottom: 32px; }
    .section-title { font-size: clamp(1.75rem, 2.5vw, 2.25rem); }

    /* Items grid */
    .items-grid { grid-template-columns: repeat(3, 1fr); }
    .item-card { padding: 24px; }
    .item-title { font-size: 1.125rem; }

    /* Materials */
    .mat-card { padding: 24px; max-width: 380px; }

    /* Pricing */
    .pricing-grid { grid-template-columns: repeat(4, 1fr); }
    .price-card { padding: 24px; }

    /* Testimonials */
    .testimonials-grid { grid-template-columns: repeat(3, 1fr); }

    /* Form */
    .form-wrap { padding: 32px; }

    /* Footer */
    .footer-inner { grid-template-columns: 2fr 1fr 1fr 1.5fr; gap: 2rem; padding: 48px var(--px-desktop) 32px; }
    .footer-bottom { padding: 12px var(--px-desktop); }
  }

  /* ======================================================
     LARGE DESKTOP — 1440px+
  ====================================================== */
  @media (min-width: 1440px) {
    .hero-content { max-width: 600px; }
  }
`;