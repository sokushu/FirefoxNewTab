(() => {
  const { t } = window.newTabI18n;
  const icons = window.newTabIcons;
  const HTML_LIMIT = 1024 * 1024;
  const NETWORK_TIMEOUT = 15000;
  const CANDIDATE_LIMIT = 8;

  function websiteUrl(value, base) {
    try {
      const url = new URL(value, base);
      if (url.protocol !== "http:" && url.protocol !== "https:") return null;
      url.username = "";
      url.password = "";
      url.hash = "";
      return url;
    } catch {
      return null;
    }
  }

  async function readLimited(response, limit, signal) {
    const advertisedSize = Number(response.headers.get("content-length"));
    if (Number.isFinite(advertisedSize) && advertisedSize > limit) {
      response.body?.cancel().catch(() => {});
      throw new Error(t("fetch_resource_too_large"));
    }
    if (!response.body) throw new Error(t("fetch_empty_content"));
    const reader = response.body.getReader();
    const chunks = [];
    let length = 0;
    try {
      while (true) {
        if (signal.aborted) throw new Error(t("fetch_aborted"));
        const { done, value } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > limit) throw new Error(t("fetch_resource_too_large"));
        chunks.push(value);
      }
    } catch (error) {
      reader.cancel().catch(() => {});
      throw error;
    } finally {
      reader.releaseLock();
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return bytes;
  }

  async function resource(url, limit, signal, timeout) {
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (signal.aborted) abort();
    else signal.addEventListener("abort", abort, { once: true });
    const timer = window.setTimeout(abort, timeout);
    try {
      const response = await fetch(url.href, {
        signal: controller.signal,
        credentials: "omit",
        referrerPolicy: "no-referrer",
        cache: "no-store",
        mode: "cors",
        redirect: "follow",
      });
      if (!response.ok) throw new Error(t("fetch_unavailable"));
      const finalUrl = websiteUrl(response.url || url.href);
      if (!finalUrl) throw new Error(t("fetch_unsupported_url"));
      return {
        bytes: await readLimited(response, limit, controller.signal),
        type: response.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() || "",
        url: finalUrl,
      };
    } finally {
      window.clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      controller.abort();
    }
  }

  function candidatesFromHtml(bytes, pageUrl) {
    // Template content stays detached and inert; remote markup is never inserted.
    const template = document.createElement("template");
    template.innerHTML = new TextDecoder().decode(bytes);
    const baseHref = template.content.querySelector("base[href]")?.getAttribute("href");
    const baseUrl = baseHref ? websiteUrl(baseHref, pageUrl) || pageUrl : pageUrl;
    const candidates = [];
    for (const link of template.content.querySelectorAll("link[rel][href]")) {
      const rel = link.getAttribute("rel").toLowerCase().split(/\s+/);
      if (!rel.some((value) => ["icon", "apple-touch-icon", "apple-touch-icon-precomposed"].includes(value))) continue;
      const url = websiteUrl(link.getAttribute("href"), baseUrl);
      if (!url || link.getAttribute("type")?.toLowerCase() === "image/svg+xml" || /\.svg$/i.test(url.pathname)) continue;
      const sizes = [...(link.getAttribute("sizes") || "").matchAll(/(\d+)x(\d+)/gi)];
      const side = sizes.reduce((largest, match) => Math.max(largest, Math.min(Number(match[1]), Number(match[2]))), 0);
      const score = Math.min(side || 32, icons.maxDimension) +
        (rel.some((value) => value.startsWith("apple-touch-icon")) ? 16 : 0);
      candidates.push({ url, score });
    }
    const unique = new Map();
    for (const candidate of candidates.sort((a, b) => b.score - a.score)) {
      if (!unique.has(candidate.url.href)) unique.set(candidate.url.href, candidate.url);
      if (unique.size >= CANDIDATE_LIMIT - 1) break;
    }
    return [...unique.values()];
  }

  function rasterType(bytes) {
    const text = (start, length) => String.fromCharCode(...bytes.subarray(start, start + length));
    if (bytes.length >= 8 && bytes[0] === 0x89 && text(1, 3) === "PNG" &&
        bytes[4] === 13 && bytes[5] === 10 && bytes[6] === 26 && bytes[7] === 10) return "image/png";
    if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
    if (bytes.length >= 6 && ["GIF87a", "GIF89a"].includes(text(0, 6))) return "image/gif";
    if (bytes.length >= 12 && text(0, 4) === "RIFF" && text(8, 4) === "WEBP") return "image/webp";
    if (bytes.length >= 6 && bytes[0] === 0 && bytes[1] === 0 && bytes[2] === 1 && bytes[3] === 0 &&
        (bytes[4] || bytes[5])) return "image/x-icon";
    if (bytes.length >= 16 && text(4, 4) === "ftyp") {
      for (let index = 8; index + 4 <= Math.min(bytes.length, 64); index += 4) {
        if (index !== 12 && ["avif", "avis"].includes(text(index, 4))) return "image/avif";
      }
    }
    return "";
  }

  async function fetchIcon(normalizedUrl) {
    const pageUrl = websiteUrl(normalizedUrl);
    if (!pageUrl) throw new Error(t("fetch_invalid_website_url"));
    if (typeof browser === "undefined" || typeof browser.permissions?.request !== "function") {
      throw new Error(t("fetch_permission_unavailable"));
    }
    // Keep this request before the first await so the button's user activation survives.
    let granted;
    try {
      granted = await browser.permissions.request({ origins: [`${pageUrl.protocol}//${pageUrl.hostname}/*`] });
    } catch {
      throw new Error(t("fetch_permission_failed"));
    }
    if (!granted) throw new Error(t("fetch_permission_denied"));

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), NETWORK_TIMEOUT);
    try {
      let candidates = [];
      try {
        const page = await resource(pageUrl, HTML_LIMIT, controller.signal, 4500);
        if (!page.type || ["text/html", "application/xhtml+xml"].includes(page.type)) {
          candidates = candidatesFromHtml(page.bytes, page.url);
        }
      } catch {
        if (controller.signal.aborted) throw new Error(t("fetch_timeout"));
        // The conventional icon still works when the page cannot be read.
      }
      const fallback = websiteUrl("/favicon.ico", pageUrl);
      // Try the conventional icon early so several slow CDN links cannot starve it.
      const first = candidates.shift();
      candidates = [...new Map([first, fallback, ...candidates].filter(Boolean)
        .map((candidate) => [candidate.href, candidate])).values()];
      for (const candidate of candidates.slice(0, CANDIDATE_LIMIT)) {
        if (controller.signal.aborted) break;
        try {
          const image = await resource(candidate, icons.fileLimit, controller.signal, 4000);
          const type = rasterType(image.bytes);
          if (!type) continue; // SVG and other active document formats are not imported.
          const icon = await icons.create(new Blob([image.bytes], { type }));
          if (controller.signal.aborted) break;
          return icon;
        } catch {
          if (controller.signal.aborted) break;
        }
      }
      if (controller.signal.aborted) throw new Error(t("fetch_timeout_retry"));
      throw new Error(t("fetch_no_icon"));
    } finally {
      window.clearTimeout(timer);
      controller.abort();
    }
  }

  window.shortcutIconFetcher = Object.freeze({ fetchIcon });
})();
