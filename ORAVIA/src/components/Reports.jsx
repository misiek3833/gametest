import React, { useState, useEffect } from 'react';
import { getDatabase, ref, onValue, update } from "firebase/database";
import { formatTime } from '../gameUtils';

const Reports = ({ user }) => {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
    if (!user) return;
    const db = getDatabase();
    // Sortowanie po timestampie (w Realtime DB najlepiej robić to query, tu sortujemy kliencko dla prostoty)
    const reportsRef = ref(db, `reports/${user.uid}`);
    
    onValue(reportsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data).map(([key, val]) => ({ id: key, ...val }));
        // Sort DESC
        list.sort((a, b) => b.timestamp - a.timestamp);
        setReports(list);
      }
    });
  }, [user]);

  const openReport = (report) => {
    setSelectedReport(report);
    // Oznacz jako przeczytany
    if (!report.isRead) {
      const db = getDatabase();
      update(ref(db, `reports/${user.uid}/${report.id}`), { isRead: true });
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 h-96 flex flex-col">
      <h2 className="text-xl text-amber-500 font-serif mb-4 border-b border-slate-700 pb-2">Battle Reports</h2>
      
      {!selectedReport ? (
        <div className="overflow-y-auto flex-1 space-y-2">
          {reports.length === 0 && <p className="text-gray-500 text-sm">No reports yet.</p>}
          {reports.map(r => (
            <div 
              key={r.id} 
              onClick={() => openReport(r)}
              className={`p-3 rounded cursor-pointer flex items-center justify-between hover:bg-slate-800 transition ${!r.isRead ? 'bg-slate-800 border-l-4 border-amber-500' : 'bg-slate-900 border border-slate-800'}`}
            >
              <div className="flex items-center gap-3">
                {/* Status Dot */}
                <div className={`w-3 h-3 rounded-full ${r.winner === 'attacker' ? (Object.values(r.attackerLosses).some(x=>x>0) ? 'bg-yellow-500' : 'bg-green-500') : 'bg-red-600'}`}></div>
                <div>
                  <div className="text-sm text-gray-200 font-bold">
                    {r.type === 'attack_sent' ? `Attack on Village` : `Defense of Village`}
                  </div>
                  <div className="text-xs text-gray-500">{new Date(r.timestamp).toLocaleString()}</div>
                </div>
              </div>
              
              {/* Loot preview */}
              {r.loot && (r.loot.wood + r.loot.stone > 0) && (
                <span className="text-xs text-amber-300">💰 Looted</span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <ReportDetail report={selectedReport} onBack={() => setSelectedReport(null)} />
      )}
    </div>
  );
};

const ReportDetail = ({ report, onBack }) => {
  return (
    <div className="flex-1 overflow-y-auto animate-fadeIn">
      <button onClick={onBack} className="text-xs text-amber-500 mb-4 hover:underline">← Back to list</button>
      
      <div className={`border-l-4 pl-4 mb-4 ${report.winner === 'attacker' ? 'border-green-500' : 'border-red-600'}`}>
        <h3 className="text-lg text-white font-bold">
          {report.winner === 'attacker' ? 'Victory!' : 'Defeat!'}
        </h3>
        <p className="text-xs text-gray-400">Battle time: {new Date(report.timestamp).toLocaleString()}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-800 p-3 rounded">
          <h4 className="text-amber-500 text-sm font-bold mb-2">Attacker</h4>
          <UnitTable losses={report.attackerLosses} />
        </div>
        <div className="bg-slate-800 p-3 rounded">
          <h4 className="text-blue-400 text-sm font-bold mb-2">Defender</h4>
          <UnitTable losses={report.defenderLosses} />
        </div>
      </div>

      {report.loot && (
        <div className="bg-slate-800 p-4 rounded border border-slate-700">
          <h4 className="text-xs text-gray-400 uppercase tracking-widest mb-2">Loot Resources</h4>
          <div className="flex gap-4 text-sm font-mono text-white">
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-amber-700 rounded-full"></span> Wood: {report.loot.wood}</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-gray-400 rounded-full"></span> Stone: {report.loot.stone}</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-300 rounded-full"></span> Iron: {report.loot.iron}</span>
          </div>
        </div>
      )}
    </div>
  );
};

const UnitTable = ({ losses }) => {
  if (!losses) return null;
  return (
    <table className="w-full text-xs text-left">
      <thead>
        <tr className="text-gray-500 border-b border-slate-600">
          <th className="pb-1">Unit</th>
          <th className="pb-1 text-right">Lost</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(losses).map(([unit, count]) => (
          count > 0 && (
            <tr key={unit} className="border-b border-slate-700/50">
              <td className="py-1 capitalize text-gray-300">{unit}</td>
              <td className="py-1 text-right text-red-400 font-bold">-{count}</td>
            </tr>
          )
        ))}
        {Object.values(losses).every(x => x === 0) && (
          <tr><td colSpan="2" className="py-2 text-center text-gray-500 italic">No losses</td></tr>
        )}
      </tbody>
    </table>
  );
};

export default Reports;