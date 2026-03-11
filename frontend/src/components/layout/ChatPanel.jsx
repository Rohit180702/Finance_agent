import { X, MessageSquare } from 'lucide-react';
import Chat from '../Chat/Chat';

const ChatPanel = ({ isOpen, onClose }) => (
  <>
    {/* Click-outside overlay */}
    <div
      className={`chat-overlay${isOpen ? ' is-open' : ''}`}
      onClick={onClose}
      aria-hidden="true"
    />

    <aside className={`chat-panel${isOpen ? ' is-open' : ''}`} aria-label="AI Chat panel">
      <div className="chat-panel-header">
        <div className="chat-panel-title">
          <MessageSquare size={15} />
          <span>AI Chat</span>
        </div>
        <button className="icon-btn" onClick={onClose} aria-label="Close chat">
          <X size={15} />
        </button>
      </div>

      <div className="chat-panel-body">
        <Chat />
      </div>
    </aside>
  </>
);

export default ChatPanel;
