import React, { useEffect, useState } from 'react';
import './StatusBar.css';

export default function StatusBar({ apiBase = 'https://kuroukai-free-api.up.railway.app' }) {
  const [status, setStatus] = useState('Loading...');
  const [online, setOnline] = useState(false);

  useEffect(() => {
    fetch(`${apiBase}/health`)
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        setStatus('Online');
        setOnline(true);
      })
      .catch(() => {
        setStatus('Offline');
        setOnline(false);
      });
  }, [apiBase]);

  return (
    <div className={`status-bar ${online ? 'online' : 'offline'}`}>API Status: {status}</div>
  );
}
