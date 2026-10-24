(() => {
  const { t } = window.newTabI18n;
  const fileLimit = 2 * 1024 * 1024;
  const dataLimit = 128 * 1024;
  const maxDimension = 512;
  const quality = 0.8;
  const supportedTypes = new Set([
    "image/png", "image/jpeg", "image/webp", "image/gif", "image/avif",
    "image/x-icon", "image/vnd.microsoft.icon", "image/ico",
  ]);

  function isValid(icon) {
    if (typeof icon !== "string" || icon.length > dataLimit) return false;
    const match = /^data:image\/(png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(icon);
    if (!match || match[2].length % 4 !== 0) return false;
    try {
      const header = atob(match[2].slice(0, 16));
      return match[1] === "png"
        ? header.startsWith("\x89PNG\r\n\x1a\n")
        : header.startsWith("RIFF") && header.slice(8, 12) === "WEBP";
    } catch {
      return false;
    }
  }

  function render(container, { icon, fallback }) {
    container.textContent = fallback;
    if (!isValid(icon)) return;

    const image = document.createElement("img");
    image.alt = "";
    image.draggable = false;
    image.addEventListener("error", () => {
      if (container.contains(image)) container.textContent = fallback;
    }, { once: true });
    image.src = icon;
    container.replaceChildren(image);
  }

  function draw(source, width, height) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(source, 0, 0, width, height);
    return canvas;
  }

  function resize(image, dimension) {
    const scale = Math.min(1, dimension / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    let source = image;
    let sourceWidth = image.naturalWidth;
    let sourceHeight = image.naturalHeight;
    // Halving large inputs first avoids a harsh single-step reduction of fine edges.
    while (sourceWidth > width * 2 || sourceHeight > height * 2) {
      sourceWidth = Math.max(width, Math.floor(sourceWidth / 2));
      sourceHeight = Math.max(height, Math.floor(sourceHeight / 2));
      source = draw(source, sourceWidth, sourceHeight);
    }
    return draw(source, width, height);
  }

  async function create(file) {
    if (!file.size || file.size > fileLimit) {
      throw new Error(t("image_invalid_size"));
    }
    if (!supportedTypes.has(file.type.toLowerCase()) &&
      !(!file.type && /\.(png|jpe?g|webp|gif|avif|ico)$/i.test(file.name))) {
      throw new Error(t("image_unsupported_type"));
    }

    const objectUrl = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = objectUrl;
      await image.decode();
      if (!image.naturalWidth || !image.naturalHeight) throw new Error("Invalid image");

      for (const dimension of [maxDimension, 384, 256]) {
        const canvas = resize(image, dimension);
        const icon = canvas.toDataURL("image/webp", quality);
        if (isValid(icon)) return icon;
      }
      throw new Error("Invalid icon");
    } catch {
      throw new Error(t("image_create_failed"));
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  window.newTabIcons = Object.freeze({ isValid, create, render, fileLimit, maxDimension });
})();
