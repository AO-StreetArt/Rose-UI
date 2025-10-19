let galleryUpdateRef = null;
let galleryItemsSnapshot = [];
let activeGalleryImageUrl = '';

const logMissingController = () => {
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.warn(
      'Gallery controller is not registered. Call registerGalleryController in your root component.'
    );
  }
};

/**
 * Register a state updater so other modules can manage gallery items.
 * Should be called once from the component that owns the gallery state.
 */
export const registerGalleryController = (updater) => {
  if (typeof updater !== 'function') {
    galleryUpdateRef = null;
    galleryItemsSnapshot = [];
    activeGalleryImageUrl = '';
    return;
  }

  const wrappedUpdater = (updateArg) => {
    if (typeof updateArg === 'function') {
      updater((prevItems = []) => {
        const result = updateArg(prevItems);
        galleryItemsSnapshot = Array.isArray(result) ? result : [];
        return result;
      });
      return;
    }

    galleryItemsSnapshot = Array.isArray(updateArg) ? updateArg : [];
    updater(updateArg);
  };

  galleryUpdateRef = wrappedUpdater;

  updater((prevItems = []) => {
    galleryItemsSnapshot = Array.isArray(prevItems) ? prevItems : [];
    if (galleryItemsSnapshot.length === 0) {
      activeGalleryImageUrl = '';
    }
    return prevItems;
  });
};

const getUpdater = () => {
  if (!galleryUpdateRef) {
    logMissingController();
    return null;
  }
  return galleryUpdateRef;
};

const normalizeItem = (itemInput, fallbackDescription) => {
  if (!itemInput) {
    return null;
  }

  const original = itemInput.original ?? itemInput.url ?? itemInput.itemImageSrc;
  if (!original) {
    return null;
  }

  const thumbnail = itemInput.thumbnail ?? itemInput.thumbnailImageSrc ?? original;
  const description = itemInput.description ?? fallbackDescription ?? '';
  const sourceId =
    itemInput.sourceId ?? itemInput.id ?? itemInput.url ?? itemInput.original ?? original;

  return {
    ...itemInput,
    original,
    thumbnail,
    description,
    sourceId,
  };
};

export const addGalleryItem = (itemInput, { description } = {}) => {
  const updater = getUpdater();
  if (!updater) {
    return;
  }

  const normalized = normalizeItem(itemInput, description);
  if (!normalized) {
    return;
  }

  updater((prevItems = []) => {
    const filtered = prevItems.filter(
      (item) =>
        item.sourceId !== normalized.sourceId &&
        item.original !== normalized.original &&
        item.thumbnail !== normalized.thumbnail
    );

    return [normalized, ...filtered];
  });
};

export const addGalleryImageByUrl = (url, options = {}) => {
  if (!url) {
    return;
  }

  const { thumbnail, description, metadata, sourceId } = options;
  addGalleryItem({
    original: url,
    thumbnail: thumbnail ?? url,
    description,
    metadata,
    sourceId: sourceId ?? url,
  });
};

export const addGalleryItems = (items = []) => {
  items.forEach((item) => addGalleryItem(item));
};

export const removeGalleryImageByUrl = (url) => {
  if (!url) {
    return;
  }

  const updater = getUpdater();
  if (!updater) {
    return;
  }

  updater((prevItems = []) =>
    prevItems.filter((item) => item.original !== url && item.thumbnail !== url && item.sourceId !== url)
  );
};

export const clearGallery = () => {
  const updater = getUpdater();
  if (!updater) {
    return;
  }
  updater(() => []);
};

export const getAllGalleryImageUrls = () => {
  if (!Array.isArray(galleryItemsSnapshot)) {
    return [];
  }

  const urls = galleryItemsSnapshot
    .map((item) => normalizeItem(item))
    .filter((item) => item && item.original)
    .map((item) => item.original);

  return Array.from(new Set(urls));
};

export const setActiveGalleryImageUrl = (url) => {
  activeGalleryImageUrl = typeof url === 'string' ? url : '';
};

export const getActiveGalleryImageUrl = () => activeGalleryImageUrl;
