(() => {
  const { t } = window.newTabI18n;
  const backgroundSection = document.getElementById("background-settings");
  const backgroundColorsContainer = document.getElementById("background-colors");
  const backgroundImagesContainer = document.getElementById("background-images");
  const backgroundFileInput = document.getElementById("background-file");
  const backgroundStatus = document.getElementById("background-status");
  const backgroundResetButton = document.getElementById("reset-background");
  const backgroundDatabaseName = "firefox-new-tab-background";
  const backgroundStoreName = "settings";
  const backgroundStorageKey = "background";
  const backgroundImageLimit = 10 * 1024 * 1024;
  const backgroundImagePresets = window.newTabBackgroundPresets;
  const backgroundColorPresets = [
    // 中性色
    ["color_snow_white", "#ffffff"],
    ["color_ivory", "#fffaf0"],
    ["color_fog_gray", "#f1f3f5"],
    ["color_silver_gray", "#cbd5e1"],
    ["color_limestone_gray", "#94a3b8"],
    ["color_slate_gray", "#64748b"],
    ["color_charcoal_gray", "#334155"],
    ["color_ink_black", "#111827"],
    // 暖色
    ["color_cherry_red", "#dc2626"],
    ["color_coral_red", "#f87171"],
    ["color_rose_red", "#e11d48"],
    ["color_orange_red", "#f97316"],
    ["color_apricot", "#fb923c"],
    ["color_amber", "#f59e0b"],
    ["color_golden_yellow", "#facc15"],
    ["color_warm_brown", "#a16207"],
    ["color_terracotta", "#c2410c"],
    ["color_cinnamon", "#92400e"],
    // 冷色
    ["color_grass_green", "#65a30d"],
    ["color_leaf_green", "#16a34a"],
    ["color_emerald", "#059669"],
    ["color_teal", "#0d9488"],
    ["color_lake_cyan", "#0891b2"],
    ["color_sky_blue", "#0284c7"],
    ["color_azure_blue", "#2563eb"],
    ["color_indigo", "#4f46e5"],
    ["color_violet", "#7c3aed"],
    ["color_orchid_purple", "#9333ea"],
    ["color_magenta", "#c026d3"],
    ["color_berry_purple", "#a21caf"],
    // 浅色
    ["color_cream", "#fef3c7"],
    ["color_peach", "#ffedd5"],
    ["color_light_coral", "#ffe4e6"],
    ["color_pale_pink", "#fce7f3"],
    ["color_pale_purple", "#f3e8ff"],
    ["color_lavender", "#ede9fe"],
    ["color_ice_blue", "#e0f2fe"],
    ["color_light_cyan", "#cffafe"],
    ["color_mint", "#d1fae5"],
    ["color_light_green", "#ecfccb"],
    // 深色
    ["color_deep_sea_blue", "#172554"],
    ["color_midnight_blue", "#0f172a"],
    ["color_dark_indigo", "#312e81"],
    ["color_dark_purple", "#3b0764"],
    ["color_forest_green", "#052e16"],
    ["color_dark_teal", "#042f2e"],
    ["color_wine_red", "#4c0519"],
    ["color_espresso", "#451a03"],
  ];
  const backgroundImageTypes = new Set([
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/gif",
    "image/avif",
  ]);
  const backgroundControls = [
    backgroundFileInput,
    backgroundResetButton,
  ];
  const backgroundColorButtons = [];
  const backgroundImageButtons = [];
  const backgroundImagePresetById = new Map(
    backgroundImagePresets.map((backgroundPreset) => [backgroundPreset.id, backgroundPreset]),
  );

  let backgroundBusy = true;
  let backgroundObjectUrl = null;

  class backgroundUserError extends Error {}

  function backgroundSetBusy(backgroundIsBusy) {
    backgroundBusy = backgroundIsBusy;

    for (const backgroundControl of backgroundControls) {
      backgroundControl.disabled = backgroundIsBusy;
    }

    backgroundSection.setAttribute("aria-busy", String(backgroundIsBusy));
  }

  function backgroundShowStatus(backgroundMessage) {
    backgroundStatus.textContent = backgroundMessage;
    backgroundStatus.hidden = !backgroundMessage;
  }

  function backgroundStorage(backgroundOperation, backgroundValue) {
    return new Promise((backgroundResolve, backgroundReject) => {
      const backgroundOpenRequest = indexedDB.open(backgroundDatabaseName, 1);
      let backgroundOpenAbandoned = false;

      backgroundOpenRequest.onupgradeneeded = () => {
        const backgroundDatabase = backgroundOpenRequest.result;

        if (!backgroundDatabase.objectStoreNames.contains(backgroundStoreName)) {
          backgroundDatabase.createObjectStore(backgroundStoreName);
        }
      };

      backgroundOpenRequest.onerror = () => {
        backgroundOpenAbandoned = true;
        backgroundReject(new backgroundUserError(t("background_storage_access_error")));
      };

      backgroundOpenRequest.onblocked = () => {
        backgroundOpenAbandoned = true;
        backgroundReject(
          new backgroundUserError(t("background_storage_blocked_error")),
        );
      };

      backgroundOpenRequest.onsuccess = () => {
        const backgroundDatabase = backgroundOpenRequest.result;

        if (backgroundOpenAbandoned) {
          backgroundDatabase.close();
          return;
        }

        backgroundDatabase.onversionchange = () => backgroundDatabase.close();
        let backgroundTransaction;

        try {
          backgroundTransaction = backgroundDatabase.transaction(
            backgroundStoreName,
            backgroundOperation === "get" ? "readonly" : "readwrite",
          );
          const backgroundStore = backgroundTransaction.objectStore(backgroundStoreName);
          let backgroundDataRequest;

          if (backgroundOperation === "get") {
            backgroundDataRequest = backgroundStore.get(backgroundStorageKey);
          } else if (backgroundOperation === "put") {
            backgroundDataRequest = backgroundStore.put(backgroundValue, backgroundStorageKey);
          } else {
            backgroundDataRequest = backgroundStore.delete(backgroundStorageKey);
          }

          backgroundTransaction.oncomplete = () => {
            backgroundDatabase.close();
            backgroundResolve(backgroundDataRequest.result);
          };

          backgroundTransaction.onabort = () => {
            backgroundDatabase.close();
            backgroundReject(
              new backgroundUserError(t("background_storage_save_error")),
            );
          };
        } catch {
          backgroundTransaction?.abort();
          backgroundDatabase.close();
          backgroundReject(new backgroundUserError(t("background_storage_access_error")));
        }
      };
    });
  }

  async function backgroundValidateImage(backgroundImageBlob) {
    if (
      !(backgroundImageBlob instanceof Blob) ||
      !backgroundImageTypes.has(backgroundImageBlob.type.toLowerCase())
    ) {
      throw new backgroundUserError(t("background_image_format_error"));
    }

    if (!backgroundImageBlob.size) {
      throw new backgroundUserError(t("background_empty_image_error"));
    }

    if (backgroundImageBlob.size > backgroundImageLimit) {
      throw new backgroundUserError(t("background_image_size_error"));
    }

    const backgroundDecodeUrl = URL.createObjectURL(backgroundImageBlob);
    const backgroundImage = new Image();

    try {
      backgroundImage.src = backgroundDecodeUrl;
      await backgroundImage.decode();
      if (!backgroundImage.naturalWidth || !backgroundImage.naturalHeight) throw new Error("Invalid image");
    } catch {
      throw new backgroundUserError(t("background_image_decode_error"));
    } finally {
      URL.revokeObjectURL(backgroundDecodeUrl);
    }
  }

  function backgroundReleaseImage() {
    if (backgroundObjectUrl) {
      URL.revokeObjectURL(backgroundObjectUrl);
      backgroundObjectUrl = null;
    }
  }

  function backgroundSyncColorSelection(backgroundColor = null) {
    const backgroundSelectedColor = backgroundColor?.toLowerCase();

    for (const backgroundButton of backgroundColorButtons) {
      backgroundButton.setAttribute(
        "aria-pressed",
        String(backgroundButton.dataset.color === backgroundSelectedColor),
      );
    }
  }

  function backgroundSyncImageSelection(backgroundPresetId = null) {
    for (const backgroundButton of backgroundImageButtons) {
      backgroundButton.setAttribute(
        "aria-pressed",
        String(backgroundButton.dataset.presetId === backgroundPresetId),
      );
    }
  }

  function backgroundColorIsLight(backgroundColor) {
    const backgroundChannels = [1, 3, 5].map((backgroundOffset) => {
      const backgroundChannel = parseInt(
        backgroundColor.slice(backgroundOffset, backgroundOffset + 2),
        16,
      ) / 255;

      return backgroundChannel <= 0.04045
        ? backgroundChannel / 12.92
        : ((backgroundChannel + 0.055) / 1.055) ** 2.4;
    });
    const backgroundLuminance =
      0.2126 * backgroundChannels[0] +
      0.7152 * backgroundChannels[1] +
      0.0722 * backgroundChannels[2];

    return backgroundLuminance > 0.179;
  }

  function backgroundApplyColor(backgroundColor) {
    document.body.style.setProperty("--custom-background-image", "none");
    document.body.style.setProperty("--custom-background-color", backgroundColor);
    document.body.classList.toggle("light-background", backgroundColorIsLight(backgroundColor));
    backgroundSyncColorSelection(backgroundColor);
    backgroundSyncImageSelection();
    backgroundReleaseImage();
  }

  function backgroundApplyImage(backgroundNextImageUrl, backgroundIsBlob = false) {
    const backgroundPreviousObjectUrl = backgroundObjectUrl;
    document.body.style.setProperty(
      "--custom-background-image",
      `url("${backgroundNextImageUrl}")`,
    );
    document.body.style.removeProperty("--custom-background-color");
    document.body.classList.remove("light-background");
    backgroundSyncColorSelection();
    backgroundSyncImageSelection();
    backgroundObjectUrl = backgroundIsBlob ? backgroundNextImageUrl : null;

    if (backgroundPreviousObjectUrl && backgroundPreviousObjectUrl !== backgroundObjectUrl) {
      URL.revokeObjectURL(backgroundPreviousObjectUrl);
    }
  }

  function backgroundApplyPreset(backgroundPresetId) {
    const backgroundPreset = backgroundImagePresetById.get(backgroundPresetId);

    if (!backgroundPreset) {
      throw new backgroundUserError(t("background_preset_unavailable"));
    }

    backgroundApplyImage(new URL(backgroundPreset.path, document.baseURI).href);
    backgroundSyncImageSelection(backgroundPreset.id);
  }

  function backgroundApplyDefault() {
    backgroundApplyColor(backgroundColorPresets[0][1]);
    backgroundFileInput.value = "";
  }

  async function backgroundRunChange(backgroundChange, backgroundProgress, backgroundSuccess) {
    if (backgroundBusy) {
      return;
    }

    backgroundSetBusy(true);
    backgroundShowStatus(backgroundProgress);

    try {
      await backgroundChange();
      backgroundShowStatus(backgroundSuccess);
    } catch (backgroundError) {
      backgroundShowStatus(
        backgroundError instanceof backgroundUserError
          ? backgroundError.message
          : t("background_update_error"),
      );
    } finally {
      backgroundSetBusy(false);
    }
  }

  function backgroundRenderColorPresets() {
    const backgroundFragment = document.createDocumentFragment();

    for (const [backgroundName, backgroundColor] of backgroundColorPresets) {
      const backgroundButton = document.createElement("button");
      const backgroundLabel = `${t(backgroundName)} ${backgroundColor}`;
      backgroundButton.type = "button";
      backgroundButton.className = "background-color-swatch";
      backgroundButton.dataset.color = backgroundColor;
      backgroundButton.style.backgroundColor = backgroundColor;
      backgroundButton.title = backgroundLabel;
      backgroundButton.setAttribute("aria-label", backgroundLabel);
      backgroundButton.setAttribute("aria-pressed", "false");
      backgroundButton.disabled = backgroundBusy;
      backgroundButton.addEventListener("click", () => {
        void backgroundRunChange(
          async () => {
            await backgroundStorage("put", { type: "color", color: backgroundColor });
            backgroundApplyColor(backgroundColor);
          },
          t("background_saving_color"),
          t("background_saved_color"),
        );
      });

      backgroundColorButtons.push(backgroundButton);
      backgroundControls.push(backgroundButton);
      backgroundFragment.appendChild(backgroundButton);
    }

    backgroundColorsContainer.replaceChildren(backgroundFragment);
  }

  function backgroundRenderImagePresets() {
    const backgroundFragment = document.createDocumentFragment();

    for (const [backgroundPresetIndex, backgroundPreset] of backgroundImagePresets.entries()) {
      const backgroundButton = document.createElement("button");
      const backgroundPreview = document.createElement("span");
      const backgroundImage = document.createElement("img");
      const backgroundLabel = t("background_wallpaper_label", { index: backgroundPresetIndex + 1 });
      backgroundButton.type = "button";
      backgroundButton.className = "background-image-preset";
      backgroundButton.dataset.presetId = backgroundPreset.id;
      backgroundButton.setAttribute("aria-label", backgroundLabel);
      backgroundButton.setAttribute("aria-pressed", "false");
      backgroundButton.disabled = backgroundBusy;
      backgroundPreview.className = "background-image-preview";
      backgroundImage.alt = "";
      backgroundImage.width = 120;
      backgroundImage.height = 60;
      backgroundImage.loading = "lazy";
      backgroundImage.decoding = "async";
      backgroundImage.src = new URL(backgroundPreset.path, document.baseURI).href;
      backgroundPreview.append(backgroundImage);
      backgroundButton.append(backgroundPreview);
      backgroundButton.addEventListener("click", () => {
        void backgroundRunChange(
          async () => {
            await backgroundStorage("put", { type: "preset", presetId: backgroundPreset.id });
            backgroundApplyPreset(backgroundPreset.id);
          },
          t("background_saving_wallpaper"),
          t("background_saved_wallpaper"),
        );
      });

      backgroundImageButtons.push(backgroundButton);
      backgroundControls.push(backgroundButton);
      backgroundFragment.append(backgroundButton);
    }

    backgroundImagesContainer.replaceChildren(backgroundFragment);
  }

  backgroundFileInput.addEventListener("change", () => {
    const backgroundFile = backgroundFileInput.files?.[0];
    backgroundFileInput.value = "";

    if (!backgroundFile) {
      return;
    }

    void backgroundRunChange(
      async () => {
        await backgroundValidateImage(backgroundFile);
        const backgroundNextObjectUrl = URL.createObjectURL(backgroundFile);

        try {
          await backgroundStorage("put", { type: "image", image: backgroundFile });
          backgroundApplyImage(backgroundNextObjectUrl, true);
        } catch (backgroundError) {
          if (backgroundObjectUrl !== backgroundNextObjectUrl) {
            URL.revokeObjectURL(backgroundNextObjectUrl);
          }

          throw backgroundError;
        }
      },
      t("background_saving_image"),
      t("background_saved_image"),
    );
  });

  backgroundResetButton.addEventListener("click", () => {
    void backgroundRunChange(
      async () => {
        await backgroundStorage("delete");
        backgroundApplyDefault();
      },
      t("background_restoring"),
      t("background_restored"),
    );
  });

  window.addEventListener("pagehide", (backgroundEvent) => {
    if (!backgroundEvent.persisted) {
      backgroundReleaseImage();
    }
  });

  async function backgroundInitialize() {
    backgroundSetBusy(true);

    try {
      const backgroundSaved = await backgroundStorage("get");

      if (backgroundSaved === undefined) {
        backgroundApplyDefault();
        return;
      }

      if (
        backgroundSaved?.type === "color" &&
        typeof backgroundSaved.color === "string" &&
        /^#[\da-f]{6}$/i.test(backgroundSaved.color)
      ) {
        backgroundApplyColor(backgroundSaved.color);
      } else if (
        backgroundSaved?.type === "preset" &&
        typeof backgroundSaved.presetId === "string" &&
        backgroundImagePresetById.has(backgroundSaved.presetId)
      ) {
        backgroundApplyPreset(backgroundSaved.presetId);
      } else if (backgroundSaved?.type === "image") {
        await backgroundValidateImage(backgroundSaved.image);
        backgroundApplyImage(URL.createObjectURL(backgroundSaved.image), true);
      } else {
        throw new backgroundUserError(t("background_saved_invalid"));
      }
    } catch {
      backgroundApplyDefault();
      backgroundShowStatus(t("background_load_error"));
    } finally {
      backgroundSetBusy(false);
    }
  }

  backgroundRenderColorPresets();
  backgroundRenderImagePresets();
  backgroundApplyDefault();
  void backgroundInitialize();
})();
