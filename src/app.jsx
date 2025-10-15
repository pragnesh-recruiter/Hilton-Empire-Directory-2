import React, { useEffect, useState, useMemo, useRef } from "react";

const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ0S7IpjAxgWRyiuVcX7fVGJr9XvhAjx5XgHhwcYiDn7QrEndKSq7m8vAjF3WJSq0PfhXoK3oLufnkD/pub?output=csv";
const REFRESH_INTERVAL_MS = 60 * 1000; // refresh every 60 seconds
const DEFAULT_COUNTRY_CODE = "91";

function splitCSVLine(line) {
  const result = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      result.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  result.push(cur);
  return result;
}

function parseCSV(csv) {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const headers = splitCSVLine(lines[0]).map((h) => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = splitCSVLine(lines[i]);
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = parts[j] !== undefined ? parts[j].trim() : "";
    }
    rows.push(obj);
  }
  return rows;
}

function normalizePhoneForLink(raw) {
  if (!raw) return null;
  const digits = raw.replace(/[^0-9]/g, "");
  if (digits.length === 10) return ${DEFAULT_COUNTRY_CODE}${digits};
  if (digits.length > 10) return digits;
  return digits;
}

function telLink(number) {
  const n = normalizePhoneForLink(number);
  if (!n) return "#";
  return tel:+${n};
}

function whatsappLink(number, text = "") {
  const n = normalizePhoneForLink(number);
  if (!n) return "#";
  const encoded = encodeURIComponent(text);
  return `https://wa.me/${n}${text ? ?text=${encoded} : ""}`;
}

export default function App() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [sortKey, setSortKey] = useState("Apartment");
  const [emergency, setEmergency] = useState({
    President: "",
    Lift: "",
    Electrician: "",
    Plumber: "",
    Rikshaw: "",
  });

  const deferredPromptRef = useRef(null);
  const [canInstall, setCanInstall] = useState(false);

  // PWA install prompt listener
  useEffect(() => {
    function handleBeforeInstallPrompt(e) {
      e.preventDefault();
      deferredPromptRef.current = e;
      setCanInstall(true);
    }
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  async function triggerInstall() {
    const promptEvent = deferredPromptRef.current;
    if (!promptEvent) return;
    promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    deferredPromptRef.current = null;
    setCanInstall(false);
  }

  // Fetch CSV & map data
  async function fetchSheet() {
    try {
      setLoading(true);
      const resp = await fetch(SHEET_CSV_URL, { cache: "no-cache" });
      if (!resp.ok) throw new Error("Failed to fetch sheet: " + resp.status);
      const text = await resp.text();
      const parsed = parseCSV(text);

      const mapped = parsed.map((r) => ({
        Apartment:
          r["Apartment"] ||
          r["Flat"] ||
          r["Flat No"] ||
          r["FlatNo"] ||
          r["ફલેટ"] ||
          "",
        NativePlace: r["NativePlace"] || r["મૂળ ગામ"] || r["Native Place"] || "",
        Role: r["Role"] || r["માલિક/ભાડુઆત"] || r["RoleLabel"] || "",
        Name: r["Name"] || r["નામ"] || "",
        MalikName: r["MalikName"] || r["માલિકનું નામ"] || r["Malik"] || "",
        TotalSabhy: r["TotalSabhy"] || r["Total સભ્ય"] || r["Members"] || "",
        TwoWheeler: r["TwoWheeler"] || r["2 Wheeler"] || r["Two Wheeler"] || "",
        FourWheeler: r["FourWheeler"] || r["4 Wheeler"] || r["Four Wheeler"] || "",
        Phone: r["Phone"] || r["Mobile"] || r["Contact"] || r["મોબાઇલ"] || "",
        WhatsApp: r["WhatsApp"] || r["વોટ્સએપ"] || "",
        EmergencyPresident: r["EmergencyPresident"] || r["પ્રેસિડન્ટ"] || "",
        EmergencyLift: r["EmergencyLift"] || r["લિફ્ટ"] || "",
        EmergencyElectrician: r["EmergencyElectrician"] || r["Electrician"] || "",
        EmergencyPlumber: r["EmergencyPlumber"] || r["Plumber"] || "",
        EmergencyRikshaw: r["EmergencyRikshaw"] || r["Rickshaw"] || "",
      }));

      // pick up emergency from first non-empty row
      const e = mapped.find((m) => m.EmergencyPresident || m.EmergencyLift || m.EmergencyElectrician || m.EmergencyPlumber || m.EmergencyRikshaw);
      if (e) {
        setEmergency({
          President: e.EmergencyPresident || emergency.President,
          Lift: e.EmergencyLift || emergency.Lift,
          Electrician: e.EmergencyElectrician || emergency.Electrician,
          Plumber: e.EmergencyPlumber || emergency.Plumber,
          Rikshaw: e.EmergencyRikshaw || emergency.Rikshaw,
        });
      }

      setRows(mapped);
      setLastUpdated(new Date().toLocaleString());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSheet();
    const id = setInterval(fetchSheet, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  const filtered = useMemo(() => {
    let arr = rows.slice();
    if (filterRole !== "all") {
      arr = arr.filter((r) => (r.Role || "").toLowerCase().includes(filterRole.toLowerCase()));
    }
    if (search.trim()) {
      const s = search.toLowerCase();
      arr = arr.filter((r) => {
        return (
          (r.Apartment || "").toLowerCase().includes(s) ||
          (r.Name || "").toLowerCase().includes(s) ||
          (r.MalikName || "").toLowerCase().includes(s) ||
          (r.NativePlace || "").toLowerCase().includes(s)
        );
      });
    }
    arr.sort((a, b) => ((a[sortKey] || "") > (b[sortKey] || "") ? 1 : -1));
    return arr;
  }, [rows, search, filterRole, sortKey]);

  const counts = useMemo(() => {
    const totalApartments = rows.length;
    let totalMalik = 0, totalBhad = 0, totalSabhy = 0, totalTwo = 0, totalFour = 0;
    rows.forEach((r) => {
      const role = (r.Role || "").toLowerCase();
      if (role.includes("માલિક") || role.includes("malik")) totalMalik++;
      if (role.includes("ભાડુ") || role.includes("bhad") || role.includes("tenant")) totalBhad++;
      totalSabhy += parseInt((r.TotalSabhy || "").replace(/[^0-9]/g, "")) || 0;
      totalTwo += parseInt((r.TwoWheeler || "").replace(/[^0-9]/g, "")) || 0;
      totalFour += parseInt((r.FourWheeler || "").replace(/[^0-9]/g, "")) || 0;
    });
    return { totalApartments, totalMalik, totalBhad, totalSabhy, totalTwo, totalFour };
  }, [rows]);

  return (
    <div style={{ padding: 16, fontFamily: "sans-serif" }}>
      <header style={{ marginBottom: 16 }}>
        <h1>Hilton Empire B Wing Directory</h1>
        <div style={{ fontSize: 12, color: "#666" }}>Last updated: {lastUpdated}</div>
        {canInstall && (
          <button onClick={triggerInstall} style={{ marginTop: 8, padding: "8px 12px", background: "#0d9488", color: "white", border: "none", borderRadius: 4 }}>
            Add to Home Screen
          </button>
        )}
      </header>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8, marginBottom: 16 }}>
        <div style={{ background: "#ecfeff", padding: 12, borderRadius: 8 }}>🏢 કુલ ફલેટ: {counts.totalApartments}</div>
        <div style={{ background: "#ecfeff", padding: 12, borderRadius: 8 }}>👨‍💼 માલિક: {counts.totalMalik}</div>
        <div style={{ background: "#ecfeff", padding: 12, borderRadius: 8 }}>🏠 ભાડુઆત: {counts.totalBhad}</div>
        <div style={{ background: "#ecfeff", padding: 12, borderRadius: 8 }}>👪 કુલ સભ્ય: {counts.totalSabhy}</div>
        <div style={{ background: "#ecfeff", padding: 12, borderRadius: 8 }}>🛵 2 વ્હીલર: {counts.totalTwo}</div>
        <div style={{ background: "#ecfeff", padding: 12, borderRadius: 8 }}>🚗 4 વ્હીલર: {counts.totalFour}</div>
      </section>

      <section>
        <input
          type="text"
          placeholder="Search apartment, name, native place..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #ccc", marginBottom: 16 }}
        />
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} style={{ padding: 8, borderRadius: 4 }}>
            <option value="all">All Roles</option>
            <option value="માલિક">માલિક</option>
            <option value="ભાડુઆત">ભાડુઆત</option>
            <option value="malik">Malik</option>
            <option value="tenant">Tenant</option>
          </select>
          <select value={sortKey} onChange={(e) => setSortKey(e.target.value)} style={{ padding: 8, borderRadius: 4 }}>
            <option value="Apartment">Sort by Apartment</option>
            <option value="Name">Sort by Name</option>
            <option value="NativePlace">Sort by Native Place</option>
          </select>
        </div>
      </section>

      <section style={{ display: "grid", gap: 12 }}>
        {loading && <div style={{ fontSize: 12, color: "#888" }}>Refreshing data…</div>}
        {filtered.map((r, idx) => {
          const isBhada = (r.Role || "").toLowerCase().includes("ભાડુ") || (r.Role || "").toLowerCase().includes("bhad");
          const contact = r.WhatsApp || r.Phone || "";
          const callLink = telLink(contact);
          const waLink = whatsappLink(contact);
          return (
            <div key={idx} style={{ background: "white", padding: 12, borderRadius: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 12, color: "#666" }}>Apartment</div>
                  <div style={{ fontWeight: 600 }}>{r.Apartment}</div>
                  {r.NativePlace && <div style={{ marginTop: 6 }}>મૂળ ગામ: {r.NativePlace}</div>}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 12, color: "#666" }}>Role</div>
                  <div style={{ fontWeight: 600 }}>{r.Role}</div>
                  <div style={{ fontSize: 12, color: "#666" }}>Total સભ્ય: {r.TotalSabhy || "—"}</div>
                  <div style={{ fontSize: 12, color: "#666" }}>
                    Two: {r.TwoWheeler || 0} | Four: {r.FourWheeler || 0}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 10, borderTop: "1px solid #f0f0f0", paddingTop: 10, display: "flex", justifyContent: "space-between" }}>
                <div>
                  {isBhada ? (
                    <>
                      <div style={{ fontSize: 12, color: "#666" }}>ભાડુઆત</div>
                      <div style={{ fontWeight: 600 }}>{r.Name || "—"}</div>
                      <div style={{ fontSize: 12, color: "#666", marginTop: 6 }}>માલિક</div>
                      <div>{r.MalikName || "—"}</div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 12, color: "#666" }}>માલિક / Owner</div>
                      <div style={{ fontWeight: 600 }}>{r.Name || r.MalikName || "—"}</div>
                    </>
                  )}
                </div>
                <div style={{ textAlign: "right" }}>
                  <a href={callLink} className="btn" style={{ border: "1px solid #ccc" }}>
                    📞 Call
                  </a>
                  <div style={{ height: 8 }} />
                  <a href={waLink} target="_blank" rel="noreferrer" className="btn" style={{ background: "#16a34a", color: "white" }}>
                    💬 WhatsApp
                  </a>
                  <div style={{ fontSize: 12, color: "#888", marginTop: 6 }}>Contact number from sheet</div>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <div style={{ textAlign: "center", color: "#888" }}>No records found</div>}
      </section>

      <footer style={{ marginTop: 24, padding: 12, background: "#fff", borderRadius: 8 }}>
        <h3>Emergency Contacts</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8 }}>
          <div>
            <div style={{ fontSize: 12, color: "#666" }}>President</div>
            <a href={telLink(emergency.President)}>{emergency.President || "—"}</a>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#666" }}>Lift</div>
            <a href={telLink(emergency.Lift)}>{emergency.Lift || "—"}</a>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#666" }}>Electrician</div>
            <a href={telLink(emergency.Electrician)}>{emergency.Electrician || "—"}</a>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#666" }}>Plumber</div>
            <a href={telLink(emergency.Plumber)}>{emergency.Plumber || "—"}</a>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#666" }}>Rickshaw</div>
            <a href={telLink(emergency.Rikshaw)}>{emergency.Rikshaw || "—"}</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
