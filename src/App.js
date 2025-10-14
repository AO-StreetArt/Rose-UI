import './App.css';
import BabylonScene from './components/BabylonScene';
import ChatPanel from './components/ChatPanel';
import ImageGalleryPanel from './components/ImageGalleryPanel';

function App() {
  return (
    <div className="app-container">
      <div className="chat-container">
        <ChatPanel />
      </div>
      <div className="visual-container">
        <div className="visual-item">
          <h2>3D Preview</h2>
          <BabylonScene />
        </div>
        <div className="visual-item">
          <h2>Image Gallery</h2>
          <ImageGalleryPanel />
        </div>
      </div>
    </div>
  );
}

export default App;
