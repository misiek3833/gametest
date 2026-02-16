import React, { useState, useEffect } from 'react';
import { getDatabase, ref, onValue, query, orderByChild, limitToLast } from "firebase/database";

const SocialHub = ({ user, actions }) => {
  const [activeTab, setActiveTab] = useState('ranking');
  
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 h-96 flex flex-col">
      <div className="flex gap-2 mb-4 border-b border-slate-700 pb-2">
        {['Ranking', 'Messages', 'Tribe'].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab.toLowerCase())}
            className={`px-3 py-1 text-sm font-bold uppercase rounded ${activeTab === tab.toLowerCase() ? 'bg-amber-600 text-white' : 'bg-slate-800 text-gray-400 hover:bg-slate-700'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'ranking' && <RankingView />}
        {activeTab === 'messages' && <MessagesView user={user} sendMessage={actions.sendMessage} />}
        {activeTab === 'tribe' && <TribeView user={user} createTribe={actions.createTribe} />}
      </div>
    </div>
  );
};

// --- SUB-KOMPONENTY ---

const RankingView = () => {
  const [ranking, setRanking] = useState([]);

  useEffect(() => {
    const db = getDatabase();
    // Pobieramy wioski, bo punkty są w wioskach (w realnej grze: agregacja User Points)
    // Uproszczenie: Ranking Wiosek
    const vRef = query(ref(db, 'villages'), orderByChild('points'), limitToLast(20));
    
    onValue(vRef, (snap) => {
      const data = snap.val();
      if (data) {
        // Firebase zwraca obiekt, zamieniamy na tablicę i sortujemy DESC
        const sorted = Object.values(data).sort((a, b) => b.points - a.points);
        setRanking(sorted);
      }
    });
  }, []);

  return (
    <table className="w-full text-sm text-left text-gray-300">
      <thead className="text-xs text-gray-500 uppercase bg-slate-800">
        <tr>
          <th className="px-2 py-2">Rank</th>
          <th className="px-2 py-2">Village</th>
          <th className="px-2 py-2 text-right">Points</th>
        </tr>
      </thead>
      <tbody>
        {ranking.map((v, idx) => (
          <tr key={v.id} className="border-b border-slate-800 hover:bg-slate-800">
            <td className="px-2 py-2">{idx + 1}.</td>
            <td className="px-2 py-2">{v.name} <span className="text-xs text-gray-500">({v.coords.x}|{v.coords.y})</span></td>
            <td className="px-2 py-2 text-right font-bold text-amber-500">{v.points}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const MessagesView = ({ user, sendMessage }) => {
    const [msgs, setMsgs] = useState([]);
    const [toId, setToId] = useState('');
    const [text, setText] = useState('');

    useEffect(() => {
        if(!user) return;
        const db = getDatabase();
        const mRef = ref(db, `messages/${user.uid}`);
        onValue(mRef, (snap) => {
            const data = snap.val();
            if(data) setMsgs(Object.values(data).reverse());
        });
    }, [user]);

    const handleSend = () => {
        sendMessage(toId, "No Subject", text);
        setText('');
    };

    return (
        <div>
            <div className="bg-slate-800 p-2 mb-4 rounded">
                <input className="bg-slate-700 w-full mb-2 p-1 text-sm rounded text-white" placeholder="Recipient UID" value={toId} onChange={e=>setToId(e.target.value)} />
                <textarea className="bg-slate-700 w-full p-1 text-sm rounded text-white" placeholder="Message body..." value={text} onChange={e=>setText(e.target.value)} />
                <button onClick={handleSend} className="bg-amber-600 text-xs font-bold px-4 py-1 rounded mt-1">SEND</button>
            </div>
            <div className="space-y-2">
                {msgs.map((m, i) => (
                    <div key={i} className="border border-slate-700 p-2 rounded text-xs">
                        <div className="font-bold text-amber-500">{m.senderName} <span className="text-gray-500 font-normal">{new Date(m.timestamp).toLocaleTimeString()}</span></div>
                        <div className="text-gray-300">{m.body}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const TribeView = ({ user, createTribe }) => {
    const [tagName, setTagName] = useState('');
    
    // Jeśli user ma tribeId, wyświetl info. Jeśli nie, formularz tworzenia.
    // (Wymaga przekazania tribeData z hooka, tu uproszczone)
    
    return (
        <div className="p-4 text-center">
            <h3 className="text-gray-300 mb-4">Create or Join Tribe</h3>
            <input className="bg-slate-700 p-2 rounded text-white mb-2" placeholder="Tribe TAG (e.g. LOL)" maxLength={4} value={tagName} onChange={e=>setTagName(e.target.value)} />
            <button onClick={() => createTribe("My Tribe", tagName)} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded block w-full">
                CREATE TRIBE
            </button>
        </div>
    );
};

export default SocialHub;