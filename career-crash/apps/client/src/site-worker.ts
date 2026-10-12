// The careercrash.org Worker (wrangler.jsonc). Static assets serve the site; this
// script only runs for the paths `run_worker_first` sends it (pages and public
// files, not the hashed /assets/ bundle), so it costs one invocation per page view.
// It sends www.careercrash.org to careercrash.org, so search engines see one site,
// and makes the asset store's tidy-URL redirects (/news → /news/, /index.html → /)
// permanent: they come back as 307s, which tell Google the old address may return.
// Only handlers may be exported here: the runtime rejects other named exports.

export interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
}

const CANONICAL_HOST = 'careercrash.org';

export function handle(request: Request, env: Env): Promise<Response> | Response {
  const url = new URL(request.url);
  if (url.hostname === `www.${CANONICAL_HOST}`) {
    url.hostname = CANONICAL_HOST;
    return Response.redirect(url.toString(), 301);
  }
  return env.ASSETS.fetch(request).then((res) => {
    const to = res.headers.get('location');
    if ((res.status === 307 || res.status === 302) && to) return Response.redirect(new URL(to, url).toString(), 301);
    return res;
  });
}

export default { fetch: handle };
