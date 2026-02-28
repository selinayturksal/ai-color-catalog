import { useEffect, useMemo, useState } from "react";
import "./App.css";

export default function App() {
  const [description, setDescription] = useState("");
  const [count, setCount] = useState(5);
  const [vibe, setVibe] = useState("");

  // results
  const [palette, setPalette] = useState(null);      // single
  const [palettes, setPalettes] = useState(null);    // triple (Warm/Minimal/Moody)
  const [activeIndex, setActiveIndex] = useState(0);

  // saved (local only)
  const [saved, setSaved] = useState([]);

  // ui states
  const [loadingPalette, setLoadingPalette] = useState(false);
  const [loadingPalettes, setLoadingPalettes] = useState(false);
  const [error, setError] = useState("");

  // load saved from localStorage (portfolio için güzel)
  useEffect(() => {
    const raw = localStorage.getItem("ai_color_catalog_saved");
    if (raw) {
      try {
        setSaved(JSON.parse(raw));
      } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("ai_color_catalog_saved", JSON.stringify(saved));
  }, [saved]);

  const hasResult = useMemo(() => {
    if (palettes?.length) return true;
    if (palette?.colors?.length) return true;
    return false;
  }, [palettes, palette]);

  const activePalette = useMemo(() => {
    if (palettes?.length) return palettes[activeIndex];
    return palette;
  }, [palettes, activeIndex, palette]);

  // layout stages:
  // 1) no result => center single panel
  // 2) result exists => 2 columns
  // 3) saved exists => 3 columns
  const layoutMode = useMemo(() => {
    if (!hasResult) return "one";
    if (saved.length > 0) return "three";
    return "two";
  }, [hasResult, saved.length]);

  function copy(text) {
    navigator.clipboard.writeText(text);
  }

  async function generate1() {
    setError("");
    setLoadingPalette(true);
    setPalette(null);
    setPalettes(null);
    setActiveIndex(0);

    try {
      const r = await fetch("/api/palette", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          count: Number(count),
          vibe: vibe || undefined,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error ? JSON.stringify(data.error) : "Failed to generate palette.");
      setPalette(data);
    } catch (e) {
      const msg = (e?.message || "Request failed").toString();
      // JSON gibi gelirse sadeleştir
      setError(msg.length > 180 ? msg.slice(0, 180) + "..." : msg);
    } finally {
      setLoadingPalette(false);
    }
  }

  async function generate3() {
    setError("");
    setLoadingPalettes(true);
    setPalette(null);
    setPalettes(null);
    setActiveIndex(0);

    try {
      // We keep your existing /api/palettes endpoint.
      // It already returns 3 alternatives (Warm/Minimal/Moody style prompt is in backend).
      const r = await fetch("/api/palettes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          count: Number(count),
          vibe: vibe || undefined,
          variants: 3,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Failed to generate 3 palettes.");
      setPalettes(data.palettes);
    } catch (e) {
      setError(e.message || "Request failed.");
    } finally {
      setLoadingPalettes(false);
    }
  }

  function saveActivePalette() {
    if (!activePalette?.colors?.length) return;

    const toSave = {
      id: crypto.randomUUID(),
      savedAt: new Date().toISOString(),
      source: palettes?.length ? `3-pack #${activeIndex + 1}` : "single",
      title: activePalette.title,
      notes: activePalette.notes || "",
      colors: activePalette.colors,
    };

    setSaved((prev) => [toSave, ...prev]);
  }

  function removeSaved(id) {
    setSaved((prev) => prev.filter((x) => x.id !== id));
  }

  function loadSaved(item) {
    // load into result area (nice portfolio demo)
    setError("");
    setPalette({
      title: item.title,
      notes: item.notes,
      colors: item.colors,
    });
    setPalettes(null);
    setActiveIndex(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="page">
      <header className="topbar">
        <div className="topbar__inner">
          <div className="brand">AI Color Catalog</div>
        </div>
      </header>

      <main className={`shell shell--${layoutMode}`}>
        {/* LEFT: generator */}
        <section className="card card--panel">
          <div className="card__header">
            <div>
              <h2 className="card__title">Generate palette</h2>
              <p className="card__subtitle">
                Describe an interior/asset mood in a few sentences and generate a color palette.
              </p>
            </div>
          </div>

          <div className="form">
            <label className="field">
              <span className="field__label">Description</span>
              <textarea
                className="field__input field__input--textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                placeholder="Example: A warm modern living room with soft daylight, calm textures…"
              />
            </label>

            <div className="row">
              <label className="field">
                <span className="field__label">Color count</span>
                <input
                  className="field__input"
                  type="number"
                  min={3}
                  max={10}
                  value={count}
                  onChange={(e) => setCount(e.target.value)}
                />
              </label>

              <label className="field">
                <span className="field__label">Vibe (optional)</span>
                <input
                  className="field__input"
                  value={vibe}
                  onChange={(e) => setVibe(e.target.value)}
                  placeholder="modern / boho / minimal / industrial…"
                />
              </label>
            </div>

            <div className="actions">
              <button
                className="btn btn--primary"
                onClick={generate1}
                disabled={loadingPalette || description.trim().length < 5}
              >
                {loadingPalette ? "Generating…" : "Generate 1 palette"}
              </button>

              <button
                className="btn"
                onClick={generate3}
                disabled={loadingPalettes || description.trim().length < 5}
              >
                {loadingPalettes ? "Generating…" : "Generate 3 palettes"}
              </button>

              {/* Save appears only after palette exists */}
              {hasResult && (
                <button className="btn btn--ghost" onClick={saveActivePalette}>
                  Save palette
                </button>
              )}
            </div>

            {error && <div className="error">Error: {String(error)}</div>}
          </div>
        </section>

        {/* MIDDLE: result */}
        {hasResult && (
          <section className="card card--panel">
            <div className="card__header card__header--split">
              <div>
                <h2 className="card__title">Result</h2>
                <p className="card__subtitle">
                  Copy HEX/RGB with one click. Use the palette suggestions for interior surfaces.
                </p>
              </div>

              {palettes?.length ? (
                <div className="tabs">
                  {palettes.map((_, i) => (
                    <button
                      key={i}
                      className={`tab ${activeIndex === i ? "tab--active" : ""}`}
                      onClick={() => setActiveIndex(i)}
                    >
                      Option {i + 1}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            {activePalette ? (
              <div className="result">
                <div className="result__title">{activePalette.title}</div>
                {activePalette.notes ? <div className="result__notes">{activePalette.notes}</div> : null}

                <div className="colors">
                  {activePalette.colors.map((c, idx) => (
                    <div className="colorCard" key={idx}>
                      <div className="swatch" style={{ background: c.hex }} title={c.hex} />
                      <div className="colorCard__main">
                        <div className="colorCard__name">{c.name}</div>

                        <div className="chips">
                          <span className="chip">{c.hex}</span>
                          <span className="chip">
                            rgb({c.rgb.r}, {c.rgb.g}, {c.rgb.b})
                          </span>
                        </div>

                        <div className="colorCard__usage">{c.usage}</div>

                        <div className="miniActions">
                          <button className="miniBtn" onClick={() => copy(c.hex)}>
                            Copy HEX
                          </button>
                          <button
                            className="miniBtn"
                            onClick={() => copy(`rgb(${c.rgb.r}, ${c.rgb.g}, ${c.rgb.b})`)}
                          >
                            Copy RGB
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="empty">
                No result yet. Generate a palette from the left panel.
              </div>
            )}
          </section>
        )}

        {/* RIGHT: saved */}
        {hasResult && saved.length > 0 && (
          <section className="card card--panel">
            <div className="card__header">
              <div>
                <h2 className="card__title">Saved palettes</h2>
                <p className="card__subtitle">Stored locally in your browser (for demo/portfolio).</p>
              </div>
            </div>

            <div className="savedList">
              {saved.map((item) => (
                <div className="savedItem" key={item.id}>
                  <div className="savedItem__top">
                    <div className="savedItem__title">{item.title}</div>
                    <button className="iconBtn" onClick={() => removeSaved(item.id)} title="Remove">
                      ✕
                    </button>
                  </div>

                  <div className="savedItem__meta">
                    <span className="metaTag">{item.source}</span>
                    <span className="metaTag">{new Date(item.savedAt).toLocaleString()}</span>
                  </div>

                  <div className="savedSwatches">
                    {item.colors.slice(0, 6).map((c, i) => (
                      <span key={i} className="savedSwatch" style={{ background: c.hex }} title={c.hex} />
                    ))}
                  </div>

                  <div className="savedItem__actions">
                    <button className="miniBtn" onClick={() => loadSaved(item)}>
                      Open
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="footer">© {new Date().getFullYear()} AI Color Catalog</footer>
    </div>
  );
}