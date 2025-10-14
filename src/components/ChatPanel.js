import { useEffect, useRef } from 'react';
import {
  Widget,
  addResponseMessage,
  isWidgetOpened,
  toggleWidget,
} from 'react-chat-widget';
import 'react-chat-widget/lib/styles.css';

const ChatPanel = () => {
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) {
      return;
    }

    addResponseMessage('Hello! This is a demo conversation.');
    addResponseMessage('Need anything? Start typing below.');

    if (!isWidgetOpened()) {
      toggleWidget();
    }

    initializedRef.current = true;
  }, []);

  const handleNewUserMessage = (message) => {
    addResponseMessage(`Echo: ${message}`);
  };

  return (
    <div className="chat-panel">
      <Widget
        title="Rose Chat"
        subtitle="Ask me anything"
        senderPlaceHolder="Type a message..."
        showCloseButton={false}
        fullScreenMode={false}
        handleNewUserMessage={handleNewUserMessage}
        launcher={() => null}
      />
    </div>
  );
};

export default ChatPanel;
