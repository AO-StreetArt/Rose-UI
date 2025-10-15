import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { Toolbar } from 'primereact/toolbar';
import { Panel } from 'primereact/panel';
import { Toast } from 'primereact/toast';
import './App.css';
import logo from './logo_w_name.png';
import BabylonScene from './components/BabylonScene';
import ChatPanel from './components/ChatPanel';
import ImageGalleryPanel from './components/ImageGalleryPanel';
import { useAuth } from './auth/AuthProvider';

const defaultGalleryItems = [
  {
    original: 'https://picsum.photos/seed/rose1/800/600',
    thumbnail: 'https://picsum.photos/seed/rose1/150/100',
    description: 'Sample landscape shot',
  }
];

function App() {
  const fileInputRef = useRef(null);
  const toastRef = useRef(null);
  const localObjectUrlsRef = useRef([]);
  const [isGalleryCollapsed, setIsGalleryCollapsed] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [galleryItems, setGalleryItems] = useState(defaultGalleryItems);
  const [uploadedImageUrl, setUploadedImageUrl] = useState(null);
  const { getAccessToken, isAuthenticated, login } = useAuth();

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileSelected = useCallback(async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      event.target.value = '';
      return;
    }

    if (!isAuthenticated) {
      await login();
      toastRef.current?.show({
        severity: 'info',
        summary: 'Authentication required',
        detail: 'Please sign in and try uploading again.',
      });
      event.target.value = '';
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    localObjectUrlsRef.current.push(previewUrl);
    setGalleryItems((prev) => [
      {
        original: previewUrl,
        thumbnail: previewUrl,
        description: file.name || 'Uploaded image',
        isLocal: true,
      },
      ...prev,
    ]);

    setIsUploading(true);

    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error('Unable to retrieve access token. Please sign in again.');
      }

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        const errorMessage = errorPayload.error || 'Upload failed. Please try again.';
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const fileUrl = data?.url;

      if (fileUrl) {
        setUploadedImageUrl(fileUrl);
      }

      toastRef.current?.show({
        severity: 'success',
        summary: 'Upload complete',
        detail: fileUrl ? `Image available at ${fileUrl}` : 'Image uploaded successfully.',
        life: 5000,
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('File upload failed', error);
      toastRef.current?.show({
        severity: 'error',
        summary: 'Upload failed',
        detail: error.message || 'There was a problem uploading the file.',
        life: 6000,
      });
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  }, [getAccessToken, isAuthenticated, login]);

  const toolbarStartContent = (
    <div className="app-toolbar-start">
      <img src={logo} alt="Rose" className="app-toolbar-logo" />
    </div>
  );

  useEffect(() => {
    if (uploadedImageUrl) {
      // eslint-disable-next-line no-console
      console.info('Latest uploaded image URL:', uploadedImageUrl);
    }
  }, [uploadedImageUrl]);

  useEffect(
    () => () => {
      localObjectUrlsRef.current.forEach((objectUrl) => {
        URL.revokeObjectURL(objectUrl);
      });
      localObjectUrlsRef.current = [];
    },
    []
  );

  const toolbarCenterContent = (
    <div className="app-toolbar-center">
      <Button
        label="Upload Image"
        icon="pi pi-upload"
        onClick={handleUploadClick}
        loading={isUploading}
        outlined
      />
    </div>
  );

  return (
    <div className="app-shell">
      <Toast ref={toastRef} />
      <Toolbar
        className="app-toolbar"
        start={toolbarStartContent}
        center={toolbarCenterContent}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelected}
        className="app-toolbar-file-input"
      />
      <div className="app-container">
        <div className="app-left-column">
          <div className="chat-container">
            <ChatPanel />
          </div>
          <div
            className={`gallery-container ${
              isGalleryCollapsed ? 'gallery-container-collapsed' : ''
            }`}
          >
            <Panel
              header="Image Gallery"
              toggleable
              collapsed={isGalleryCollapsed}
              onToggle={(event) => setIsGalleryCollapsed(event.value)}
              className="gallery-panel"
            >
              <ImageGalleryPanel items={galleryItems} />
            </Panel>
          </div>
        </div>
        <div className="app-right-column">
          <div className="visual-item">
            <h2>3D Preview</h2>
            <div className="visual-item-preview">
              <BabylonScene />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
