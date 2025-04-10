export async function req(txtUrl: string, { url, headers = {} }, _meta = {}) {
  /**
   * Make an HTTP request.
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
