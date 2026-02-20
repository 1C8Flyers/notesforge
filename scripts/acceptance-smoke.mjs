const API_URL = process.env.API_URL ?? "http://localhost:4000";
const POLL_TIMEOUT_MS = Number(process.env.POLL_TIMEOUT_MS ?? 60_000);
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS ?? 2_000);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request(path, { method = "GET", body, token } = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const text = await response.text();
  let parsed;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }

  if (!response.ok) {
    throw new Error(`${method} ${path} failed (${response.status}): ${JSON.stringify(parsed)}`);
  }

  return parsed;
}

async function createAndLoginUser(prefix) {
  const email = `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@noteforge.test`;
  const password = "password123";

  await request("/auth/signup", {
    method: "POST",
    body: { email, password }
  });

  const login = await request("/auth/login", {
    method: "POST",
    body: { email, password }
  });

  return { email, token: login.token };
}

async function waitForMeetingCompletion(meetingId, token) {
  const started = Date.now();
  while (Date.now() - started < POLL_TIMEOUT_MS) {
    const meeting = await request(`/meetings/${meetingId}`, { token });
    if (meeting.status === "completed") {
      return meeting;
    }
    if (meeting.status === "failed") {
      throw new Error(`Meeting ${meetingId} failed during processing.`);
    }
    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error(`Timeout waiting for meeting ${meetingId} completion.`);
}

async function main() {
  console.log(`Running smoke checks against ${API_URL}`);

  const owner = await createAndLoginUser("owner");
  const other = await createAndLoginUser("other");

  const created = await request("/meetings", {
    method: "POST",
    token: owner.token,
    body: {
      title: "Acceptance smoke meeting",
      fileName: "acceptance-smoke.m4a",
      contentType: "audio/m4a"
    }
  });

  const meetingId = created.meeting.id;

  await request(`/meetings/${meetingId}/complete-upload`, {
    method: "POST",
    token: owner.token
  });

  await waitForMeetingCompletion(meetingId, owner.token);

  const transcript = await request(`/meetings/${meetingId}/transcript`, { token: owner.token });
  if (!Array.isArray(transcript.segments) || transcript.segments.length === 0) {
    throw new Error("Expected transcript segments to exist.");
  }

  const notes = await request(`/meetings/${meetingId}/notes`, { token: owner.token });
  if (!notes.notes?.summary_md) {
    throw new Error("Expected notes summary to be generated.");
  }

  const searchResults = await request(`/search?q=${encodeURIComponent("launch")}`, { token: owner.token });
  if (!Array.isArray(searchResults)) {
    throw new Error("Expected search response array.");
  }

  let isolationPass = false;
  try {
    await request(`/meetings/${meetingId}`, { token: other.token });
  } catch (error) {
    if (String(error.message).includes("404")) {
      isolationPass = true;
    }
  }

  if (!isolationPass) {
    throw new Error("User isolation check failed. Secondary user accessed owner meeting.");
  }

  console.log("Smoke checks passed:");
  console.log("- transcript generated");
  console.log("- notes generated");
  console.log("- search endpoint responds");
  console.log("- user isolation verified");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
