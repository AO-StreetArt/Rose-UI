import React from 'react';
import { act, render, waitFor } from '@testing-library/react';

const mockAddResponseMessage = jest.fn();
const mockToggleWidget = jest.fn();
const mockIsWidgetOpened = jest.fn();
let capturedHandler = null;

jest.mock('react-chat-widget', () => {
  const React = require('react');
  return {
    addResponseMessage: mockAddResponseMessage,
    toggleWidget: mockToggleWidget,
    isWidgetOpened: mockIsWidgetOpened,
    Widget: ({ handleNewUserMessage }) => {
      capturedHandler = handleNewUserMessage;
      return <div data-testid="chat-widget" />;
    },
  };
});

jest.mock('react-chat-widget/lib/styles.css', () => ({}), { virtual: true });

jest.mock('../../auth/AuthProvider', () => ({
  useAuth: jest.fn(),
}));

const { useAuth } = require('../../auth/AuthProvider');
const ChatPanel = require('../ChatPanel').default;

describe('ChatPanel', () => {
  let originalFetch;

  beforeAll(() => {
    originalFetch = global.fetch;
  });

  beforeEach(() => {
    capturedHandler = null;
    mockAddResponseMessage.mockClear();
    mockToggleWidget.mockClear();
    mockIsWidgetOpened.mockReset();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  const renderChat = () => render(<ChatPanel />);

  it('shows greeting message on first render and opens widget', () => {
    mockIsWidgetOpened.mockReturnValue(false);
    useAuth.mockReturnValue({
      isAuthenticated: true,
      login: jest.fn(),
      getAccessToken: jest.fn().mockResolvedValue('token'),
    });

    renderChat();

    expect(mockAddResponseMessage).toHaveBeenCalledWith(expect.stringMatching(/hello!/i));
    expect(mockToggleWidget).toHaveBeenCalledTimes(1);
    expect(capturedHandler).toEqual(expect.any(Function));
  });

  it('prompts login when user sends message unauthenticated', async () => {
    mockIsWidgetOpened.mockReturnValue(true);
    const loginMock = jest.fn().mockResolvedValue();
    useAuth.mockReturnValue({
      isAuthenticated: false,
      login: loginMock,
      getAccessToken: jest.fn(),
    });

    renderChat();
    mockAddResponseMessage.mockClear();

    await act(async () => {
      await capturedHandler('hello');
    });

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalled();
    });
    expect(mockAddResponseMessage).toHaveBeenCalledWith(
      'Redirecting to authenticate. Try again after signing in.'
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('sends message when authenticated and displays replies', async () => {
    mockIsWidgetOpened.mockReturnValue(true);
    const getAccessToken = jest.fn().mockResolvedValue('token-123');
    useAuth.mockReturnValue({
      isAuthenticated: true,
      login: jest.fn(),
      getAccessToken,
    });

    const replyPayload = {
      sessionId: 'session-1',
      messages: [{ role: 'assistant', content: 'Hello there!' }],
    };
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(replyPayload),
    });

    renderChat();
    mockAddResponseMessage.mockClear();

    await act(async () => {
      await capturedHandler('hello');
    });

    await waitFor(() => {
      expect(getAccessToken).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/chat',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer token-123',
          }),
        })
      );
    });

    expect(mockAddResponseMessage).toHaveBeenCalledWith('Hello there!');
  });
});
