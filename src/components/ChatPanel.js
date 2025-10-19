import { useCallback, useMemo, useRef } from 'react';
import ChatBot, {
  ChatBotProvider,
  RcbEvent,
  useChatWindow,
  useMessages,
  useOnRcbEvent,
  useTextArea,
} from 'react-chatbotify';
import { useAuth } from '../auth/AuthProvider';
import {
  addGalleryImageByUrl,
  getActiveGalleryImageUrl,
  setActiveGalleryImageUrl,
} from '../galleryController';

const arrayBufferToBase64 = (buffer) => {
  if (!buffer) {
    return '';
  }

  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192;
  let binary = '';

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
};

const prepareChatImagePayload = async (url) => {
  if (!url || typeof url !== 'string') {
    return null;
  }

  const trimmedUrl = url.trim();
  if (!trimmedUrl) {
    return null;
  }

  if (trimmedUrl.toLowerCase().startsWith('s3://')) {
    return {
      image: {
        s3Url: trimmedUrl,
      },
    };
  }

  try {
    const response = await fetch(trimmedUrl, { mode: 'cors' });
    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get('content-type') || 'image/png';
    const buffer = await response.arrayBuffer();
    if (!buffer || buffer.byteLength === 0) {
      return null;
    }

    return {
      image: {
        base64: arrayBufferToBase64(buffer),
        mediaType: contentType,
      },
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Unable to prepare chat image attachment', error);
    return null;
  }
};

const ChatPanelInner = ({ flow, settings }) => {
  const sessionRef = useRef(null);
  const isSendingRef = useRef(false);
  const { getAccessToken, isAuthenticated, login } = useAuth();
  const messagesApi = useMessages();
  const textAreaApi = useTextArea();
  const chatWindowApi = useChatWindow();

  const injectMessage = messagesApi?.injectMessage;
  const setTextAreaValue = textAreaApi?.setTextAreaValue;
  const toggleTextAreaDisabled = textAreaApi?.toggleTextAreaDisabled;
  const toggleIsBotTyping = chatWindowApi?.toggleIsBotTyping;

  const handleUserSubmit = useCallback(
    async (event) => {
      if (
        !injectMessage ||
        !setTextAreaValue ||
        !toggleTextAreaDisabled ||
        !toggleIsBotTyping
      ) {
        event?.preventDefault?.();
        return;
      }

      const incomingMessage = event?.data?.inputText ?? '';
      const message = incomingMessage.trim();

      if (!message) {
        event.preventDefault();
        await setTextAreaValue('');
        return;
      }

      event.preventDefault();
      await setTextAreaValue('');

      if (isSendingRef.current) {
        await injectMessage(message, 'USER');
        await injectMessage('Still working on the last request, please wait a moment.', 'BOT');
        return;
      }

      isSendingRef.current = true;
      toggleTextAreaDisabled(true);
      await injectMessage(message, 'USER');

      try {
        if (!isAuthenticated) {
          await login();
          await injectMessage('Redirecting to authenticate. Try again after signing in.', 'BOT');
          return;
        }

        const token = await getAccessToken();

        if (!token) {
          await injectMessage('Unable to retrieve your access token. Please sign in again.', 'BOT');
          return;
        }

        toggleIsBotTyping(true);

        const activeImageUrl = getActiveGalleryImageUrl();
        const imagePayload = await prepareChatImagePayload(activeImageUrl);

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            message,
            sessionId: sessionRef.current,
            ...(imagePayload ?? {}),
          }),
        });

        if (!response.ok) {
          const errorPayload = await response.json().catch(() => ({}));
          const errorMessage = errorPayload.error || 'Unexpected error talking to the server.';
          await injectMessage(errorMessage, 'BOT');
          return;
        }

        const data = await response.json();
        sessionRef.current = data.sessionId || sessionRef.current;

        const replies = Array.isArray(data.messages) ? data.messages : [];
        if (!replies.length) {
          await injectMessage('The assistant did not return any content.', 'BOT');
          return;
        }

        const artifacts = Array.isArray(data.artifacts) ? data.artifacts : [];
        const displayImages = Array.isArray(data.displayImages) ? data.displayImages : [];

        artifacts.forEach((artifact) => {
          const url = artifact?.url;
          if (!url) {
            return;
          }

          addGalleryImageByUrl(url, {
            description: artifact?.label,
            sourceId: artifact?.id ?? url,
            metadata: artifact,
          });
        });

        displayImages.forEach((item, index) => {
          const url = item?.url;
          if (!url) {
            return;
          }

          addGalleryImageByUrl(url, {
            description: item?.description ?? item?.message,
            sourceId: item?.id ?? url,
            metadata: item,
          });

          if (index === 0) {
            setActiveGalleryImageUrl(url);
          }
        });

        // ensure replies render sequentially with consistent sender roles
        // eslint-disable-next-line no-restricted-syntax
        for (const reply of replies) {
          if (reply?.content) {
            const { role } = reply;
            const sender = typeof role === 'string' && role.toUpperCase() === 'SYSTEM' ? 'SYSTEM' : 'BOT';
            // eslint-disable-next-line no-await-in-loop
            await injectMessage(reply.content, sender);
          }
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Chat request failed', error);
        await injectMessage('Failed to reach the chat service. Please try again.', 'BOT');
      } finally {
        toggleIsBotTyping(false);
        toggleTextAreaDisabled(false);
        isSendingRef.current = false;
      }
    },
    [getAccessToken, injectMessage, isAuthenticated, login, setTextAreaValue, toggleIsBotTyping, toggleTextAreaDisabled]
  );

  useOnRcbEvent(RcbEvent.USER_SUBMIT_TEXT, handleUserSubmit);

  return <ChatBot flow={flow} settings={settings} />;
};

const ChatPanel = () => {
  const greetingMessage =
    'Hello!  My name is Rose, and I am here to help!  I am unique from other AI Agents because of my spatial awareness - try uploading an image and we can discuss it!';
  const flow = useMemo(
    () => ({
      start: {
        message: greetingMessage,
        path: 'await_user_input',
      },
      await_user_input: {
        chatDisabled: false,
      },
    }),
    [greetingMessage]
  );
  const settings = useMemo(
    () => ({
      general: {
        showFooter: false,
        embedded: true,
      },
      header: {
        title: 'Chat',
        showAvatar: false,
      },
      chatWindow: {
        defaultOpen: true,
        autoJumpToBottom: true,
        showTypingIndicator: true,
      },
      chatInput: {
        enabledPlaceholderText: 'Type a message...',
        disabledPlaceholderText: 'Working on it...',
        blockSpam: true,
      },
      notification: {
        disabled: true,
      },
      audio: {
        disabled: true,
      },
      voice: {
        disabled: true,
      },
      fileAttachment: {
        disabled: true,
      },
      emoji: {
        disabled: true,
      },
      event: {
        rcbUserSubmitText: true,
      },
    }),
    []
  );

  return (
    <div className="chat-panel">
      <ChatBotProvider>
        <ChatPanelInner flow={flow} settings={settings} />
      </ChatBotProvider>
    </div>
  );
};

export default ChatPanel;
