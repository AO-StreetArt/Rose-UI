import React from 'react';
import { fireEvent, render, waitFor, screen } from '@testing-library/react';

const mockToastShow = jest.fn();
const mockImageGalleryPanel = jest.fn(() => <div data-testid="image-gallery" />);

jest.mock('primereact/button', () => ({
  Button: ({ label, onClick, ...props }) => (
    <button type="button" onClick={onClick} {...props}>
      {label}
    </button>
  ),
}));

jest.mock('primereact/toolbar', () => ({
  Toolbar: ({ start, center }) => (
    <div data-testid="toolbar">
      <div>{start}</div>
      <div>{center}</div>
    </div>
  ),
}));

jest.mock('primereact/panel', () => ({
  Panel: ({ children }) => <div data-testid="panel">{children}</div>,
}));

jest.mock('primereact/toast', () => {
  const React = require('react');
  return {
    Toast: React.forwardRef((props, ref) => {
      React.useImperativeHandle(ref, () => ({
        show: mockToastShow,
      }));
      return <div data-testid="toast" />;
    }),
  };
});

jest.mock('../components/ChatPanel', () => ({
  __esModule: true,
  default: () => <div data-testid="chat-panel" />,
}));

jest.mock('../components/BabylonScene', () => ({
  __esModule: true,
  default: () => <div data-testid="babylon-scene" />,
}));

jest.mock('../components/ImageGalleryPanel', () => ({
  __esModule: true,
  default: (props) => {
    mockImageGalleryPanel(props);
    return <div data-testid="image-gallery" data-length={props.items?.length ?? 0} />;
  },
}));

jest.mock('../auth/AuthProvider', () => ({
  useAuth: jest.fn(),
}));

const { useAuth } = require('../auth/AuthProvider');
const App = require('../App').default;

describe('App', () => {
  let originalCreateObjectURL;
  let originalRevokeObjectURL;
  let fetchMock;

  beforeAll(() => {
    originalCreateObjectURL = URL.createObjectURL;
    originalRevokeObjectURL = URL.revokeObjectURL;
  });

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock;
    mockToastShow.mockClear();
    mockImageGalleryPanel.mockClear();
    URL.createObjectURL = jest.fn(() => 'blob:test-object');
    URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });

  const renderApp = () => render(<App />);

  it('renders the upload button', () => {
    useAuth.mockReturnValue({
      isAuthenticated: true,
      login: jest.fn(),
      getAccessToken: jest.fn(),
    });

    renderApp();

    expect(screen.getByRole('button', { name: /upload image/i })).toBeInTheDocument();
    expect(screen.getByTestId('chat-panel')).toBeInTheDocument();
    expect(screen.getByTestId('babylon-scene')).toBeInTheDocument();
  });

  it('prompts login when selecting a file while unauthenticated', async () => {
    const loginMock = jest.fn().mockResolvedValue();
    useAuth.mockReturnValue({
      isAuthenticated: false,
      login: loginMock,
      getAccessToken: jest.fn(),
    });

    const { container } = renderApp();

    const fileInput = container.querySelector('input[type="file"]');
    const file = new File(['content'], 'photo.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledTimes(1);
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uploads a file when authenticated', async () => {
    const getAccessToken = jest.fn().mockResolvedValue('token-123');
    useAuth.mockReturnValue({
      isAuthenticated: true,
      login: jest.fn(),
      getAccessToken,
    });

    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ url: 'https://files/url.png' }),
    });

    const { container } = renderApp();

    const fileInput = container.querySelector('input[type="file"]');
    const file = new File(['content'], 'photo.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(getAccessToken).toHaveBeenCalled();
      expect(fetchMock).toHaveBeenCalledWith('/api/upload', expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer token-123',
        }),
      }));
    });

    // should add local preview plus default item (length >= 2)
    const galleryCall = mockImageGalleryPanel.mock.calls.find((call) => (call[0]?.items?.length ?? 0) > 1);
    expect(galleryCall).toBeTruthy();
    expect(mockToastShow).toHaveBeenCalled();
  });
});
