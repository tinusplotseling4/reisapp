const ROLES = {
  admin: "Administrator",
  leader: "Reisleider",
  traveler: "Reisgenoot",
  follower: "Thuisblijver",
};

const INVITE_ROLES = {
  leader: "Reisleider",
  traveler: "Reisgenoot",
  follower: "Thuisblijver",
};

const VIEW_ROLES = {
  "": "Eigen weergave",
  leader: "Reisleider",
  traveler: "Reisgenoot",
  follower: "Thuisblijver",
};

const DEFAULT_MEMBERS = [
  { id: "jeroen", name: "Jeroen", role: "admin" },
  { id: "moeder", name: "Mam", role: "follower" },
  { id: "lotte", name: "Lotte", role: "traveler" },
];

const TRIP_TITLE = "Rondreis Noorwegen 2026";

let supabaseClient = null;
let authReady = false;
let authSession = null;
let authUser = null;
let authMessage = "";
let remoteTrip = null;
let remoteMembers = null;
let newMemberName = "";
let newMemberRole = "follower";
let currentUserId = localStorage.getItem("reisapp_current_user") || "jeroen";
let viewRoleMode = localStorage.getItem("reisapp_view_role") || "";
let themeMode = localStorage.getItem("reisapp_theme") || "dark";
let activeStage = Number(localStorage.getItem("reisapp_active_stage") || 0);
let driving = localStorage.getItem("reisapp_driving") === "true";
let totalRouteMap;
let totalRouteBounds;
let livePositionMarker;
let liveTrackLine;
let dashboardRouteMap;
let dashboardPositionMarker;
let dashboardTrackLine;
let dashboardFollowLive = localStorage.getItem("reisapp_dashboard_follow") !== "false";
let dashboardProgrammaticMove = false;
let gpsStatus = localStorage.getItem("reisapp_gps_status") || "Nog geen GPS-punt gemeten op dit apparaat.";
let locationTimer;
let diaryDraft = {
  stageIndex: null,
  open: false,
  mode: "",
  note: "",
  photos: [],
  audioData: "",
  transcript: "",
  voiceStatus: "",
  recording: false,
};
let diaryRecorder;
let diaryRecorderChunks = [];
let diaryRecognition;
let deferredInstallPrompt = null;

function getConfig() {
  return window.REISAPP_CONFIG || {};
}

function initSupabaseClient() {
  const config = getConfig();
  if (!window.supabase || !config.supabaseUrl || !config.supabaseAnonKey) return;
  supabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
}

function getDefaultTripSlug() {
  return getConfig().defaultTripSlug || "noorwegen-2026";
}

function getUserDisplayName(user) {
  return (
    user?.user_metadata?.display_name ||
    user?.email?.split("@")[0] ||
    "Reiziger"
  );
}

function isCloudMode() {
  return Boolean(supabaseClient);
}

function createInviteToken() {
  if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function rememberInviteToken() {
  const params = new URLSearchParams(window.location.search);
  const invite = params.get("invite");
  if (invite) localStorage.setItem("reisapp_pending_invite", invite);
}

function getPendingInviteToken() {
  return localStorage.getItem("reisapp_pending_invite") || "";
}

function clearPendingInviteToken() {
  localStorage.removeItem("reisapp_pending_invite");
  const url = new URL(window.location.href);
  if (!url.searchParams.has("invite")) return;
  url.searchParams.delete("invite");
  window.history.replaceState({}, document.title, url.toString());
}

function getAppShareBaseUrl() {
  const configured = getConfig().publicAppUrl;
  if (configured) return configured.replace(/\/?$/, "/");

  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  return url.toString();
}

function getInviteLink(member) {
  if (!member.inviteToken) return "";
  const url = new URL(getAppShareBaseUrl());
  url.searchParams.set("invite", member.inviteToken);
  return url.toString();
}

function getWhatsAppText(member) {
  const role = ROLES[member.role] || member.role;
  return [
    `Hoi ${member.name},`,
    "",
    "Ik ben bezig met onze Noorwegen reisapp. Via deze link kun je meekijken met de route, dagplanning, voortgang en dagdetails.",
    `Je rol is: ${role}.`,
    "",
    getInviteLink(member),
  ].join("\n");
}

function getWhatsAppShareUrl(member) {
  return `https://wa.me/?text=${encodeURIComponent(getWhatsAppText(member))}`;
}

function getEmailShareUrl(member) {
  const subject = encodeURIComponent("Uitnodiging Rondreis Noorwegen");
  return `mailto:?subject=${subject}&body=${encodeURIComponent(getWhatsAppText(member))}`;
}

function canInviteRole(role) {
  return Object.prototype.hasOwnProperty.call(INVITE_ROLES, role);
}

function getMembers() {
  if (remoteMembers && remoteMembers.length) {
    return remoteMembers.map((member) => ({
      id: member.user_id || member.id,
      memberId: member.id,
      name: member.display_name,
      role: member.role,
      email: member.invited_email || "",
      inviteToken: member.invite_token || "",
      joined: Boolean(member.joined_at),
    }));
  }

  const saved = JSON.parse(localStorage.getItem("reisapp_members") || "null");
  if (saved && saved.length) return saved;
  localStorage.setItem("reisapp_members", JSON.stringify(DEFAULT_MEMBERS));
  return DEFAULT_MEMBERS;
}

function saveMembers(members) {
  if (isCloudMode()) return;
  localStorage.setItem("reisapp_members", JSON.stringify(members));
}

function getCurrentUser() {
  const members = getMembers();
  if (authUser) {
    return (
      members.find((member) => member.id === authUser.id) || {
        id: authUser.id,
        name: getUserDisplayName(authUser),
        role: "follower",
      }
    );
  }
  return members.find((member) => member.id === currentUserId) || members[0];
}

function getActualRole() {
  return getCurrentUser().role;
}

function canPreviewRoles() {
  return getActualRole() === "admin";
}

function getCurrentRole() {
  if (canPreviewRoles() && viewRoleMode && VIEW_ROLES[viewRoleMode]) return viewRoleMode;
  return getActualRole();
}

function setViewRoleMode(role) {
  viewRoleMode = Object.prototype.hasOwnProperty.call(VIEW_ROLES, role) ? role : "";
  localStorage.setItem("reisapp_view_role", viewRoleMode);
  render();
}

function setCurrentUser(id) {
  if (isCloudMode()) return;
  currentUserId = id;
  localStorage.setItem("reisapp_current_user", id);
  render();
}

async function addMember() {
  const names = newMemberName
    .split("\n")
    .map((name) => name.trim())
    .filter(Boolean);
  const role = canInviteRole(newMemberRole) ? newMemberRole : "follower";
  if (!names.length) {
    authMessage = "Vul eerst minimaal een naam in.";
    render();
    return;
  }

  if (isCloudMode() && remoteTrip) {
    const rows = names.map((name) => ({
      trip_id: remoteTrip.id,
      display_name: name,
      invited_email: null,
      invite_token: createInviteToken(),
      role,
    }));
    const { error } = await supabaseClient.from("trip_members").insert(rows);

    if (error) {
      authMessage = error.message;
    } else {
      authMessage = `${names.length} ${names.length === 1 ? "persoon is" : "personen zijn"} toegevoegd als ${ROLES[role]}.`;
      newMemberName = "";
      newMemberRole = "follower";
      await loadRemoteState();
    }
    render();
    return;
  }

  const members = getMembers();
  names.forEach((name) => {
    const id = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || `lid-${Date.now()}`;

    members.push({ id: `${id}-${Date.now()}`, name, role });
  });
  newMemberName = "";
  newMemberRole = "follower";
  saveMembers(members);
  render();
}

function updateNewMember(field, value) {
  if (field === "name") newMemberName = value;
  if (field === "role") newMemberRole = canInviteRole(value) ? value : "follower";
}

async function updateMemberRole(id, role) {
  const member = getMembers().find((item) => item.id === id || item.memberId === id);
  if (!member) return;

  if (role === "admin" && member.role !== "admin") {
    if (isCloudMode() && authUser?.email) {
      const password = window.prompt(
        `Vul je eigen administrator-wachtwoord in om ${member.name} administrator te maken.`
      );
      if (!password) {
        authMessage = "Administrator maken is geannuleerd.";
        render();
        return;
      }

      const { error } = await supabaseClient.auth.signInWithPassword({
        email: authUser.email,
        password,
      });

      if (error) {
        authMessage = "Wachtwoord klopt niet. Administrator maken is geannuleerd.";
        render();
        return;
      }
    } else {
      const password = window.prompt(
        `Vul je administrator-wachtwoord in om ${member.name} administrator te maken.`
      );
      if (!password) {
        authMessage = "Administrator maken is geannuleerd.";
        render();
        return;
      }
    }

    if (getCurrentRole() !== "admin") {
      authMessage = "Administrator maken is geannuleerd.";
      render();
      return;
    }
  }

  if (isCloudMode()) {
    const { error } = await supabaseClient.from("trip_members").update({ role }).eq("id", member.memberId);
    authMessage = error ? error.message : "Rol bijgewerkt.";
    await loadRemoteState();
    render();
    return;
  }

  const members = getMembers().map((member) => (member.id === id ? { ...member, role } : member));
  saveMembers(members);
  render();
}

async function updateMemberName(id, name) {
  if (isCloudMode()) {
    const member = getMembers().find((item) => item.id === id || item.memberId === id);
    if (!member) return;
    const { error } = await supabaseClient.from("trip_members").update({ display_name: name }).eq("id", member.memberId);
    authMessage = error ? error.message : "Naam bijgewerkt.";
    await loadRemoteState();
    render();
    return;
  }

  const members = getMembers().map((member) => (member.id === id ? { ...member, name } : member));
  saveMembers(members);
  render();
}

async function removeMember(id) {
  const member = getMembers().find((item) => item.id === id || item.memberId === id);
  if (!member) return;

  if (member.id === currentUserId) {
    authMessage = "Je kunt jezelf niet uit deze reis verwijderen.";
    render();
    return;
  }

  const confirmed = window.confirm(`${member.name} verwijderen uit deze reis?`);
  if (!confirmed) return;

  if (isCloudMode()) {
    const { error } = await supabaseClient.from("trip_members").delete().eq("id", member.memberId);
    authMessage = error ? error.message : `${member.name} is verwijderd.`;
    await loadRemoteState();
    render();
    return;
  }

  const members = getMembers().filter((item) => item.id !== id);
  saveMembers(members);
  render();
}

async function copyInviteLink(id) {
  const member = getMembers().find((item) => item.id === id || item.memberId === id);
  if (!member || !member.inviteToken) {
    authMessage = "Deze persoon heeft nog geen uitnodigingslink.";
    render();
    return;
  }

  const text = getWhatsAppText(member);
  try {
    await navigator.clipboard.writeText(text);
    authMessage = `WhatsApp-tekst voor ${member.name} is gekopieerd.`;
  } catch (_) {
    window.prompt("Kopieer deze WhatsApp-tekst:", text);
    authMessage = `Kopieer de tekst voor ${member.name}.`;
  }
  render();
}

async function copyRoleInviteLinks(role) {
  const members = getMembers().filter((member) => member.role === role && member.inviteToken && !member.joined);
  if (!members.length) {
    authMessage = `Geen open links voor ${ROLES[role]}.`;
    render();
    return;
  }

  const text = members
    .map((member) => `${member.name}: ${getInviteLink(member)}`)
    .join("\n");

  try {
    await navigator.clipboard.writeText(text);
    authMessage = `${members.length} links voor ${ROLES[role]} gekopieerd.`;
  } catch (_) {
    window.prompt(`Kopieer deze links voor ${ROLES[role]}:`, text);
    authMessage = `Kopieer de links voor ${ROLES[role]}.`;
  }
  render();
}

async function ensureInviteLink(id) {
  const member = getMembers().find((item) => item.id === id || item.memberId === id);
  if (!member) return;

  if (!isCloudMode()) {
    authMessage = "WhatsApp-uitnodigingen werken pas met Supabase.";
    render();
    return;
  }

  const inviteToken = createInviteToken();
  const { error } = await supabaseClient
    .from("trip_members")
    .update({ invite_token: inviteToken })
    .eq("id", member.memberId);

  authMessage = error ? error.message : `Uitnodigingslink voor ${member.name} is gemaakt.`;
  await loadRemoteState();
  render();
}

function applyTheme() {
  document.documentElement.dataset.themeMode = themeMode;
  const prefersLight = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
  const resolved = themeMode === "system" ? (prefersLight ? "light" : "dark") : themeMode;
  document.documentElement.dataset.theme = resolved;
}

function setThemeMode(mode) {
  themeMode = mode;
  localStorage.setItem("reisapp_theme", mode);
  applyTheme();
  render();
}

function renderThemeControl() {
  return `
    <label class="theme-control">
      <span>Thema</span>
      <select onchange="setThemeMode(this.value)">
        <option value="dark" ${themeMode === "dark" ? "selected" : ""}>Donker</option>
        <option value="light" ${themeMode === "light" ? "selected" : ""}>Licht</option>
        <option value="system" ${themeMode === "system" ? "selected" : ""}>Volgens apparaat</option>
      </select>
    </label>
  `;
}

async function installApp() {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  render();
}

function renderViewModeControl() {
  if (!canPreviewRoles()) return "";

  return `
    <div class="view-mode-control" aria-label="Bekijk app als">
      <span>Bekijk als</span>
      ${Object.entries(VIEW_ROLES)
        .map(
          ([role, label]) => `
            <button class="view-mode-btn ${viewRoleMode === role ? "active" : ""}" onclick="setViewRoleMode('${role}')">
              ${label}
            </button>
          `
        )
        .join("")}
    </div>
  `;
}

function renderDisplayControl() {
  return `
    <div class="display-control">
      <span class="display-control-title">Weergave</span>
      ${renderViewModeControl()}
    </div>
  `;
}

if (window.matchMedia) {
  window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", () => {
    if (themeMode === "system") applyTheme();
  });
}

applyTheme();

async function initAuth() {
  rememberInviteToken();
  initSupabaseClient();
  if (!supabaseClient) {
    authReady = true;
    render();
    return;
  }

  const { data, error } = await supabaseClient.auth.getSession();
  if (error) authMessage = error.message;
  authSession = data?.session || null;
  authUser = authSession?.user || null;

  supabaseClient.auth.onAuthStateChange(async (_event, session) => {
    authSession = session;
    authUser = session?.user || null;
    if (authUser) {
      await loadRemoteState();
    } else {
      remoteTrip = null;
      remoteMembers = null;
      render();
    }
  });

  if (authUser) await loadRemoteState();
  authReady = true;
  render();
}

async function signInWithPassword(event) {
  event.preventDefault();
  const email = document.getElementById("authEmail")?.value.trim();
  const password = document.getElementById("authPassword")?.value;
  if (!email || !password) return;

  authMessage = "Bezig met inloggen...";
  render();

  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  authMessage = error ? error.message : "Ingelogd.";
  if (!error) await loadRemoteState();
  render();
}

async function signUpWithPassword() {
  const name = document.getElementById("authName")?.value.trim();
  const email = document.getElementById("authEmail")?.value.trim();
  const password = document.getElementById("authPassword")?.value;
  if (!email || !password) return;

  authMessage = "Account wordt aangemaakt...";
  render();

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: name || email.split("@")[0],
      },
    },
  });

  if (error) {
    authMessage = error.message;
  } else if (data.session) {
    authMessage = "Account aangemaakt en ingelogd.";
    await loadRemoteState();
  } else {
    authMessage = "Account aangemaakt. Check je e-mail om je login te bevestigen.";
  }
  render();
}

async function signOut() {
  if (!supabaseClient) return;
  await supabaseClient.auth.signOut();
  authMessage = "Uitgelogd.";
  render();
}

async function loadRemoteState() {
  if (!supabaseClient || !authUser) return;

  const displayName = getUserDisplayName(authUser);
  await supabaseClient.from("profiles").upsert({
    id: authUser.id,
    display_name: displayName,
  });

  const inviteToken = getPendingInviteToken();
  if (inviteToken) {
    const claimed = await supabaseClient.rpc("claim_trip_invite", {
      invite: inviteToken,
      new_display_name: displayName,
    });

    if (claimed.error) {
      authMessage = claimed.error.message;
    } else {
      clearPendingInviteToken();
      const claimedTripId = claimed.data?.[0]?.trip_id;
      if (claimedTripId) {
        const claimedTrip = await supabaseClient.from("trips").select("*").eq("id", claimedTripId).single();
        if (claimedTrip.error) {
          authMessage = claimedTrip.error.message;
          return;
        }
        remoteTrip = claimedTrip.data;
      }
    }
  }

  const slug = getDefaultTripSlug();
  let trip = remoteTrip;
  let tripError = null;

  if (!trip) {
    const loaded = await supabaseClient
      .from("trips")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    trip = loaded.data;
    tripError = loaded.error;
  }

  if (!trip && !tripError) {
    const created = await supabaseClient
      .from("trips")
      .insert({
        slug,
        title: TRIP_TITLE,
        owner_id: authUser.id,
      })
      .select("*")
      .single();

    trip = created.data;
    tripError = created.error;
  }

  if (tripError) {
    authMessage = tripError.message;
    return;
  }

  remoteTrip = trip;

  const { data: existingMember } = await supabaseClient
    .from("trip_members")
    .select("*")
    .eq("trip_id", remoteTrip.id)
    .eq("user_id", authUser.id)
    .maybeSingle();

  if (!existingMember) {
    const { error } = await supabaseClient.from("trip_members").insert({
      trip_id: remoteTrip.id,
      user_id: authUser.id,
      display_name: displayName,
      invited_email: authUser.email,
      role: remoteTrip.owner_id === authUser.id ? "admin" : "follower",
      joined_at: new Date().toISOString(),
    });
    if (error) authMessage = error.message;
  }

  const { data: members, error: membersError } = await supabaseClient
    .from("trip_members")
    .select("*")
    .eq("trip_id", remoteTrip.id)
    .order("created_at", { ascending: true });

  if (membersError) {
    authMessage = membersError.message;
    return;
  }

  remoteMembers = members || [];
  currentUserId = authUser.id;
}

function renderAuthGate() {
  return `
    <section class="auth-gate">
      <div>
        <p class="eyebrow">Login</p>
        <h2>Noorwegen 2026</h2>
        <p class="muted">Log in om reisrollen, dagboek, media en straks GPS veilig te synchroniseren.</p>
      </div>

      <form class="auth-form" onsubmit="signInWithPassword(event)">
        <label>
          Naam
          <input id="authName" autocomplete="name" placeholder="Jeroen">
        </label>
        <label>
          E-mail
          <input id="authEmail" type="email" autocomplete="email" required placeholder="naam@example.com">
        </label>
        <label>
          Wachtwoord
          <input id="authPassword" type="password" autocomplete="current-password" required placeholder="Minimaal 6 tekens">
        </label>
        <div class="auth-actions">
          <button class="linkbtn mapsbtn" type="submit">Inloggen</button>
          <button class="linkbtn" type="button" onclick="signUpWithPassword()">Account maken</button>
        </div>
        ${authMessage ? `<p class="muted">${authMessage}</p>` : ""}
      </form>
    </section>
  `;
}

const ROUTE_STAGES = [
  [
    [52.257, 4.557],
    [52.977, 6.481],
    [53.551, 9.993],
    [55.491, 9.472],
    [55.336, 10.982],
    [55.571, 12.859],
    [55.605, 13.003],
  ],
  [
    [55.605, 13.003],
    [57.709, 11.975],
    [59.914, 10.752],
    [59.744, 10.205],
    [60.533, 8.207],
    [60.511, 7.865],
  ],
  [
    [60.533, 8.207],
    [60.511, 7.865],
    [60.398, 7.356],
    [60.426, 7.251],
    [60.467, 7.071],
  ],
  [
    [60.467, 7.071],
    [60.475, 6.829],
    [60.572, 6.737],
    [60.629, 6.414],
    [60.861, 7.112],
    [60.908, 7.212],
    [60.906, 7.189],
  ],
  [
    [60.906, 7.189],
    [60.975, 7.444],
    [61.047, 7.812],
    [61.229, 7.101],
    [61.837, 6.806],
    [61.872, 6.848],
  ],
  [
    [61.872, 6.848],
    [61.837, 6.806],
    [61.904, 6.722],
    [62.049, 7.27],
    [62.089, 7.231],
    [62.101, 7.205],
    [62.112, 7.166],
  ],
  [
    [62.101, 7.205],
    [62.298, 7.262],
    [62.331, 7.468],
    [62.454, 7.663],
    [62.567, 7.774],
    [62.567, 7.687],
  ],
  [
    [62.567, 7.687],
    [62.737, 7.16],
    [62.906, 6.914],
    [63.016, 7.354],
    [63.018, 7.374],
    [63.111, 7.732],
  ],
  [
    [63.111, 7.732],
    [62.567, 7.687],
    [62.075, 9.126],
    [61.837, 8.568],
    [61.5, 8.4],
  ],
  [
    [61.5, 8.4],
    [61.25, 8.91],
    [60.986, 9.232],
    [60.833, 10.075],
    [60.795, 10.692],
    [60.19, 11.997],
    [59.379, 13.504],
  ],
  [
    [59.379, 13.504],
    [57.709, 11.975],
    [55.605, 13.003],
    [55.571, 12.859],
    [55.336, 10.982],
    [53.551, 9.993],
    [52.368, 4.904],
    [52.257, 4.557],
  ],
];

function showTab(id) {
  if (isCloudMode() && !authUser) {
    id = "map";
  }
  if (id === "admin" && getActualRole() !== "admin") {
    showTab("map");
    return;
  }
  document.querySelectorAll(".tab").forEach((tab) => tab.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  if (id === "total") initTotalRoute();
  if (id === "map") initDashboardRoute();
}

function canControlRoute() {
  const role = getCurrentRole();
  return role === "admin" || role === "leader";
}

function canSeeAdminFiles() {
  const role = getCurrentRole();
  return role === "admin" || role === "leader";
}

function canEditDiary() {
  const role = getCurrentRole();
  return role === "admin" || role === "leader" || role === "traveler";
}

function canMarkVisited() {
  const role = getCurrentRole();
  return role === "admin" || role === "leader" || role === "traveler";
}

function canUpdateGps() {
  const role = getCurrentRole();
  return role === "admin" || role === "leader" || role === "traveler";
}

function stars(n) {
  return "*".repeat(n) + "-".repeat(5 - n);
}

function poiKey(stageIndex, poiIndex) {
  return `stage_${stageIndex}_poi_${poiIndex}`;
}

function getGoogleNavigationUrl(stage) {
  const points = stage.route || [];
  const destination = points[points.length - 1] || stage.to;
  const waypoints = points.slice(1, -1).slice(0, 9);
  const params = new URLSearchParams({
    api: "1",
    destination,
    travelmode: "driving",
    dir_action: "navigate",
  });

  if (waypoints.length) {
    params.set("waypoints", waypoints.join("|"));
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function toggleDriving(mapsUrl = "") {
  const shouldStart = !driving;
  driving = shouldStart;
  localStorage.setItem("reisapp_driving", String(driving));
  render();

  if (shouldStart) {
    setGpsStatus("Etappe gestart. Eerste GPS-punt wordt opgehaald.");
    startLocationTracking();
  } else if (locationTimer) {
    clearInterval(locationTimer);
    locationTimer = null;
    setGpsStatus("Etappe gestopt. GPS-tracking staat uit.");
    updateLiveMapStyles();
  }

  if (shouldStart && mapsUrl) {
    window.open(mapsUrl, "_blank");
  }
}

function selectStage(index) {
  activeStage = index;
  localStorage.setItem("reisapp_active_stage", String(index));
  resetTotalRoute();
  render();
}

function openStage(index) {
  activeStage = index;
  localStorage.setItem("reisapp_active_stage", String(index));
  resetTotalRoute();
  showTab("days");
  render();
}

function toggleVisited(key) {
  if (!canMarkVisited()) return;
  const current = localStorage.getItem(key) === "true";
  localStorage.setItem(key, String(!current));
  render();
}

function getStageDiaryKey(index) {
  return `reisapp_stage_diary_${index}`;
}

function getStageDiary(index) {
  return JSON.parse(localStorage.getItem(getStageDiaryKey(index)) || "[]");
}

function saveStageDiary(index, entries) {
  localStorage.setItem(getStageDiaryKey(index), JSON.stringify(entries));
}

function resetDiaryDraft(index = activeStage) {
  diaryDraft = {
    stageIndex: index,
    open: true,
    mode: "",
    note: "",
    photos: [],
    audioData: "",
    transcript: "",
    voiceStatus: "",
    recording: false,
  };
}

function openDiaryComposer(index) {
  if (!canEditDiary()) return;
  resetDiaryDraft(index);
  renderStages();
}

function closeDiaryComposer() {
  if (diaryDraft.recording) stopDiaryRecording();
  diaryDraft.open = false;
  renderStages();
}

function setDiaryMode(mode) {
  diaryDraft.mode = mode;
  renderStages();
}

function openDiaryPhotoInput(mode) {
  diaryDraft.mode = mode;
  const inputId = mode === "camera" ? "diaryCameraInput" : "diaryPhotosInput";
  document.getElementById(inputId)?.click();
}

function updateDiaryDraftNote(value) {
  diaryDraft.note = value;
}

function addDiaryEntry(index, entry) {
  const entries = getStageDiary(index);
  entries.unshift({
    id: Date.now(),
    created: new Date().toLocaleString("nl-NL", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }),
    note: entry.note || "",
    photos: entry.photos || [],
    audioData: entry.audioData || "",
    transcript: entry.transcript || "",
  });
  saveStageDiary(index, entries);
}

function updateDiaryEntry(stageIndex, entryId, value) {
  const entries = getStageDiary(stageIndex).map((entry) =>
    entry.id === entryId ? { ...entry, note: value } : entry
  );
  saveStageDiary(stageIndex, entries);
}

function handleDiaryPhotos(input) {
  const files = Array.from(input.files || []);
  if (!files.length) return;

  Promise.all(
    files.map(
      (file) =>
        new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(file);
        })
    )
  ).then((photos) => {
    diaryDraft.photos = diaryDraft.photos.concat(photos);
    renderStages();
  });
}

function removeDiaryPhoto(index) {
  diaryDraft.photos = diaryDraft.photos.filter((_, photoIndex) => photoIndex !== index);
  renderStages();
}

function saveDiaryDraft() {
  const note = diaryDraft.note.trim();
  const transcript = diaryDraft.transcript.trim();
  const hasContent = note || transcript || diaryDraft.photos.length || diaryDraft.audioData;

  if (!hasContent) return;

  addDiaryEntry(diaryDraft.stageIndex, {
    note,
    photos: diaryDraft.photos,
    audioData: diaryDraft.audioData,
    transcript,
  });
  resetDiaryDraft(diaryDraft.stageIndex);
  renderStages();
}

function blobToDataUrl(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

function startSpeechRecognition() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    diaryDraft.voiceStatus =
      "Live tekst wordt niet ondersteund in deze browser. De audio wordt wel bewaard.";
    return false;
  }

  diaryRecognition = new Recognition();
  diaryRecognition.lang = "nl-NL";
  diaryRecognition.continuous = true;
  diaryRecognition.interimResults = true;
  diaryRecognition.onstart = () => {
    diaryDraft.voiceStatus = "Luistert mee. Spreek je dagboeknotitie rustig in.";
    renderStages();
  };
  diaryRecognition.onresult = (event) => {
    let transcript = "";
    for (let index = 0; index < event.results.length; index++) {
      transcript += event.results[index][0].transcript;
    }
    diaryDraft.transcript = transcript.trim();
    diaryDraft.voiceStatus = diaryDraft.transcript
      ? "Tekst herkend. Je kunt hem hieronder nog aanvullen of corrigeren."
      : "Luistert nog mee.";
    renderStages();
  };
  diaryRecognition.onerror = (event) => {
    const messages = {
      "not-allowed": "Microfoontoegang is geweigerd. Geef toestemming in je browser of telefooninstellingen.",
      "no-speech": "Ik hoorde nog geen spraak. Probeer iets dichter bij de microfoon te praten.",
      "audio-capture": "De microfoon kon niet worden gebruikt. Controleer of een andere app hem bezet houdt.",
      network: "Spraakherkenning heeft internet nodig en kreeg geen goede verbinding.",
    };
    diaryDraft.voiceStatus =
      messages[event.error] || "Spraakherkenning stopte. De audio-opname wordt nog wel bewaard.";
    renderStages();
  };
  diaryRecognition.onend = () => {
    if (diaryDraft.recording && !diaryDraft.transcript) {
      diaryDraft.voiceStatus = "Opname loopt nog. Als er geen tekst verschijnt, bewaren we de audio alsnog.";
      renderStages();
    }
  };

  try {
    diaryRecognition.start();
    return true;
  } catch (error) {
    diaryDraft.voiceStatus = "Spraakherkenning kon niet starten. De audio wordt wel bewaard.";
    diaryRecognition = null;
    return false;
  }
}

async function startDiaryRecording() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    diaryDraft.voiceStatus = "Microfoon is niet beschikbaar in deze browser.";
    renderStages();
    return;
  }

  diaryDraft.voiceStatus = "Microfoon wordt gestart.";
  renderStages();

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (error) {
    diaryDraft.voiceStatus =
      error && error.name === "NotAllowedError"
        ? "Microfoontoegang is geweigerd. Geef toestemming in je browser of telefooninstellingen."
        : "Microfoon kon niet starten. Probeer de pagina opnieuw te openen.";
    renderStages();
    return;
  }

  diaryRecorderChunks = [];
  diaryRecorder = new MediaRecorder(stream);
  diaryDraft.recording = true;
  diaryDraft.voiceStatus = "Opname loopt.";

  diaryRecorder.ondataavailable = (event) => {
    if (event.data.size) diaryRecorderChunks.push(event.data);
  };

  diaryRecorder.onstop = async () => {
    stream.getTracks().forEach((track) => track.stop());
    const blob = new Blob(diaryRecorderChunks, { type: diaryRecorder.mimeType || "audio/webm" });
    diaryDraft.audioData = await blobToDataUrl(blob);
    diaryDraft.recording = false;
    diaryDraft.voiceStatus = diaryDraft.transcript
      ? "Opname bewaard. Controleer de tekst en tik op Toevoegen."
      : "Opname bewaard. Live tekst lukte niet; je kunt zelf tekst typen en de audio blijft bewaard.";
    renderStages();
  };

  startSpeechRecognition();
  diaryRecorder.start();
  renderStages();
}

function stopDiaryRecording() {
  if (diaryRecognition) {
    diaryRecognition.stop();
    diaryRecognition = null;
  }
  if (diaryRecorder && diaryRecorder.state !== "inactive") {
    diaryDraft.voiceStatus = "Opname wordt opgeslagen.";
    renderStages();
    diaryRecorder.stop();
  }
}

function renderDiaryComposer(stageIndex) {
  if (!diaryDraft.open || diaryDraft.stageIndex !== stageIndex) return "";

  return `
    <div class="diary-composer">
      <div class="diary-options">
        <button class="linkbtn ${diaryDraft.mode === "camera" ? "primary" : ""}" onclick="openDiaryPhotoInput('camera')">Foto maken</button>
        <button class="linkbtn ${diaryDraft.mode === "photos" ? "primary" : ""}" onclick="openDiaryPhotoInput('photos')">Foto's kiezen</button>
        <button class="linkbtn ${diaryDraft.mode === "text" ? "primary" : ""}" onclick="setDiaryMode('text')">Tekst</button>
        <button class="linkbtn ${diaryDraft.mode === "voice" ? "primary" : ""}" onclick="setDiaryMode('voice')">Microfoon</button>
      </div>

      <input id="diaryCameraInput" class="diary-hidden-input" type="file" accept="image/*" capture="environment" onchange="handleDiaryPhotos(this)">
      <input id="diaryPhotosInput" class="diary-hidden-input" type="file" accept="image/*" multiple onchange="handleDiaryPhotos(this)">

      ${
        diaryDraft.mode === "text" || diaryDraft.mode === "voice"
          ? `<textarea class="diary-compose-text" oninput="updateDiaryDraftNote(this.value)" placeholder="Wat willen we later terugvinden?">${diaryDraft.note}</textarea>`
          : ""
      }

      ${
        diaryDraft.photos.length
          ? `<div class="diary-photo-grid">
              ${diaryDraft.photos
                .map(
                  (photo, index) => `
                    <div class="diary-photo-draft">
                      <img src="${photo}" alt="Dagboekfoto">
                      <button class="linkbtn stopbtn" onclick="removeDiaryPhoto(${index})">Verwijderen</button>
                    </div>
                  `
                )
                .join("")}
            </div>`
          : ""
      }

      ${
        diaryDraft.mode === "voice"
          ? `<div class="voice-tools">
              <button class="linkbtn ${diaryDraft.recording ? "stopbtn" : "startbtn"}" onclick="${diaryDraft.recording ? "stopDiaryRecording()" : "startDiaryRecording()"}">
                ${diaryDraft.recording ? "Stop opname" : "Inspreken"}
              </button>
              <p class="voice-status">${diaryDraft.voiceStatus || "Tik op inspreken. Als live tekst op deze telefoon niet lukt, bewaren we alsnog de audio."}</p>
              ${
                diaryDraft.transcript
                  ? `<p class="diary-transcript">${diaryDraft.transcript}</p>`
                  : `<p class="muted">Nog geen herkende tekst.</p>`
              }
              ${diaryDraft.audioData ? `<p class="muted">Audiobestand bewaard voor beheer.</p>` : ""}
            </div>`
          : ""
      }

      <div class="diary-compose-actions">
        <button class="linkbtn mapsbtn" onclick="saveDiaryDraft()">Toevoegen</button>
        <button class="linkbtn" onclick="closeDiaryComposer()">Sluiten</button>
      </div>
    </div>
  `;
}

function renderAdminPanel() {
  const members = getMembers();
  if (!document.getElementById("adminPanel")) return;

  document.getElementById("adminPanel").innerHTML = `
    <section class="admin-panel">
      <div class="admin-head">
        <div>
          <p class="eyebrow">Reisrollen</p>
          <h2>Noorwegen 2026</h2>
          <p class="muted">Rollen gelden voor deze reis. Iemand kan later bij een andere reis gewoon een andere rol krijgen.</p>
        </div>
      </div>

      ${renderDisplayControl()}

      <div class="member-add-row">
        <select onchange="updateNewMember('role', this.value)">
          ${Object.entries(INVITE_ROLES)
            .map(([key, label]) => `<option value="${key}" ${newMemberRole === key ? "selected" : ""}>${label}</option>`)
            .join("")}
        </select>
        <textarea oninput="updateNewMember('name', this.value)" placeholder="Naam of meerdere namen, elk op een nieuwe regel">${newMemberName}</textarea>
        <button class="linkbtn mapsbtn" onclick="addMember()">Lid toevoegen</button>
      </div>

      <div class="bulk-actions">
        <button class="linkbtn" onclick="copyRoleInviteLinks('follower')">Kopieer alle thuisblijverlinks</button>
        <button class="linkbtn" onclick="copyRoleInviteLinks('traveler')">Kopieer alle reisgenootlinks</button>
        <button class="linkbtn" onclick="copyRoleInviteLinks('leader')">Kopieer alle reisleiderlinks</button>
      </div>
      <p class="muted">Administrator voeg je niet via een link toe. Maak iemand eerst lid en wijzig daarna bewust de rol naar Administrator.</p>

      <div class="member-list">
        ${authMessage ? `<p class="admin-message">${authMessage}</p>` : ""}
        ${members
          .map(
            (member) => `
              <div class="member-row">
                <input value="${member.name}" onchange="updateMemberName('${member.id}', this.value)">
                <select onchange="updateMemberRole('${member.id}', this.value)">
                  ${Object.entries(ROLES)
                    .map(([key, label]) => `<option value="${key}" ${member.role === key ? "selected" : ""}>${label}</option>`)
                    .join("")}
                </select>
                <span class="member-current">${member.id === currentUserId ? "Actief" : member.joined ? "Gekoppeld" : member.email || "Uitnodiging klaar"}</span>
                ${
                  isCloudMode() && member.inviteToken && !member.joined
                    ? `<a class="linkbtn mapsbtn" target="_blank" href="${getWhatsAppShareUrl(member)}">WhatsApp openen</a>
                       <a class="linkbtn" href="${getEmailShareUrl(member)}">E-mail openen</a>
                       <button class="linkbtn" onclick="copyInviteLink('${member.id}')">Kopieren</button>`
                    : isCloudMode() && !member.joined && member.id !== currentUserId
                      ? `<button class="linkbtn mapsbtn" onclick="ensureInviteLink('${member.id}')">Maak link</button>`
                    : ""
                }
                <button class="linkbtn stopbtn" onclick="removeMember('${member.id}')">Verwijderen</button>
              </div>
            `
          )
          .join("")}
      </div>

      <div class="role-matrix">
        <h3>Rechten</h3>
        <p><b>Administrator:</b> alles beheren, rollen uitdelen, audio zien en route sturen.</p>
        <p><b>Reisleider:</b> etappes starten/stoppen, route sturen en admin-bestanden zien.</p>
        <p><b>Medereiziger:</b> dagboek vullen, foto's/audio toevoegen en hoogtepunten afvinken.</p>
        <p><b>Thuisblijver:</b> meekijken zonder dingen te wijzigen.</p>
      </div>
    </section>
  `;
}

function renderNavigationForRole() {
  const adminButton = document.getElementById("adminNavButton");
  const themeSlot = document.getElementById("themeSlot");
  const navButtons = document.querySelectorAll(".app-nav button");
  navButtons.forEach((button) => {
    button.style.display = isCloudMode() && !authUser ? "none" : "inline-flex";
  });
  if (adminButton) {
    adminButton.style.display = getActualRole() === "admin" && (!isCloudMode() || authUser) ? "inline-flex" : "none";
  }
  if (themeSlot) {
    themeSlot.innerHTML = `
      <div class="header-tools">
        ${
          deferredInstallPrompt
            ? `<button class="linkbtn install-btn" onclick="installApp()">App installeren</button>`
            : ""
        }
        ${renderThemeControl()}
      </div>
    `;
  }
}

function getVisitedCount() {
  let count = 0;
  STAGES.forEach((stage, stageIndex) => {
    stage.pois.forEach((_, poiIndex) => {
      if (localStorage.getItem(poiKey(stageIndex, poiIndex)) === "true") count++;
    });
  });
  return count;
}

function getMustSeeCount() {
  return STAGES.reduce((total, stage) => total + stage.pois.filter((poi) => poi[1] >= 5).length, 0);
}

function getMustSeenCount() {
  let count = 0;
  STAGES.forEach((stage, stageIndex) => {
    stage.pois.forEach((poi, poiIndex) => {
      if (poi[1] >= 5 && localStorage.getItem(poiKey(stageIndex, poiIndex)) === "true") count++;
    });
  });
  return count;
}

function getPhotoCount() {
  const data = JSON.parse(localStorage.getItem("lotte_items") || "{}");
  return Object.values(data).filter((item) => item.photo).length;
}

function getDiaryCount() {
  return STAGES.reduce(
    (total, _, index) =>
      total +
      getStageDiary(index).filter(
        (entry) => (entry.note || "").trim() || (entry.transcript || "").trim() || (entry.photos || []).length
      ).length,
    0
  );
}

function getStageStatus(index) {
  if (index < activeStage) return "done";
  if (index === activeStage) return "today";
  return "planned";
}

function getRoleDashboardText() {
  const role = getCurrentRole();
  if (role === "admin") return "Alles beheren, rollen uitdelen, route sturen en dagboekbestanden zien.";
  if (role === "leader") return "Route sturen, etappes starten en praktische reisacties uitvoeren.";
  if (role === "traveler") return "Meereizen, hoogtepunten afvinken en dagboeknotities toevoegen.";
  return "Rustig meekijken met dashboard, route, dagboek en voortgang.";
}

function renderUserSwitcher() {
  const current = getCurrentUser();
  const activeRole = getCurrentRole();
  const previewText =
    canPreviewRoles() && viewRoleMode
      ? `<p class="muted">Weergave als ${VIEW_ROLES[viewRoleMode]}. Je echte rol blijft Administrator.</p>`
      : "";

  return `
    <section class="role-strip">
      <div>
        <p class="eyebrow">Ingelogd als</p>
        <h2>${current.name}</h2>
        <p class="muted">${ROLES[activeRole]} - ${getRoleDashboardText()}</p>
        ${previewText}
      </div>
      ${isCloudMode() ? `<button class="linkbtn" onclick="signOut()">Uitloggen</button>` : ""}
    </section>
  `;
}

function getTotalMapUrl() {
  const totalPoints = [
    "Grevelingstraat 77, Lisse, Netherlands",
    "Bovensmilde, Netherlands",
    "Malmo, Sweden",
    "Geilo, Norway",
    "Eidfjord, Norway",
    "Flam, Norway",
    "Borgund Stave Church, Norway",
    "Loen, Norway",
    "Geiranger, Norway",
    "Trollstigen, Norway",
    "Atlantic Ocean Road, Norway",
    "Lom, Norway",
    "Karlstad, Sweden",
    "Amsterdam, Netherlands",
  ];

  return "https://www.google.com/maps/dir/" + totalPoints.map(encodeURIComponent).join("/");
}

function openTotalRoute() {
  showTab("total");
}

function getRouteColor(index) {
  if (index < activeStage) return "#22c55e";
  if (index === activeStage) return "#174c82";
  return "#5ab8ff";
}

function setRouteStatus(message) {
  const status = document.getElementById("routeStatus");
  if (status) status.textContent = message;
}

function setGpsStatus(message) {
  gpsStatus = message;
  localStorage.setItem("reisapp_gps_status", message);

  const dashboardStatus = document.getElementById("dashboardGpsStatus");
  if (dashboardStatus) dashboardStatus.textContent = message;
  setRouteStatus(message);
}

function centerTotalRoute() {
  if (totalRouteMap && totalRouteBounds) {
    totalRouteMap.fitBounds(totalRouteBounds, { padding: [24, 24] });
  }
}

function getLiveMarkerColor() {
  return driving ? "#22c55e" : "#ef4444";
}

function resetTotalRoute() {
  if (!totalRouteMap) return;
  totalRouteMap.remove();
  totalRouteMap = null;
  totalRouteBounds = null;
  livePositionMarker = null;
  liveTrackLine = null;

  if (document.getElementById("total").classList.contains("active")) {
    setTimeout(initTotalRoute, 0);
  }
}

function resetDashboardRoute() {
  if (!dashboardRouteMap) return;
  dashboardRouteMap.remove();
  dashboardRouteMap = null;
  dashboardPositionMarker = null;
  dashboardTrackLine = null;
}

function getFallbackRouteBounds() {
  return ROUTE_STAGES.flat();
}

function getTrackLatLngs(track = getSavedTrack()) {
  return track.map((item) => [item.lat, item.lon]);
}

function getDashboardBounds() {
  const track = getTrackLatLngs();
  if (track.length) return L.latLngBounds(track);
  return null;
}

function addSatelliteLayer(map) {
  return L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
    attribution: "Tiles &copy; Esri",
    maxZoom: 19,
  }).addTo(map);
}

function setDashboardFollowLive(shouldFollow) {
  dashboardFollowLive = shouldFollow;
  localStorage.setItem("reisapp_dashboard_follow", String(shouldFollow));

  if (shouldFollow) {
    const track = getSavedTrack();
    const last = track[track.length - 1];
    if (last && dashboardRouteMap) {
      dashboardRouteMap.panTo([last.lat, last.lon], { animate: true });
    }
  }

  updateDashboardFollowControl();
}

function updateDashboardFollowControl() {
  const button = document.getElementById("dashboardFollowButton");
  if (!button) return;
  button.textContent = dashboardFollowLive ? "GPS volgen" : "Volgen uit";
  button.classList.toggle("active", dashboardFollowLive);
}

function updateLiveMapStyles() {
  const color = getLiveMarkerColor();
  [livePositionMarker, dashboardPositionMarker].forEach((marker) => {
    if (marker) marker.setStyle({ fillColor: color });
  });
}

function initDashboardRoute() {
  const container = document.getElementById("dashboardRouteMap");
  if (!document.getElementById("map")?.classList.contains("active")) return;
  if (!container || typeof L === "undefined") return;

  if (!dashboardRouteMap) {
    dashboardRouteMap = L.map(container, {
      zoomControl: false,
      scrollWheelZoom: true,
    });

    L.control.zoom({ position: "bottomright" }).addTo(dashboardRouteMap);
    addSatelliteLayer(dashboardRouteMap);

    const followControl = L.control({ position: "bottomleft" });
    followControl.onAdd = () => {
      const wrapper = L.DomUtil.create("div", "dashboard-map-control");
      const button = L.DomUtil.create("button", "dashboard-follow-btn", wrapper);
      button.id = "dashboardFollowButton";
      button.type = "button";
      L.DomEvent.disableClickPropagation(wrapper);
      L.DomEvent.on(button, "click", () => setDashboardFollowLive(true));
      return wrapper;
    };
    followControl.addTo(dashboardRouteMap);

    dashboardRouteMap.on("dragstart zoomstart", () => {
      if (!dashboardProgrammaticMove) setDashboardFollowLive(false);
    });
  }

  const bounds = getDashboardBounds();
  if (bounds && bounds.isValid()) {
    dashboardProgrammaticMove = true;
    dashboardRouteMap.fitBounds(bounds, { padding: [34, 34], maxZoom: getSavedTrack().length ? 12 : 6 });
    setTimeout(() => {
      dashboardProgrammaticMove = false;
    }, 120);
  } else {
    dashboardRouteMap.setView([61.4, 9.2], 5);
  }

  restoreDashboardTrack();
  updateDashboardFollowControl();
  setTimeout(() => dashboardRouteMap.invalidateSize(), 80);
}

function initTotalRoute() {
  if (typeof L === "undefined") {
    setRouteStatus("Kaartbibliotheek kon niet laden. Controleer de internetverbinding.");
    return;
  }

  if (!totalRouteMap) {
    totalRouteMap = L.map("totalRouteMap", {
      zoomControl: false,
      scrollWheelZoom: true,
    });

    L.control.zoom({ position: "bottomright" }).addTo(totalRouteMap);
    addSatelliteLayer(totalRouteMap);

    renderTotalRoute();
    restoreLiveTrack();
  }

  setTimeout(() => totalRouteMap.invalidateSize(), 80);
  centerTotalRoute();
}

async function getStageGeometry(points) {
  const coords = points.map(([lat, lon]) => `${lon},${lat}`).join(";");
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Route ophalen mislukt");

  const data = await response.json();
  if (!data.routes || !data.routes[0]) throw new Error("Geen route gevonden");

  return data.routes[0].geometry.coordinates.map(([lon, lat]) => [lat, lon]);
}

function distanceKm(a, b) {
  const toRad = (value) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(h));
}

function routeLengthKm(line) {
  return line.slice(1).reduce((total, point, index) => total + distanceKm(line[index], point), 0);
}

function isSuspiciousRouteLine(fallback, line) {
  if (!fallback.length || !line.length) return true;

  const fallbackLength = routeLengthKm(fallback);
  const routedLength = routeLengthKm(line);
  if (routedLength > fallbackLength * 2.2) return true;

  const fallbackBounds = L.latLngBounds(fallback);
  const paddedBounds = fallbackBounds.pad(0.65);
  return line.some((point) => !paddedBounds.contains(point));
}

function getConnectedRouteStage(index) {
  const points = [...ROUTE_STAGES[index]];
  const previous = ROUTE_STAGES[index - 1];
  if (!previous || !points.length) return points;

  const previousEnd = previous[previous.length - 1];
  if (distanceKm(previousEnd, points[0]) > 3) {
    return [previousEnd, ...points];
  }
  return points;
}

async function renderTotalRoute() {
  setRouteStatus("Route wordt opgebouwd uit alle etappes...");
  const allBounds = [];
  let usedFallback = false;

  for (let index = 0; index < ROUTE_STAGES.length; index++) {
    const fallback = getConnectedRouteStage(index);
    let line = fallback;

    try {
      line = await getStageGeometry(fallback);
      if (isSuspiciousRouteLine(fallback, line)) {
        line = fallback;
        usedFallback = true;
      }
    } catch (_) {
      usedFallback = true;
    }

    L.polyline(line, {
      color: getRouteColor(index),
      weight: index === activeStage ? 6 : 4,
      opacity: index === activeStage ? 0.96 : 0.72,
      dashArray: index > activeStage ? "10 10" : null,
    }).addTo(totalRouteMap);

    allBounds.push(...line);
  }

  ROUTE_STAGES.forEach((points, index) => {
    const [lat, lon] = points[0];
    L.circleMarker([lat, lon], {
      radius: index === activeStage ? 7 : 5,
      color: "#ffffff",
      weight: 1,
      fillColor: getRouteColor(index),
      fillOpacity: 1,
    })
      .bindTooltip(`Dag ${index + 1}`, { direction: "top" })
      .addTo(totalRouteMap);
  });

  totalRouteBounds = L.latLngBounds(allBounds.length ? allBounds : getFallbackRouteBounds());
  centerTotalRoute();
  setRouteStatus(
    usedFallback
      ? "Route geladen. Een deel gebruikt bekende routepunten omdat live routing niet beschikbaar was."
      : "Route geladen via alle etappes."
  );
}

function getSavedTrack() {
  return JSON.parse(localStorage.getItem("reisapp_live_track") || "[]");
}

function saveTrackPoint(point) {
  const track = getSavedTrack();
  track.push(point);
  localStorage.setItem("reisapp_live_track", JSON.stringify(track.slice(-1200)));
}

function restoreLiveTrack() {
  const track = getSavedTrack();
  if (!track.length || !totalRouteMap) return;
  drawLivePosition(track[track.length - 1], track);
}

function restoreDashboardTrack() {
  const track = getSavedTrack();
  if (!track.length || !dashboardRouteMap) return;
  drawDashboardLivePosition(track[track.length - 1], track);
}

function drawLivePosition(point, track = getSavedTrack()) {
  drawTotalLivePosition(point, track);
  drawDashboardLivePosition(point, track);
}

function drawTotalLivePosition(point, track = getSavedTrack()) {
  if (!totalRouteMap) return;

  const latLng = [point.lat, point.lon];
  if (!livePositionMarker) {
    livePositionMarker = L.circleMarker(latLng, {
      radius: 8,
      color: "#ffffff",
      weight: 2,
      fillColor: getLiveMarkerColor(),
      fillOpacity: 1,
    }).addTo(totalRouteMap);
  } else {
    livePositionMarker.setLatLng(latLng);
    livePositionMarker.setStyle({ fillColor: getLiveMarkerColor() });
  }

  const trackLine = getTrackLatLngs(track);
  if (!liveTrackLine) {
    liveTrackLine = L.polyline(trackLine, {
      color: "#22c55e",
      weight: 5,
      opacity: 0.9,
    }).addTo(totalRouteMap);
  } else {
    liveTrackLine.setLatLngs(trackLine);
  }
}

function drawDashboardLivePosition(point, track = getSavedTrack()) {
  if (!dashboardRouteMap) return;

  const latLng = [point.lat, point.lon];
  if (!dashboardPositionMarker) {
    dashboardPositionMarker = L.circleMarker(latLng, {
      radius: 9,
      color: "#ffffff",
      weight: 3,
      fillColor: getLiveMarkerColor(),
      fillOpacity: 1,
      className: driving ? "live-marker-driving" : "live-marker-stopped",
    }).addTo(dashboardRouteMap);
  } else {
    dashboardPositionMarker.setLatLng(latLng);
    dashboardPositionMarker.setStyle({ fillColor: getLiveMarkerColor() });
  }

  const trackLine = getTrackLatLngs(track);
  if (!dashboardTrackLine) {
    dashboardTrackLine = L.polyline(trackLine, {
      color: "#22c55e",
      weight: 5,
      opacity: 0.92,
    }).addTo(dashboardRouteMap);
  } else {
    dashboardTrackLine.setLatLngs(trackLine);
  }

  if (dashboardFollowLive) {
    dashboardRouteMap.panTo(latLng, { animate: true });
  }
}

function projectHeroPoint(point) {
  const minLat = 51.4;
  const maxLat = 64.2;
  const minLon = 3.2;
  const maxLon = 14.6;
  const x = ((point.lon - minLon) / (maxLon - minLon)) * 1000;
  const y = ((maxLat - point.lat) / (maxLat - minLat)) * 520;
  return [Math.max(0, Math.min(1000, x)), Math.max(0, Math.min(520, y))];
}

function renderHeroTrackOverlay() {
  const track = getSavedTrack();
  if (!track.length) return "";

  const points = track.map((point) => projectHeroPoint(point).join(",")).join(" ");
  const last = projectHeroPoint(track[track.length - 1]);
  const markerClass = driving ? "driving" : "stopped";

  return `
    <svg class="hero-track-overlay" viewBox="0 0 1000 520" preserveAspectRatio="none" aria-hidden="true">
      <polyline class="hero-track-line" points="${points}" />
      <circle class="hero-track-pulse ${markerClass}" cx="${last[0]}" cy="${last[1]}" r="16" />
      <circle class="hero-track-current ${markerClass}" cx="${last[0]}" cy="${last[1]}" r="9" />
    </svg>
  `;
}

function updateLivePosition() {
  if (!navigator.geolocation) {
    setGpsStatus("GPS is niet beschikbaar in deze browser.");
    return Promise.resolve(false);
  }

  if (!window.isSecureContext) {
    setGpsStatus("GPS werkt alleen via https of in de geinstalleerde app.");
    return Promise.resolve(false);
  }

  setGpsStatus("GPS wordt opgehaald. Geef toestemming als je telefoon daarom vraagt.");

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const point = {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          accuracy: Math.round(position.coords.accuracy || 0),
          time: Date.now(),
        };

        saveTrackPoint(point);
        setDashboardFollowLive(true);
        drawLivePosition(point);
        if (totalRouteMap) totalRouteMap.panTo([point.lat, point.lon], { animate: true });
        setGpsStatus(`GPS-punt gezet. Nauwkeurigheid ongeveer ${point.accuracy} meter.`);
        resolve(true);
      },
      (error) => {
        const messages = {
          1: "GPS-toegang is geweigerd. Zet locatie aan voor deze app/site in je telefooninstellingen.",
          2: "Je telefoon kon nu geen GPS-positie bepalen. Probeer buiten of met beter bereik.",
          3: "GPS duurde te lang. Probeer nogmaals met de app open in beeld.",
        };
        setGpsStatus(messages[error.code] || "GPS-toegang is geweigerd of niet beschikbaar.");
        resolve(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 25000,
      }
    );
  });
}

function startLocationTracking() {
  updateLivePosition();
  if (locationTimer) clearInterval(locationTimer);
  locationTimer = setInterval(updateLivePosition, 300000);
}

function renderStageDots() {
  return STAGES.map(
    (_, index) => `
      <button class="hero-dot ${getStageStatus(index)}" onclick="openStage(${index})" aria-label="Dag ${index + 1}">
        ${index + 1}
      </button>
    `
  ).join("");
}

function renderDashboard() {
  const stage = STAGES[activeStage];
  return `
    ${renderUserSwitcher()}

    <section class="trip-hero">
      <div id="dashboardRouteMap" class="hero-map dashboard-route-map" aria-label="Live GPS-kaart van de reis"></div>
      ${
        canUpdateGps()
          ? `<div class="dashboard-gps-panel">
              <p class="eyebrow">GPS tracking</p>
              <p id="dashboardGpsStatus">${gpsStatus}</p>
              <button class="linkbtn mapsbtn" onclick="updateLivePosition()">GPS nu meten</button>
            </div>`
          : ""
      }
    </section>

    <section class="dashboard">
      <div class="dashcard">
        <span class="dashicon">Route</span>
        <span class="dashnum">${STAGES.length}</span>
        <span class="dashlabel">Etappes</span>
      </div>

      <div class="dashcard">
        <span class="dashicon">Stops</span>
        <span class="dashnum">${getVisitedCount()}</span>
        <span class="dashlabel">Stops gedaan</span>
      </div>

      <div class="dashcard">
        <span class="dashicon">Seen</span>
        <span class="dashnum">${getMustSeenCount()}</span>
        <span class="dashlabel">Bezienswaardigheden gezien</span>
      </div>

      <div class="dashcard">
        <span class="dashicon">Dagboek</span>
        <span class="dashnum">${getDiaryCount()}</span>
        <span class="dashlabel">Notities</span>
      </div>
    </section>

    <section class="dashboard-grid">
      <div class="card route-panel">
        <p class="eyebrow">Routeplanning</p>
        <h2>Etappes</h2>
        <div class="stage-list-dashboard">
          ${STAGES.map(
            (item, index) => `
              <button class="stage-row ${getStageStatus(index)} ${index === activeStage ? "selected" : ""}" onclick="openStage(${index})">
                <span class="day-badge">Dag<br>${index + 1}</span>
                <span class="stage-row-main">
                  <b>${item.title}</b>
                  <small>${item.goal}</small>
                </span>
                <span class="stage-row-meta">${item.km}<br>${item.time}</span>
              </button>
            `
          ).join("")}
        </div>
      </div>

      <div class="card selected-stage-panel">
        <p class="eyebrow">Vandaag geselecteerd</p>
        <div class="selected-stage-head">
          <span class="day-badge large">Dag<br>${activeStage + 1}</span>
          <div>
            <h2>${stage.title}</h2>
            <p class="muted">${stage.goal}</p>
          </div>
        </div>

        <div class="meta">
          <span class="pill">${stage.km}</span>
          <span class="pill">${stage.time}</span>
          <span class="pill">${stage.to}</span>
        </div>

        <h3>Route vandaag</h3>
        <p>${stage.from} -> ${stage.to}</p>

        <div class="actionbar">
          <a class="linkbtn primary" target="_blank" href="${stage.maps}">Open in Google Maps</a>
          <button class="linkbtn" onclick="openStage(${activeStage})">Open dagdetails</button>
        </div>

        <h3>Hoogtepunten onderweg</h3>
        ${stage.pois
          .map(
            (poi) => `
              <div class="compact-poi">
                <span class="stars">${stars(poi[1])}</span>
                <span>
                  <b>${poi[0]}</b><br>
                  <small class="muted">${poi[2]}</small>
                </span>
                <a class="textlink" target="_blank" href="${poi[3]}">Pin</a>
              </div>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderStages() {
  const stage = STAGES[activeStage];
  const diary = getStageDiary(activeStage);
  const groceryStop = stage.route[Math.max(0, stage.route.length - 2)] || stage.to;
  const tankStop = stage.route[1] || stage.from;
  const routeText = stage.route.join(" -> ");
  const navigationUrl = getGoogleNavigationUrl(stage);

  document.getElementById("stageList").innerHTML = `
    <div class="card stage-detail">
      ${
        canControlRoute()
          ? `<button class="linkbtn stage-start-toggle ${driving ? "stopbtn" : "startbtn"}" onclick="toggleDriving('${navigationUrl}')">
              ${driving ? "Stop etappe" : "Start etappe"}
            </button>`
          : ""
      }

      <p class="eyebrow">${stage.day}</p>
      <h1>${stage.title}</h1>

      <div class="meta">
        <span class="pill">${stage.km}</span>
        <span class="pill">${stage.time}</span>
        <span class="pill">${stage.goal}</span>
        <a class="linkbtn mapsbtn" target="_blank" href="${stage.maps}">Open in Google Maps</a>
      </div>

      <section class="day-route">
        <p class="eyebrow">Route</p>
        <h3>${stage.from} -> ${stage.to}</h3>
        <p>${routeText}</p>
      </section>

      <div class="day-tools">
        <section class="day-tool day-diary featured-diary">
          <p class="eyebrow">Herinneringen</p>
          <div class="diary-head">
            <h3>Dagboek</h3>
            ${
              canEditDiary()
                ? `<button class="linkbtn primary diary-add" onclick="openDiaryComposer(${activeStage})">Dagboeknotitie toevoegen</button>`
                : ""
            }
          </div>
          ${renderDiaryComposer(activeStage)}
          ${
            diary.length
              ? diary
                  .map(
                    (entry) => `
                      <div class="diary-entry">
                        <span>${entry.created}</span>
                        <textarea onchange="updateDiaryEntry(${activeStage}, ${entry.id}, this.value)" placeholder="Wat willen we onthouden van deze dag?">${entry.note}</textarea>
                        ${
                          entry.transcript
                            ? `<p class="diary-transcript">${entry.transcript}</p>`
                            : ""
                        }
                        ${
                          entry.photos && entry.photos.length
                            ? `<div class="diary-photo-grid saved">
                                ${entry.photos.map((photo) => `<img src="${photo}" alt="Dagboekfoto">`).join("")}
                              </div>`
                            : ""
                        }
                        ${
                          entry.audioData && canSeeAdminFiles()
                            ? `<audio class="diary-audio" controls src="${entry.audioData}"></audio>`
                            : ""
                        }
                      </div>
                    `
                  )
                  .join("")
              : `<p class="muted">Nog geen dagboeknotities voor deze dag.</p>`
          }
        </section>

        <section class="day-tool">
          <p class="eyebrow">Onderweg</p>
          <h3>Hoogtepunten</h3>
          ${stage.pois
            .map((poi, poiIndex) => {
              const key = poiKey(activeStage, poiIndex);
              const visited = localStorage.getItem(key) === "true";

              return `
                <div class="poi ${visited ? "visited" : ""}">
                  <div class="stars">${stars(poi[1])}</div>
                  <div>
                    <b>${poi[0]}</b><br>
                    <span class="muted">${poi[2]}</span>
                  </div>
                  <div>
                    <a target="_blank" class="linkbtn" href="${poi[3]}">Pin</a>
                    ${
                      canMarkVisited()
                        ? `<button class="linkbtn visitbtn ${visited ? "done" : ""}" onclick="toggleVisited('${key}')">
                            ${visited ? "Bezocht" : "Markeer bezocht"}
                          </button>`
                        : ""
                    }
                  </div>
                </div>
              `;
            })
            .join("")}
        </section>

        <section class="day-tool">
          <p class="eyebrow">Overnachten</p>
          <h3>Geadviseerde campingpunten</h3>
          <p><b>Eerste keuze:</b> zoek rond ${stage.to}, zodat de dag netjes eindigt bij de etappebestemming.</p>
          <p><b>Backup:</b> zoek 30-60 minuten voor ${stage.to}, handig als rijden, weer of stops uitlopen.</p>
          <a class="textlink" target="_blank" href="https://www.google.com/maps/search/camping+near+${encodeURIComponent(stage.to)}">Campings bij eindpunt</a>
        </section>

        <section class="day-tool">
          <p class="eyebrow">Praktisch</p>
          <h3>Tanken en boodschappen</h3>
          <p><b>Tanken:</b> beste moment is bij vertrek of rond ${tankStop}; in Noorwegen liever boven halfvol blijven.</p>
          <p><b>Boodschappen:</b> plan dit rond ${groceryStop}, voordat je richting kleinere fjord- of bergwegen gaat.</p>
          <div class="inline-actions">
            <a class="textlink" target="_blank" href="https://www.google.com/maps/search/gas+station+near+${encodeURIComponent(tankStop)}">Tankstations</a>
            <a class="textlink" target="_blank" href="https://www.google.com/maps/search/supermarket+near+${encodeURIComponent(groceryStop)}">Supermarkten</a>
          </div>
        </section>
      </div>
    </div>
  `;
}

function toggleLotteOpen(index) {
  const open = JSON.parse(localStorage.getItem("lotte_open") || "{}");
  open[index] = !open[index];
  localStorage.setItem("lotte_open", JSON.stringify(open));
  renderLotte();
}

function saveLotteItem(index, field, value) {
  const data = JSON.parse(localStorage.getItem("lotte_items") || "{}");
  data[index] = data[index] || {};
  data[index][field] = value;
  localStorage.setItem("lotte_items", JSON.stringify(data));
  renderLotte();
}

function saveLottePhoto(index, input) {
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => saveLotteItem(index, "photo", reader.result);
  reader.readAsDataURL(file);
}

function renderLotte() {
  const items = [
    "Rendier gezien",
    "Schaap gezien",
    "Waterval gezien",
    "Grote brug gezien",
    "Veerboot geweest",
    "Staafkerk bezocht",
    "Noors ijsje gegeten",
    "Lange tunnel gereden",
    "Fjord gezien",
    "Gletsjer gezien",
    "Regenboog gezien",
    "Steenmannetje gebouwd",
    "Voeten in een fjord",
    "Mooiste camperfoto gemaakt",
  ];

  const saved = JSON.parse(localStorage.getItem("lotte_items") || "{}");
  const open = JSON.parse(localStorage.getItem("lotte_open") || "{}");

  document.getElementById("lotteList").innerHTML = `
    <div class="lotte-list">
      ${items
        .map((item, index) => {
          const data = saved[index] || {};
          const isOpen = open[index];

          return `
            <div class="lotte-item ${data.checked ? "checked" : ""}">
              <div class="lotte-main" onclick="toggleLotteOpen(${index})">
                <label onclick="event.stopPropagation()">
                  <input type="checkbox" ${data.checked ? "checked" : ""} onchange="saveLotteItem(${index}, 'checked', this.checked)">
                  <b>${item}</b>
                </label>
                <span>${isOpen ? "Dicht" : "Open"}</span>
              </div>

              ${
                data.checked
                  ? `<div class="lotte-summary">
                      ${data.photo ? "Foto " : ""}
                      ${data.note ? "Verhaal " : ""}
                      ${data.score ? "*".repeat(Number(data.score)) : ""}
                    </div>`
                  : ""
              }

              ${
                isOpen
                  ? `
                    <div class="lotte-extra">
                      <label>Foto toevoegen:
                        <input type="file" accept="image/*" onchange="saveLottePhoto(${index}, this)">
                      </label>

                      ${data.photo ? `<img class="lotte-photo" src="${data.photo}" alt="Foto">` : ""}

                      <label>Vertel iets over wat je hebt gezien:
                        <textarea onchange="saveLotteItem(${index}, 'note', this.value)" placeholder="Vertel iets over wat je hebt gezien...">${data.note || ""}</textarea>
                      </label>

                      <label>Score:
                        <select onchange="saveLotteItem(${index}, 'score', this.value)">
                          <option value="">Kies score</option>
                          ${[1, 2, 3, 4, 5]
                            .map((n) => `<option value="${n}" ${String(data.score) === String(n) ? "selected" : ""}>${n} sterren</option>`)
                            .join("")}
                        </select>
                      </label>
                    </div>
                  `
                  : ""
              }
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function render() {
  renderNavigationForRole();
  if (!authReady) {
    document.getElementById("summary").innerHTML = `<section class="auth-gate"><p class="muted">App wordt geladen...</p></section>`;
    return;
  }

  if (isCloudMode() && !authUser) {
    document.getElementById("summary").innerHTML = renderAuthGate();
    document.getElementById("stageList").innerHTML = "";
    document.getElementById("lotteList").innerHTML = "";
    document.getElementById("adminPanel").innerHTML = "";
    return;
  }

  resetDashboardRoute();
  document.getElementById("summary").innerHTML = renderDashboard();
  setTimeout(initDashboardRoute, 0);
  renderStages();
  renderLotte();
  renderAdminPanel();
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  render();
});

initAuth();
if (driving) startLocationTracking();
