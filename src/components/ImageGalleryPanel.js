import { Galleria } from 'primereact/galleria';

const ImageGalleryPanel = ({ items = [], activeIndex, onActiveIndexChange }) => {
  const galleriaItems = items.map((item = {}, index) => {
    const { original, thumbnail, description } = item;

    return {
      ...item,
      itemImageSrc: original ?? '',
      thumbnailImageSrc: thumbnail ?? original ?? '',
      alt: description ?? `Image ${index + 1}`,
    };
  });

  const itemTemplate = (item) => (
    <img
      src={item.itemImageSrc}
      alt={item.alt}
      style={{ width: '100%', display: 'block' }}
    />
  );

  const thumbnailTemplate = (item) => (
    <img src={item.thumbnailImageSrc} alt={item.alt} />
  );

  return (
    <div className="image-gallery-panel">
      <Galleria
        value={galleriaItems}
        item={itemTemplate}
        thumbnail={thumbnailTemplate}
        activeIndex={typeof activeIndex === 'number' ? activeIndex : undefined}
        onItemChange={(event) => {
          if (typeof onActiveIndexChange === 'function') {
            onActiveIndexChange(event.index);
          }
        }}
        showThumbnails
        showItemNavigators
        showItemNavigatorsOnHover
        showIndicators={galleriaItems.length > 1}
        numVisible={5}
        style={{ width: '100%' }}
      />
    </div>
  );
};

export default ImageGalleryPanel;
