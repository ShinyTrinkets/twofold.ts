export async function req(txtUrl: string, { url = '', headers = {} }) {
  /**
   * Make an HTTP request.
   */

  url ||= txtUrl;
  if (!url) {
    return;
  }

  if (!url.startsWith('http')) {
    url = 'http://' + url;
  }

  const resp = await fetch(url, { headers });
  let text = await resp.text();
  text = text.trim();

  if (!resp.ok) {
    text = `ERROR code ${resp.status}: ${text}`;
  }

  return text;
}
