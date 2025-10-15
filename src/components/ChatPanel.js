import { useEffect, useRef, useState } from 'react';
import {
  Widget,
  addResponseMessage,
  isWidgetOpened,
  toggleWidget,
} from 'react-chat-widget';
import 'react-chat-widget/lib/styles.css';
import { useAuth } from '../auth/AuthProvider';

const ChatPanel = () => {
  const initializedRef = useRef(false);
  const sessionRef = useRef(null);
  const [isSending, setIsSending] = useState(false);
  const { getAccessToken, isAuthenticated, login } = useAuth();

  useEffect(() => {
    if (initializedRef.current) {
      return;
    }

    addResponseMessage(
      `Hello!  My name is Rose, and I am here to help!  I am unique from other AI Agents because of my spatial awareness - try uploading an image and we can discuss it!`
    );

    if (!isWidgetOpened()) {
      toggleWidget();
    }

    initializedRef.current = true;
  }, []);

  const handleNewUserMessage = async (message) => {
    if (isSending) {
      addResponseMessage('Still working on the last request, please wait a moment.');
      return;
    }

    setIsSending(true);

    try {
      if (!isAuthenticated) {
        await login();
        addResponseMessage('Redirecting to authenticate. Try again after signing in.');
        return;
      }

      const token = await getAccessToken();

      if (!token) {
        addResponseMessage('Unable to retrieve your access token. Please sign in again.');
        return;
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message,
          sessionId: sessionRef.current,
        }),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        const errorMessage = errorPayload.error || 'Unexpected error talking to the server.';
        addResponseMessage(errorMessage);
        return;
      }

      const data = await response.json();
      sessionRef.current = data.sessionId || sessionRef.current;

      const replies = Array.isArray(data.messages) ? data.messages : [];
      if (!replies.length) {
        addResponseMessage('The assistant did not return any content.');
        return;
      }

      replies.forEach((reply) => {
        if (reply?.content) {
          addResponseMessage(reply.content);
        }
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Chat request failed', error);
      addResponseMessage('Failed to reach the chat service. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="chat-panel">
      <Widget
        title="Chat"
        subtitle='What would you like to explore?'
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
