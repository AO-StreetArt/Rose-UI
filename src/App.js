import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { Toolbar } from 'primereact/toolbar';
import { Panel } from 'primereact/panel';
import { OverlayPanel } from 'primereact/overlaypanel';
import { Toast } from 'primereact/toast';
import './App.css';
import logo from './logo_w_name.png';
import BabylonScene from './components/BabylonScene';
import ChatPanel from './components/ChatPanel';
import ImageGalleryPanel from './components/ImageGalleryPanel';
import { useAuth } from './auth/AuthProvider';
import {
  registerGalleryController,
  addGalleryImageByUrl,
  setActiveGalleryImageUrl,
} from './galleryController';

const defaultGalleryItems = [
  {
    original: 'https://picsum.photos/seed/rose1/800/600.jpg',
    thumbnail: 'https://picsum.photos/seed/rose1/150/100.jpg',
    description: 'Sample landscape shot',
  }
];

function App() {
  const fileInputRef = useRef(null);
  const toastRef = useRef(null);
  const webImagePanelRef = useRef(null);
  const localObjectUrlsRef = useRef([]);
  const [isGalleryCollapsed, setIsGalleryCollapsed] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [galleryItems, setGalleryItems] = useState(defaultGalleryItems);
  const [uploadedImageUrl, setUploadedImageUrl] = useState(null);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);
  const [selectedImageUrl, setSelectedImageUrl] = useState(
    () => defaultGalleryItems[0]?.original ?? ''
  );
  const [pendingWebImageUrl, setPendingWebImageUrl] = useState(
    () => defaultGalleryItems[0]?.original ?? ''
  );
  const { getAccessToken, isAuthenticated, login } = useAuth();

  useEffect(() => {
    registerGalleryController(setGalleryItems);
    return () => registerGalleryController(null);
  }, [setGalleryItems]);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleWebImageButtonClick = useCallback(
    (event) => {
      setPendingWebImageUrl(selectedImageUrl ?? '');
      webImagePanelRef.current?.toggle(event);
    },
    [selectedImageUrl]
  );

  const handleWebImageSave = useCallback(() => {
    const trimmedUrl = (pendingWebImageUrl || '').trim();
    if (!trimmedUrl) {
      return;
    }

    addGalleryImageByUrl(trimmedUrl, {
      description: 'Image from web',
      sourceId: trimmedUrl,
    });

    setActiveGalleryIndex(0);
    webImagePanelRef.current?.hide();
  }, [pendingWebImageUrl]);

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
    setGalleryItems((prev) => {
      const next = prev.filter(
        (item) => item.original !== previewUrl && item.sourceId !== previewUrl
      );

      return [
        {
          original: previewUrl,
          thumbnail: previewUrl,
          description: file.name || 'Uploaded image',
          isLocal: true,
          sourceId: previewUrl,
        },
        ...next,
      ];
    });

    setActiveGalleryIndex(0);
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
        addGalleryImageByUrl(fileUrl, {
          description: file.name || 'Uploaded image',
          sourceId: fileUrl,
        });
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

  useEffect(() => {
    if (!galleryItems.length) {
      if (activeGalleryIndex !== 0) {
        setActiveGalleryIndex(0);
      }
      if (selectedImageUrl !== '') {
        setSelectedImageUrl('');
      }
      return;
    }

    const clampedIndex = Math.min(activeGalleryIndex, galleryItems.length - 1);
    if (clampedIndex !== activeGalleryIndex) {
      setActiveGalleryIndex(clampedIndex);
      return;
    }

    const currentUrl = galleryItems[clampedIndex]?.original ?? '';
    if (currentUrl !== selectedImageUrl) {
      setSelectedImageUrl(currentUrl);
    }
  }, [activeGalleryIndex, galleryItems, selectedImageUrl]);

  const handleGalleryItemChange = useCallback((index) => {
    if (typeof index === 'number' && !Number.isNaN(index)) {
      setActiveGalleryIndex(index);
    }
  }, []);

  useEffect(() => {
    setActiveGalleryImageUrl(selectedImageUrl);
  }, [selectedImageUrl]);

  useEffect(
    () => () => {
      setActiveGalleryImageUrl('');
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
      <Button
        label="Set Image from Web"
        icon="pi pi-globe"
        onClick={handleWebImageButtonClick}
        type="button"
        outlined
      />
      <input
        type="text"
        value={selectedImageUrl}
        readOnly
        className="app-toolbar-url-input"
        aria-label="Current image URL"
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
      <OverlayPanel ref={webImagePanelRef} className="app-overlay-panel">
        <div className="app-overlay-panel-content">
          <input
            id="web-image-url-input"
            type="text"
            value={pendingWebImageUrl}
            onChange={(event) => setPendingWebImageUrl(event.target.value)}
            className="app-overlay-url-input"
            placeholder="https://example.com/image.jpg"
            aria-label="Image URL"
          />
          <Button
            label="Save"
            icon="pi pi-check"
            onClick={handleWebImageSave}
            type="button"
            disabled={!pendingWebImageUrl || !pendingWebImageUrl.trim()}
          />
        </div>
      </OverlayPanel>
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
              <ImageGalleryPanel
                items={galleryItems}
                activeIndex={activeGalleryIndex}
                onActiveIndexChange={handleGalleryItemChange}
              />
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
