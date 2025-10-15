import { useCallback, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { Toolbar } from 'primereact/toolbar';
import { Panel } from 'primereact/panel';
import './App.css';
import logo from './logo_w_name.png';
import BabylonScene from './components/BabylonScene';
import ChatPanel from './components/ChatPanel';
import ImageGalleryPanel from './components/ImageGalleryPanel';

function App() {
  const fileInputRef = useRef(null);
  const [isGalleryCollapsed, setIsGalleryCollapsed] = useState(false);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileSelected = useCallback((event) => {
    const file = event.target.files?.[0];

    if (file) {
      // File handling will be implemented in a future iteration.
      console.info('Selected file:', file.name);
    }

    // Allow re-selecting the same file if needed.
    event.target.value = '';
  }, []);

  const toolbarStartContent = (
    <div className="app-toolbar-start">
      <img src={logo} alt="Rose" className="app-toolbar-logo" />
    </div>
  );

  const toolbarCenterContent = (
    <div className="app-toolbar-center">
      <Button
        label="Upload Image"
        icon="pi pi-upload"
        onClick={handleUploadClick}
        outlined
      />
    </div>
  );

  return (
    <div className="app-shell">
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
              <ImageGalleryPanel />
            </Panel>
          </div>
        </div>
        <div className="app-right-column">
          <div className="visual-item">
            <h2>3D Preview</h2>
            <BabylonScene />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
