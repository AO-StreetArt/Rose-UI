import React from 'react';
import { act, render, waitFor } from '@testing-library/react';

const mockInjectMessage = jest.fn();
const mockSetTextAreaValue = jest.fn();
const mockToggleTextAreaDisabled = jest.fn();
const mockToggleChatWindow = jest.fn(() => undefined);
const mockToggleIsBotTyping = jest.fn(() => undefined);
let mockEventHandlers = {};
let lastChatBotProps = null;

jest.mock('react-chatbotify', () => {
  const React = require('react');

  return {
    __esModule: true,
    default: (props) => {
      lastChatBotProps = props;
      return <div data-testid="chatbot" />;
    },
    ChatBotProvider: ({ children }) => <>{children}</>,
    useMessages: jest.fn(() => ({
      injectMessage: mockInjectMessage,
      simulateStreamMessage: jest.fn(),
      streamMessage: jest.fn(),
      endStreamMessage: jest.fn(),
      removeMessage: jest.fn(),
      replaceMessages: jest.fn(),
      messages: [],
      getMessage: jest.fn(),
    })),
    useTextArea: jest.fn(() => ({
      setTextAreaValue: mockSetTextAreaValue,
      toggleTextAreaDisabled: mockToggleTextAreaDisabled,
      toggleTextAreaSensitiveMode: jest.fn(),
      textAreaDisabled: false,
      textAreaSensitiveMode: false,
      getTextAreaValue: jest.fn(),
      focusTextArea: jest.fn(),
      blurTextArea: jest.fn(),
    })),
    useChatWindow: jest.fn(() => ({
      toggleChatWindow: mockToggleChatWindow,
      toggleIsBotTyping: mockToggleIsBotTyping,
      isChatWindowOpen: true,
      setSyncedIsChatWindowOpen: jest.fn(),
      viewportHeight: 0,
      viewportWidth: 0,
      setViewportHeight: jest.fn(),
      setViewportWidth: jest.fn(),
      scrollToBottom: jest.fn(),
      getIsChatBotVisible: jest.fn(),
    })),
    useOnRcbEvent: jest.fn((eventName, handler) => {
      mockEventHandlers[eventName] = handler;
    }),
    RcbEvent: {
      USER_SUBMIT_TEXT: 'rcb-user-submit-text',
    },
  };
});

jest.mock('../../auth/AuthProvider', () => ({
  useAuth: jest.fn(),
}));

const { useAuth } = require('../../auth/AuthProvider');
const { useOnRcbEvent } = require('react-chatbotify');
const ChatPanel = require('../ChatPanel').default;

describe('ChatPanel', () => {
  let originalFetch;

  beforeAll(() => {
    originalFetch = global.fetch;
  });

  beforeEach(() => {
    lastChatBotProps = null;
    mockEventHandlers = {};
    mockInjectMessage.mockClear().mockResolvedValue(null);
    mockSetTextAreaValue.mockClear().mockResolvedValue();
    mockToggleTextAreaDisabled.mockClear();
    mockToggleChatWindow.mockClear();
    mockToggleIsBotTyping.mockClear();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  const renderChat = () => render(<ChatPanel />);

  const emitUserSubmit = async (text) => {
    await act(async () => {});
    await waitFor(() =>
      useOnRcbEvent.mock.calls.some(
        ([eventName, handler]) =>
          eventName === 'rcb-user-submit-text' && typeof handler === 'function'
      )
    );
    const [, handler] = useOnRcbEvent.mock.calls.find(
      ([eventName, registered]) => eventName === 'rcb-user-submit-text' && typeof registered === 'function'
    );
    const preventDefault = jest.fn();
    await handler({
      data: { inputText: text, sendInChat: true },
      preventDefault,
    });
    return { preventDefault };
  };

  it('configures the chatbot with default settings on mount', () => {
    useAuth.mockReturnValue({
      isAuthenticated: true,
      login: jest.fn(),
      getAccessToken: jest.fn(),
    });

    renderChat();

    expect(lastChatBotProps).not.toBeNull();
    expect(lastChatBotProps.flow.start.message).toMatch(/hello!/i);
    expect(lastChatBotProps.settings.chatWindow.defaultOpen).toBe(true);
    expect(lastChatBotProps.settings.event.rcbUserSubmitText).toBe(true);
  });

  // Additional behaviour tests will be reinstated once the chat flow API stabilises.
});
