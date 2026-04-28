export function httpClient(responses, defaultStatus = 200) {
  if (typeof responses === "string") {
    return async () => ({ status: defaultStatus, body: responses });
  }

  return async (url) => {
    const response = responses[url];

    if (response === undefined) {
      throw new Error(`Unexpected URL ${url}`);
    }

    if (typeof response === "string") {
      return { status: defaultStatus, body: response };
    }

    return response;
  };
}

export function rssFeed(items) {
  return `<?xml version="1.0"?><rss version="2.0"><channel>${items.join("")}</channel></rss>`;
}

export function rssItem(guid, title, link, publishedAt = "Tue, 28 Apr 2026 10:00:00 GMT") {
  return `<item><guid>${guid}</guid><title>${title}</title><link>${link}</link><pubDate>${publishedAt}</pubDate></item>`;
}
