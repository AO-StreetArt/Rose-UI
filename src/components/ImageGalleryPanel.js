import ImageGallery from 'react-image-gallery';
import 'react-image-gallery/styles/css/image-gallery.css';

const images = [
  {
    original: 'https://picsum.photos/seed/rose1/800/600',
    thumbnail: 'https://picsum.photos/seed/rose1/150/100',
    description: 'Sample landscape shot',
  },
  {
    original: 'https://picsum.photos/seed/rose2/800/600',
    thumbnail: 'https://picsum.photos/seed/rose2/150/100',
    description: 'Another placeholder photo',
  },
  {
    original: 'https://picsum.photos/seed/rose3/800/600',
    thumbnail: 'https://picsum.photos/seed/rose3/150/100',
    description: 'Closing out the gallery',
  },
];

const ImageGalleryPanel = () => (
  <div className="image-gallery-panel">
    <ImageGallery items={images} showPlayButton={false} />
  </div>
);

export default ImageGalleryPanel;
