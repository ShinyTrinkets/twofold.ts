export async function req(txtUrl, { url, headers = {} }, _meta = {}) {
  /**
   * Make a HTTP request.
   *
   * Node.js finally added native `fetch` in v18 -- experimental!
   * https://nodejs.org/dist/latest-v18.x/docs/api/globals.html#fetch
   * Bun already has support for it
   * https://bun.sh/docs/api/globals
   */

  url = url || txtUrl;

  if (!url) return;

  if (url.slice(0, 4) !== 'http') {
    url = 'http://' + url;
  }

  const resp = await fetch(url, { headers });
  let text = await resp.text();
  text = text.trim();

  if (!resp.ok) text = `ERROR code ${resp.status}: ${text}`;
  return text;
}
