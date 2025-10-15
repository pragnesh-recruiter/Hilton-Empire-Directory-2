import React, { useEffect, useState } from "react";

const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ0S7IpjAxgWRyiuVcX7fVGJr9XvhAjx5XgHhwcYiDn7QrEndKSq7m8vAjF3WJSq0PfhXoK3oLufnkD/pub?output=csv"; // replace with your CSV link

export default function App() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({});

  useEffect(() => {
    fetch(SHEET_CSV_URL)
      .then(res => res.text())
      .then(text => {
        const lines = text.split("\n").map(l => l.split(","));
        const headers = lines[0];
        const data = lines.slice(1).map(r => Object.fromEntries(r.map((v, i) => [headers[i], v])));
        setRows(data.filter(r => r["Flat No"]));
        calcSummary(data);
      });
  }, []);

  function calcSummary(data) {
    const flats = data.filter(r => r["Flat No"]);
    const summaryData = {
      flats: flats.length,
      malik: flats.filter(r => r["Type"]?.includes("માલિક")).length,
      bhaduat: flats.filter(r => r["Type"]?.includes("ભાડુઆત")).length,
      members: flats.reduce((a, b) => a + (parseInt(b["સભ્ય સંખ્યા"]) || 0), 0),
      twoW: flats.reduce((a, b) => a + (parseInt(b["2 Wheeler"]) || 0), 0),
      fourW: flats.reduce((a, b) => a + (parseInt(b["4 Wheeler"]) || 0), 0),
    };
    setSummary(summaryData);
  }

  return (
    <div className="container">
      <h1>Hilton Empire B Wing Directory</h1>

      <div className="summary">
        <div>🏢 કુલ ફલેટ: {summary.flats}</div>
        <div>👨‍💼 માલિક: {summary.malik}</div>
        <div>🏠 ભાડુઆત: {summary.bhaduat}</div>
        <div>👪 કુલ સભ્ય: {summary.members}</div>
        <div>🛵 2 વ્હીલર: {summary.twoW}</div>
        <div>🚗 4 વ્હીલર: {summary.fourW}</div>
      </div>

      <div className="directory">
        {rows.map((r, i) => (
          <div className="card" key={i}>
            <h2>{r["Flat No"]}</h2>
            {r["Type"]?.includes("ભાડુઆત") ? (
              <>
                <div>ભાડુઆત: {r["ભાડુઆત નામ"]}</div>
                <div>માલિક: {r["માલિક નામ"]}</div>
              </>
            ) : (
              <div>માલિક: {r["માલિક નામ"]}</div>
            )}
            <div>મૂળ ગામ: {r["મૂળ ગામ"]}</div>
            <div>સભ્ય: {r["સભ્ય સંખ્યા"]}</div>
            <div>2 વ્હીલર: {r["2 Wheeler"]}</div>
            <div>4 વ્હીલર: {r["4 Wheeler"]}</div>
            <div>
              📞 <a href={tel:${r["Phone"]}}>{r["Phone"]}</a> |
              💬 <a href={https://wa.me/${r["Phone"]}} target="_blank">WhatsApp</a>
            </div>
          </div>
        ))}
      </div>

      <footer>
        <h3>Emergency Contacts</h3>
        <p>President: 9999999999</p>
        <p>Lift: 9999999999</p>
        <p>Electrician: 9999999999</p>
        <p>Plumber: 9999999999</p>
        <p>Rickshaw: 9999999999</p>
      </footer>
    </div>
  );
}
