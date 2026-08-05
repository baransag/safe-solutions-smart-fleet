import { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';

export default function FloatingHelp() {
  const [showTooltip, setShowTooltip] = useState(false);

  const handleClick = () => {
    // WhatsApp deep link (configurable number)
    const phone = '923001234567'; // Manager's WhatsApp
    const message = encodeURIComponent('Hello, I need help with the SAFE SOLUTIONS fleet system.');
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  return (
    <div className="floating-help">
      {showTooltip && (
        <div className="floating-help-tooltip">
          Need help? Chat on WhatsApp
        </div>
      )}
      <button
        className="floating-help-btn"
        onClick={handleClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        aria-label="Get help on WhatsApp"
      >
        <MessageCircle size={26} />
      </button>
    </div>
  );
}
