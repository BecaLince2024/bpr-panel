const ALLOWED_ORIGIN = "https://becalince2024.github.io";
const REPO_OWNER = "BecaLince2024";
const REPO_NAME = "bpr-panel";
const LABEL = "comando";

const LOAD_LABELS = {
  shares: "M&S", os_siso: "OS SISO", mv_siso: "MV SISO",
  BE: "BE", m_s_nielsen: "Nielsen M&S",
};

function cors(resp) {
  resp.headers.set("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  resp.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  resp.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return resp;
}

function json(data, status = 200) {
  return cors(new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  }));
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return cors(new Response(null, { status: 204 }));
    }
    if (request.method !== "POST") {
      return json({ error: "method not allowed" }, 405);
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return json({ error: "invalid json" }, 400);
    }

    const { code, bu, load_type, nombre, email } = payload || {};
    if (!code || !bu || !load_type) {
      return json({ error: "faltan campos (code, bu, load_type)" }, 400);
    }

    // 1) Intercambia el codigo de OAuth por un token -- el Client Secret
    //    solo existe aca, nunca se manda al navegador.
    const tokenResp = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Accept": "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });
    const tokenData = await tokenResp.json();
    if (!tokenData.access_token) {
      return json({ error: "no se pudo autenticar con GitHub", detail: tokenData.error_description || tokenData }, 401);
    }
    const accessToken = tokenData.access_token;

    // 2) Identidad real de quien autorizo.
    const userResp = await fetch("https://api.github.com/user", {
      headers: { "Authorization": `Bearer ${accessToken}`, "User-Agent": "bpr-panel-worker" },
    });
    const user = await userResp.json();
    if (!user.login) {
      return json({ error: "no se pudo obtener el usuario de GitHub" }, 401);
    }

    // 3) Crea el issue USANDO el token de quien lo pidio -- el issue queda
    //    reportado por su cuenta real de GitHub, no por un bot.
    const label = LOAD_LABELS[load_type] || load_type;
    const title = `Comando: ${String(bu).toUpperCase()} / ${label}`;
    const body =
      `BU: ${bu}\nTipo: ${load_type}\nNombre: ${nombre || user.name || user.login}\nEmail: ${email || ""}\n` +
      `GitHub: @${user.login}\n\n(generado desde el panel via login de GitHub, no editar las lineas de arriba)`;

    const issueResp = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "application/vnd.github+json",
        "User-Agent": "bpr-panel-worker",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title, body, labels: [LABEL] }),
    });
    const issue = await issueResp.json();
    if (!issueResp.ok) {
      return json({ error: "no se pudo crear el issue", detail: issue.message }, issueResp.status);
    }

    return json({ ok: true, number: issue.number, html_url: issue.html_url, login: user.login });
  },
};
