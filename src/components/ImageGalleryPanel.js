import ImageGallery from 'react-image-gallery';
import 'react-image-gallery/styles/css/image-gallery.css';

const ImageGalleryPanel = ({ items = [] }) => (
  <div className="image-gallery-panel">
    <ImageGallery items={items} showPlayButton={false} />
  </div>
);

export default ImageGalleryPanel;
