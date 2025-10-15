import React, { useEffect, useState } from "react";
import Papa from "papaparse";
import "./style.css";

const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ0S7IpjAxgWRyiuVcX7fVGJr9XvhAjx5XgHhwcYiDn7QrEndKSq7m8vAjF3WJSq0PfhXoK3oLufnkD/pub?output=csv";

export default function App() {
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState({
    flats: 0,
    malik: 0,
    bhadaat: 0,
    sabhya: 0,
    twoW: 0,
    fourW: 0,
  });

  useEffect(() => {
    fetch(SHEET_CSV_URL)
      .then((res) => res.text())
      .then((csvText) => {
        const result = Papa.parse(csvText, { header: true });
        const rows = result.data.filter((r) => r.Flat && r.Flat !== "");
        setData(rows);

        // Summary count
        const totalFlats = rows.length;
        const totalMalik = rows.filter((r) => r.પ્રકાર === "માલિક").length;
        const totalBhadaat = rows.filter((r) => r.પ્રકાર === "ભાડુઆત").length;
        const totalSabhya = rows.reduce(
          (sum, r) => sum + (parseInt(r["Total સભ્ય"]) || 0),
          0
        );
        const totalTwo = rows.reduce(
          (sum, r) => sum + (parseInt(r["Two Wheeler"]) || 0),
          0
        );
        const totalFour = rows.reduce(
          (sum, r) => sum + (parseInt(r["Four Wheeler"]) || 0),
          0
        );

        setSummary({
          flats: totalFlats,
          malik: totalMalik,
          bhadaat: totalBhadaat,
          sabhya: totalSabhya,
          twoW: totalTwo,
          fourW: totalFour,
        });
      })
      .catch((err) => console.error("Error loading sheet:", err));
  }, []);

  return (
    <div className="container">
      <h1>Hilton Empire B Wing Directory</h1>

      <div className="summary">
        <p>🏢 કુલ ફ્લેટ: {summary.flats}</p>
        <p>👨‍💼 કુલ માલિક: {summary.malik}</p>
        <p>👨‍👩‍👧‍👦 કુલ સભ્ય સંખ્યા: {summary.sabhya}</p>
        <p>🏠 કુલ ભાડુઆત: {summary.bhadaat}</p>
        <p>🛵 ટુ વ્હીલર: {summary.twoW}</p>
        <p>🚗 ફોર વ્હીલર: {summary.fourW}</p>
      </div>

      <div className="directory">
        {data.map((item, idx) => (
          <div key={idx} className="card">
            <h2>
              {item.Flat} — {item.પ્રકાર}
            </h2>
            <p>
              <b>નામ:</b>{" "}
              {item["ભાડુઆત નામ"] || item["માલિક નામ"] || "—"}
            </p>
            {item["માલિક નામ"] && item["ભાડુઆત નામ"] ? (
              <p>
                <b>માલિક:</b> {item["માલિક નામ"]}
              </p>
            ) : null}
            <p>
              <b>સભ્ય સંખ્યા:</b> {item["Total સભ્ય"]}
            </p>
            <p>
              <b>2W:</b> {item["Two Wheeler"]} | <b>4W:</b> {item["Four Wheeler"]}
            </p>
            <p>
              📞{" "}
              <a href={tel:${item.Phone}}>{item.Phone}</a> | 💬{" "}
              <a
                href={https://wa.me/${item.Phone}}
                target="_blank"
                rel="noreferrer"
              >
                WhatsApp
              </a>
            </p>
          </div>
        ))}
      </div>

      <div className="emergency">
        <h3>🚨 ઈમરજન્સી સંપર્ક</h3>
        <p>પ્રેસિડન્ટ: +91XXXXXXXXXX</p>
        <p>લિફ્ટ મેન: +91XXXXXXXXXX</p>
        <p>ઇલેક્ટ્રિશિયન: +91XXXXXXXXXX</p>
        <p>પ્લમ્બર: +91XXXXXXXXXX</p>
        <p>રિક્શા ડ્રાઈવર: +91XXXXXXXXXX</p>
      </div>
    </div>
  );
}
