import React from 'react';
import './KeysTable.css';

export default function KeysTable({ keys, onDelete, onBlockUser, onToggleActive, onEditExpiry }) {
  if (!keys || keys.length === 0) {
    return <div className="keys-table-empty">No keys found.</div>;
  }

  return (
    <table className="keys-table">
      <thead>
        <tr>
          <th>Key ID</th>
          <th>User ID</th>
          <th>Expiry</th>
          <th>Active</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {keys.map(key => (
          <tr key={key.keyId}>
            <td>{key.keyId}</td>
            <td>{key.userId}</td>
            <td>{key.expiry}</td>
            <td>{key.active ? 'Yes' : 'No'}</td>
            <td>
              <button onClick={() => onDelete(key.keyId)}>Delete</button>
              <button onClick={() => onBlockUser(key.userId)}>Block User</button>
              <button onClick={() => onToggleActive(key.keyId)}>{key.active ? 'Deactivate' : 'Activate'}</button>
              <button onClick={() => onEditExpiry(key.keyId)}>Edit Expiry</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
