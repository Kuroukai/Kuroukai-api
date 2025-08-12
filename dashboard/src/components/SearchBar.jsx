import React, { useState } from 'react';
import './SearchBar.css';

export default function SearchBar({ onSearch }) {
  const [searchType, setSearchType] = useState('key');
  const [input, setInput] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim()) {
      onSearch(searchType, input.trim());
    }
  };

  return (
    <form className="search-bar" onSubmit={handleSubmit}>
      <select value={searchType} onChange={e => setSearchType(e.target.value)}>
        <option value="key">Key ID</option>
        <option value="user">User ID</option>
      </select>
      <input
        type="text"
        placeholder={searchType === 'key' ? 'Enter Key ID...' : 'Enter User ID...'}
        value={input}
        onChange={e => setInput(e.target.value)}
      />
      <button type="submit">Search</button>
    </form>
  );
}
