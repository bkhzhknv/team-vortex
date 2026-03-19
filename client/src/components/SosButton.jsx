import React, { useState } from 'react';
import './SosButton.css';

function SosButton({ onEscalate }) {
  const [confirming, setConfirming] = useState(false);
  const [escalated, setEscalated] = useState(false);

  const handleClick = () => {
    if (escalated) return;
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setEscalated(true);
    onEscalate();
  };

  const handleCancel = () => {
    setConfirming(false);
  };

  if (escalated) {
    return (
      <div className="sos-section sos-done">
        <div className="sos-done__icon">🚨</div>
        <div className="sos-done__text">
          <strong>ESCALATED TO EMERGENCY SERVICES</strong>
          <span>102/103 Dispatched. Nearby volunteers pinged.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="sos-section">
      <div className="sos-info">
        <strong>⚡ Escalate to Emergency?</strong>
        <p>If this situation is life-threatening, escalate to Red priority.</p>
      </div>
      <div className="sos-buttons">
        <button
          className={`sos-btn ${confirming ? 'sos-btn--confirm' : ''}`}
          onClick={handleClick}
          aria-label={confirming ? 'Confirm escalation' : 'Escalate incident'}
          id="sos-escalate-btn"
        >
          {confirming ? '⚠️ CONFIRM ESCALATION' : '🚨 SOS / ESCALATE'}
        </button>
        {confirming && (
          <button className="sos-cancel" onClick={handleCancel} aria-label="Cancel escalation">
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

export default SosButton;
