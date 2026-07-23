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

const OWNER_EMAILS = ["jeroenblomsma1978@gmail.com"];

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
const TRIP_START_DATE = "2026-07-20T12:00:00+02:00";
const FUEL_TYPES = {
  diesel: "Diesel",
  e10: "Benzine E10",
  e5: "Benzine Euro95/E5",
};

let supabaseClient = null;
let authReady = false;
let authSession = null;
let authUser = null;
let authMessage = "";
let remoteTrip = null;
let remoteMembers = null;
let remoteDiaryEntries = [];
let remoteDiaryMedia = [];
let remoteDiaryComments = [];
let remoteGpsPoints = [];
let remoteVisitedPois = [];
let remoteVisitedPoisLoaded = false;
let newMemberName = "";
let newMemberRole = "follower";
let currentUserId = localStorage.getItem("reisapp_current_user") || "jeroen";
let viewRoleMode = localStorage.getItem("reisapp_view_role") || "";
let adminMemberView = localStorage.getItem("reisapp_admin_member_view") || "all";
let themeMode = localStorage.getItem("reisapp_theme") || "dark";
const requestedDay = Number(new URLSearchParams(window.location.search).get("day"));
let requestedDayPending = Number.isInteger(requestedDay) && requestedDay >= 1 && requestedDay <= STAGES.length;
let activeStage = requestedDayPending
  ? requestedDay - 1
  : Number(localStorage.getItem("reisapp_active_stage") || 0);
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
let fuelType = localStorage.getItem("reisapp_fuel_type") || "diesel";
let fuelLookupState = {
  stageIndex: null,
  loading: false,
  message: "",
  stations: [],
  targetLabel: "",
};
let groceryLookupState = {
  stageIndex: null,
  loading: false,
  message: "",
  targetLabel: "",
};
let weatherState = {
  loading: false,
  requested: false,
  message: "Weer wordt geladen zodra er een locatie bekend is.",
  data: null,
  position: null,
  updatedAt: "",
};
let locationTimer;
let locationWatchId = null;
let gpsRefreshTimer;
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
  saving: false,
  status: "",
};
let diaryRecorder;
let diaryRecorderChunks = [];
let diaryRecognition;
let diaryCommentDrafts = {};
let deferredInstallPrompt = null;
let panoramaViewer = null;

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

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
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

function isMissingInviteFunctionError(error) {
  return /claim_trip_invite|schema cache|function .*not.*found/i.test(error?.message || "");
}

function isStaleInviteError(error) {
  return /uitnodiging is niet geldig|al gebruikt|invalid|used/i.test(error?.message || "");
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

function getAuthRedirectUrl() {
  return getAppShareBaseUrl();
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

function canAssignRole(role) {
  return Object.prototype.hasOwnProperty.call(ROLES, role);
}

function getMembers() {
  if (remoteMembers && remoteMembers.length) {
    return remoteMembers.map((member) => ({
      id: member.user_id || member.id,
      memberId: member.id,
      name: member.display_name,
      role: member.user_id && remoteTrip?.owner_id === member.user_id ? "admin" : member.role,
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
  if (isCloudMode() && authUser && remoteTrip?.owner_id === authUser.id) return "admin";
  if (isCloudMode() && OWNER_EMAILS.includes((authUser?.email || "").toLowerCase())) return "admin";
  return getCurrentUser().role;
}

function canPreviewRoles() {
  return getActualRole() === "admin";
}

function getCurrentRole() {
  if (canPreviewRoles() && viewRoleMode && VIEW_ROLES[viewRoleMode]) return viewRoleMode;
  return getActualRole();
}

function getMemberName(userId) {
  return getMembers().find((member) => member.id === userId)?.name || "Reiziger";
}

function setViewRoleMode(role) {
  viewRoleMode = Object.prototype.hasOwnProperty.call(VIEW_ROLES, role) ? role : "";
  localStorage.setItem("reisapp_view_role", viewRoleMode);
  render();
}

function setAdminMemberView(view) {
  adminMemberView = ["all", "joined", "invites"].includes(view) ? view : "all";
  localStorage.setItem("reisapp_admin_member_view", adminMemberView);
  renderAdminPanel();
  renderWeatherPanel();
}

function clearLocalTestData() {
  const confirmed = window.confirm(
    "Lokale testdata op dit apparaat wissen? Je login, leden en thema blijven staan."
  );
  if (!confirmed) return;

  Object.keys(localStorage).forEach((key) => {
    if (
      key === "reisapp_active_stage" ||
      key === "reisapp_dashboard_follow" ||
      key === "reisapp_driving" ||
      key === "reisapp_gps_status" ||
      key === "reisapp_live_track" ||
      key === "lotte_items" ||
      key === "lotte_open" ||
      key.startsWith("reisapp_stage_diary_") ||
      key.startsWith("stage_")
    ) {
      localStorage.removeItem(key);
    }
  });

  activeStage = 0;
  driving = false;
  dashboardFollowLive = true;
  gpsStatus = "Lokale testdata is gewist op dit apparaat.";
  remoteGpsPoints = [];
  if (locationTimer) clearInterval(locationTimer);
  locationTimer = null;
  stopLocationWatch();
  resetTotalRoute();
  resetDashboardRoute();
  authMessage = "Lokale testdata is gewist op dit apparaat.";
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
  if (!canAssignRole(role)) {
    authMessage = "Ongeldige rol. Kies Administrator, Reisleider, Reisgenoot of Thuisblijver.";
    render();
    return;
  }

  const member = getMembers().find((item) => item.id === id || item.memberId === id);
  if (!member) return;

  if (isCloudMode() && getActualRole() !== "admin") {
    authMessage = "Alleen een Administrator kan reisrollen wijzigen.";
    render();
    return;
  }

  if (isCloudMode() && !member.memberId) {
    authMessage = `Rol van ${member.name} kan niet worden bijgewerkt: intern lid-id ontbreekt. Herlaad de pagina en probeer opnieuw.`;
    render();
    return;
  }

  if (isCloudMode() && member.id === authUser?.id && member.role === "admin" && role !== "admin") {
    authMessage = "Je kunt je eigen Administrator-rol niet via deze pagina verlagen.";
    render();
    return;
  }

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

    if (getActualRole() !== "admin") {
      authMessage = "Administrator maken is geannuleerd.";
      render();
      return;
    }
  }

  if (isCloudMode()) {
    const { data, error } = await supabaseClient
      .from("trip_members")
      .update({ role })
      .eq("id", member.memberId)
      .select("id, role")
      .maybeSingle();

    if (error) {
      authMessage = `Rol niet bijgewerkt: ${error.message}`;
    } else if (!data) {
      authMessage = `Rol niet bijgewerkt: Supabase heeft geen lidrij gewijzigd voor ${member.name}.`;
    } else {
      authMessage = `${member.name} is nu ${ROLES[data.role] || data.role}.`;
    }
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
      startSharedGpsRefresh();
    } else {
      remoteTrip = null;
      remoteMembers = null;
      remoteGpsPoints = [];
      remoteVisitedPois = [];
      remoteVisitedPoisLoaded = false;
      stopSharedGpsRefresh();
      render();
    }
  });

  if (authUser) {
    await loadRemoteState();
    startSharedGpsRefresh();
  }
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
      emailRedirectTo: getAuthRedirectUrl(),
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
      if (isMissingInviteFunctionError(claimed.error)) {
        authMessage = "Uitnodigingen kunnen nog niet gekoppeld worden: voer in Supabase eerst docs/supabase-migration-invite-links.sql uit.";
        return;
      }
      if (isStaleInviteError(claimed.error)) {
        clearPendingInviteToken();
        authMessage = "Oude uitnodigingslink genegeerd. Ik laad nu de bestaande reisleden.";
      } else {
        authMessage = claimed.error.message;
        return;
      }
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
  } else if (remoteTrip.owner_id === authUser.id && existingMember.role !== "admin") {
    const { error } = await supabaseClient
      .from("trip_members")
      .update({ role: "admin", joined_at: existingMember.joined_at || new Date().toISOString() })
      .eq("id", existingMember.id);
    if (error) authMessage = `Eigenaar bleef geen Administrator: ${error.message}`;
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
  await loadRemoteVisitedPois();
  await syncLocalVisitedPoisToRemote();
  await loadRemoteDiary();
  await loadRemoteGps();
}

async function loadRemoteVisitedPois() {
  if (!isCloudMode() || !remoteTrip) return;

  const { data, error } = await supabaseClient
    .from("visited_pois")
    .select("id, stage_index, poi_index, user_id, visited_at")
    .eq("trip_id", remoteTrip.id)
    .order("visited_at", { ascending: true });

  if (error) {
    console.warn("Visited POIs could not be loaded", error);
    remoteVisitedPois = [];
    remoteVisitedPoisLoaded = false;
    return;
  }

  remoteVisitedPois = data || [];
  remoteVisitedPoisLoaded = true;
}

async function syncLocalVisitedPoisToRemote() {
  if (!isCloudMode() || !remoteTrip || !authUser || !remoteVisitedPoisLoaded) return;

  const rows = [];
  STAGES.forEach((stage, stageIndex) => {
    stage.pois.forEach((_, poiIndex) => {
      const alreadyRemote = remoteVisitedPois.some(
        (item) =>
          item.stage_index === stageIndex &&
          item.poi_index === poiIndex &&
          item.user_id === authUser.id
      );

      if (isLocalPoiVisited(stageIndex, poiIndex) && !alreadyRemote) {
        rows.push({
          trip_id: remoteTrip.id,
          stage_index: stageIndex,
          poi_index: poiIndex,
          user_id: authUser.id,
          visited_at: new Date().toISOString(),
        });
      }
    });
  });

  if (!rows.length) return;

  const { error } = await supabaseClient
    .from("visited_pois")
    .upsert(rows, { onConflict: "trip_id,stage_index,poi_index,user_id" });

  if (error) {
    authMessage = error.message;
    return;
  }

  await loadRemoteVisitedPois();
}

async function loadRemoteDiary() {
  if (!isCloudMode() || !remoteTrip) return;

  const { data: entries, error: entriesError } = await supabaseClient
    .from("diary_entries")
    .select("id, stage_index, user_id, note, transcript, created_at, updated_at")
    .eq("trip_id", remoteTrip.id)
    .order("created_at", { ascending: false });

  if (entriesError) {
    authMessage = entriesError.message;
    remoteDiaryEntries = [];
    remoteDiaryMedia = [];
    remoteDiaryComments = [];
    return;
  }

  const entryIds = (entries || []).map((entry) => entry.id);
  let media = [];
  let comments = [];
  if (entryIds.length) {
    let mediaResult = await supabaseClient
      .from("diary_media")
      .select("id, diary_entry_id, kind, storage_path, admin_only, caption, taken_at, projection, created_at")
      .in("diary_entry_id", entryIds)
      .order("created_at", { ascending: true });

    if (mediaResult.error && /projection|column|schema cache/i.test(mediaResult.error.message || "")) {
      mediaResult = await supabaseClient
        .from("diary_media")
        .select("id, diary_entry_id, kind, storage_path, admin_only, caption, taken_at, created_at")
        .in("diary_entry_id", entryIds)
        .order("created_at", { ascending: true });
    }

    if (mediaResult.error && /caption|taken_at|column|schema cache/i.test(mediaResult.error.message || "")) {
      mediaResult = await supabaseClient
        .from("diary_media")
        .select("id, diary_entry_id, kind, storage_path, admin_only, caption, created_at")
        .in("diary_entry_id", entryIds)
        .order("created_at", { ascending: true });
    }

    if (mediaResult.error && /caption|column|schema cache/i.test(mediaResult.error.message || "")) {
      mediaResult = await supabaseClient
        .from("diary_media")
        .select("id, diary_entry_id, kind, storage_path, admin_only, created_at")
        .in("diary_entry_id", entryIds)
        .order("created_at", { ascending: true });
    }

    if (mediaResult.error) {
      authMessage = mediaResult.error.message;
    } else {
      media = mediaResult.data || [];
    }

    let commentsResult = await supabaseClient
      .from("diary_comments")
      .select("id, diary_entry_id, user_id, body, created_at")
      .in("diary_entry_id", entryIds)
      .order("created_at", { ascending: true });

    if (commentsResult.error && /diary_comments|schema cache|does not exist|relation/i.test(commentsResult.error.message || "")) {
      commentsResult = { data: [], error: null };
    }

    if (commentsResult.error) {
      authMessage = commentsResult.error.message;
    } else {
      comments = commentsResult.data || [];
    }
  }

  remoteDiaryMedia = await Promise.all(
    media.map(async (item) => {
      const bucket = item.kind === "audio" ? "diary-audio" : "diary-photos";
      const { data, error } = await supabaseClient.storage.from(bucket).createSignedUrl(item.storage_path, 60 * 60);
      return { ...item, url: data?.signedUrl || "", loadError: error?.message || "" };
    })
  );

  remoteDiaryEntries = entries || [];
  remoteDiaryComments = comments;
}

async function loadRemoteGps() {
  if (!isCloudMode() || !remoteTrip) return;

  const { data, error } = await supabaseClient
    .from("gps_points")
    .select("id, user_id, lat, lon, accuracy_m, source, recorded_at")
    .eq("trip_id", remoteTrip.id)
    .order("recorded_at", { ascending: true })
    .limit(1200);

  if (error) {
    authMessage = error.message;
    remoteGpsPoints = [];
    return;
  }

  remoteGpsPoints = data || [];
}

async function refreshSharedGpsTrack() {
  if (!isCloudMode() || !authUser || !remoteTrip) return;
  await loadRemoteGps();
  const track = getSavedTrack();
  if (!track.length) return;
  const last = track[track.length - 1];
  drawLivePosition(last, track);
  renderTotalRouteHighlights();
  loadLiveWeather(true);
}

function startSharedGpsRefresh() {
  if (gpsRefreshTimer) clearInterval(gpsRefreshTimer);
  gpsRefreshTimer = setInterval(refreshSharedGpsTrack, 300000);
}

function stopSharedGpsRefresh() {
  if (!gpsRefreshTimer) return;
  clearInterval(gpsRefreshTimer);
  gpsRefreshTimer = null;
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

function closeMainMenu() {
  const menu = document.getElementById("mainMenu");
  const button = document.querySelector(".menu-toggle");
  if (menu) menu.classList.remove("open");
  if (button) button.setAttribute("aria-expanded", "false");
}

function toggleMainMenu() {
  const menu = document.getElementById("mainMenu");
  const button = document.querySelector(".menu-toggle");
  if (!menu) return;
  const isOpen = menu.classList.toggle("open");
  if (button) button.setAttribute("aria-expanded", String(isOpen));
}

document.addEventListener("click", (event) => {
  if (!event.target.closest(".app-header")) closeMainMenu();
});

function showTab(id) {
  closeMainMenu();
  if (isCloudMode() && !authUser) {
    id = "map";
  }
  if (id === "admin" && getActualRole() !== "admin") {
    showTab("map");
    return;
  }
  if (id === "weather" && !canSeeWeatherTab()) {
    showTab("days");
    return;
  }
  document.querySelectorAll(".tab").forEach((tab) => tab.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  if (id === "total") {
    initTotalRoute();
    renderTotalRouteHighlights();
  }
  if (id === "days") {
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "auto" });
    });
  }
  if (id === "map") initDashboardRoute();
  if (id === "weather") {
    renderWeatherPanel();
    loadLiveWeather();
  }
  if (id === "diary") renderDiaryPanel();
}

function canControlRoute() {
  const role = getCurrentRole();
  return role === "admin" || role === "leader";
}

function canSeeAdminFiles() {
  const role = getCurrentRole();
  return role === "admin" || role === "leader";
}

function canCreateDiaryEntry() {
  const role = getCurrentRole();
  return role === "admin" || role === "leader" || role === "traveler";
}

function canAddDiaryMedia() {
  const role = getCurrentRole();
  return role === "admin" || role === "leader" || role === "traveler";
}

function canEditDiary() {
  return canAddDiaryMedia();
}

function canMarkVisited() {
  const role = getCurrentRole();
  return role === "admin" || role === "leader" || role === "traveler";
}

function canUpdateGps() {
  const role = getCurrentRole();
  return role === "admin" || role === "leader" || role === "traveler";
}

function canSeeWeatherTab() {
  return canUpdateGps();
}

function canSeePracticalDayInfo() {
  return getCurrentRole() !== "follower";
}

function canSeeDiaryHistoryInStage() {
  return getCurrentRole() === "follower";
}

function canEditLottePassport() {
  const user = getCurrentUser();
  const name = (user?.name || "").trim().toLowerCase();
  const email = (authUser?.email || "").trim().toLowerCase();
  const role = getActualRole();
  return (
    role === "admin" ||
    role === "traveler" ||
    user?.id === "lotte" ||
    name.includes("lotte") ||
    email.includes("lotte")
  );
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

function getStageDate(index) {
  const date = new Date(TRIP_START_DATE);
  date.setDate(date.getDate() + index);
  return date;
}

function getStageDateLabel(index) {
  const dateLabel = getStageDate(index).toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return `Dag ${index + 1} ${dateLabel}`;
}

function getStageDateBadge(index) {
  const date = getStageDate(index);
  return {
    top: `Dag ${index + 1}`,
    bottom: date.toLocaleDateString("nl-NL", { day: "numeric", month: "short" }),
  };
}

function toggleDriving(mapsUrl = "") {
  const shouldStart = !driving;
  driving = shouldStart;
  localStorage.setItem("reisapp_driving", String(driving));
  render();

  if (shouldStart) {
    setGpsStatus("Etappe gestart. Eerste GPS-punt wordt opgehaald.");
    startLocationTracking();
  } else {
    stopLocationTracking();
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

function getDayRouteUrl(index) {
  const url = new URL(window.location.href);
  url.search = "";
  url.searchParams.set("day", String(index + 1));
  url.hash = "selectedDayRoute";
  return url.toString();
}

function openStage(index) {
  activeStage = index;
  localStorage.setItem("reisapp_active_stage", String(index));
  resetTotalRoute();
  showTab("days");
  render();
}

function isLocalPoiVisited(stageIndex, poiIndex) {
  return localStorage.getItem(poiKey(stageIndex, poiIndex)) === "true";
}

function isPoiVisited(stageIndex, poiIndex) {
  if (isCloudMode() && remoteTrip && remoteVisitedPoisLoaded) {
    return remoteVisitedPois.some(
      (item) => item.stage_index === stageIndex && item.poi_index === poiIndex
    );
  }
  return isLocalPoiVisited(stageIndex, poiIndex);
}

async function toggleVisited(stageIndex, poiIndex) {
  if (!canMarkVisited()) return;
  const key = poiKey(stageIndex, poiIndex);
  const current = isPoiVisited(stageIndex, poiIndex);
  localStorage.setItem(key, String(!current));

  if (isCloudMode() && remoteTrip && authUser) {
    if (current) {
      const { error } = await supabaseClient
        .from("visited_pois")
        .delete()
        .eq("trip_id", remoteTrip.id)
        .eq("stage_index", stageIndex)
        .eq("poi_index", poiIndex)
        .eq("user_id", authUser.id);
      if (error) authMessage = error.message;
    } else {
      const { error } = await supabaseClient.from("visited_pois").upsert(
        {
          trip_id: remoteTrip.id,
          stage_index: stageIndex,
          poi_index: poiIndex,
          user_id: authUser.id,
          visited_at: new Date().toISOString(),
        },
        { onConflict: "trip_id,stage_index,poi_index,user_id" }
      );
      if (error) authMessage = error.message;
    }
    await loadRemoteVisitedPois();
  }

  render();
}

function getStageDiaryKey(index) {
  return `reisapp_stage_diary_${index}`;
}

function getStageDiary(index) {
  if (isCloudMode() && remoteTrip) {
    return remoteDiaryEntries
      .filter((entry) => entry.stage_index === index)
      .map((entry) => {
        const media = remoteDiaryMedia.filter((item) => item.diary_entry_id === entry.id);
        const photoMedia = media.filter((item) => item.kind === "photo");
        const comments = remoteDiaryComments
          .filter((comment) => comment.diary_entry_id === entry.id)
          .map((comment) => ({
            id: comment.id,
            body: comment.body || "",
            author: getMemberName(comment.user_id),
            userId: comment.user_id,
            created: new Date(comment.created_at).toLocaleString("nl-NL", {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            }),
          }));
        const photos = photoMedia
          .map((item) =>
            item.url
              ? {
                  src: item.url,
                  caption: item.caption || "",
                  takenAt: item.taken_at || item.created_at || "",
                  projection:
                    item.projection === "equirectangular" || /-360\.[a-z0-9]+$/i.test(item.storage_path || "")
                      ? "equirectangular"
                      : "flat",
                }
              : null
          )
          .filter(Boolean);
        return {
          id: entry.id,
          created: new Date(entry.created_at).toLocaleString("nl-NL", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          }),
          author: getMemberName(entry.user_id),
          note: entry.note || "",
          transcript: entry.transcript || "",
          photos,
          comments,
          photoIssueCount: photoMedia.length - photos.length,
          audioData: media.find((item) => item.kind === "audio")?.url || "",
          userId: entry.user_id,
        };
      });
  }

  return JSON.parse(localStorage.getItem(getStageDiaryKey(index)) || "[]");
}

function normalizeDiaryPhoto(photo) {
  if (typeof photo === "string") {
    return { src: photo, caption: "", takenAt: "", projection: "flat", file: null, width: 0, height: 0 };
  }
  return {
    src: photo?.src || photo?.url || "",
    caption: photo?.caption || "",
    takenAt: photo?.takenAt || photo?.taken_at || "",
    projection: photo?.projection === "equirectangular" ? "equirectangular" : "flat",
    file: photo?.file || null,
    width: Number(photo?.width || 0),
    height: Number(photo?.height || 0),
  };
}

function isPanoramaPhoto(photo) {
  return normalizeDiaryPhoto(photo).projection === "equirectangular";
}

function getDiaryPhotoSrc(photo) {
  return normalizeDiaryPhoto(photo).src;
}

function getDiaryPhotoCaption(photo) {
  return normalizeDiaryPhoto(photo).caption;
}

function getDiaryPhotoTakenAt(photo) {
  return normalizeDiaryPhoto(photo).takenAt;
}

function getDiaryPhotoItems(entry) {
  return (entry.photos || []).map(normalizeDiaryPhoto).filter((photo) => photo.src);
}

function getDiaryCommentKey(stageIndex, entryId) {
  return `${stageIndex}:${entryId}`;
}

function getDiaryComments(entry) {
  return entry.comments || [];
}

function saveStageDiary(index, entries) {
  localStorage.setItem(getStageDiaryKey(index), JSON.stringify(entries));
}

function resetDiaryDraft(index = activeStage) {
  diaryDraft.photos.forEach((photo) => {
    const src = normalizeDiaryPhoto(photo).src;
    if (src.startsWith("blob:")) URL.revokeObjectURL(src);
  });
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
    saving: false,
    status: "",
  };
}

function openDiaryComposer(index) {
  if (!canEditDiary()) return;
  resetDiaryDraft(index);
  renderStages();
  renderDashboardOnly();
}

function closeDiaryComposer() {
  if (diaryDraft.recording) stopDiaryRecording();
  diaryDraft.open = false;
  renderStages();
  renderDashboardOnly();
}

function setDiaryMode(mode) {
  diaryDraft.mode = mode;
  renderStages();
  renderDashboardOnly();
}

function openDiaryPhotoInput(mode) {
  diaryDraft.mode = mode;
  const inputId =
    mode === "camera"
      ? "diaryCameraInput"
      : mode === "panorama"
        ? "diaryPanoramaInput"
        : "diaryPhotosInput";
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
    photos: (entry.photos || []).map(normalizeDiaryPhoto),
    comments: entry.comments || [],
    audioData: entry.audioData || "",
    transcript: entry.transcript || "",
  });
  saveStageDiary(index, entries);
}

function updateDiaryCommentDraft(key, value) {
  diaryCommentDrafts[key] = value;
}

async function saveDiaryComment(stageIndex, entryId) {
  if (!authUser && isCloudMode()) {
    authMessage = "Log in om te reageren.";
    renderStages();
    renderDiaryPanel();
    renderDashboardOnly();
    return;
  }

  const key = getDiaryCommentKey(stageIndex, entryId);
  const body = (diaryCommentDrafts[key] || "").trim();
  if (!body) return;

  if (isCloudMode() && remoteTrip && authUser) {
    const { error } = await supabaseClient.from("diary_comments").insert({
      diary_entry_id: entryId,
      user_id: authUser.id,
      body,
    });

    if (error) {
      authMessage = /diary_comments|schema cache|does not exist|relation/i.test(error.message || "")
        ? "Reacties zijn nog niet actief in Supabase. Draai eerst de diary_comments migratie."
        : error.message;
      renderStages();
      renderDiaryPanel();
      renderDashboardOnly();
      return;
    }

    diaryCommentDrafts[key] = "";
    await loadRemoteDiary();
    renderStages();
    renderDiaryPanel();
    renderDashboardOnly();
    return;
  }

  const entries = getStageDiary(stageIndex).map((entry) => {
    if (String(entry.id) !== String(entryId)) return entry;
    const comments = getDiaryComments(entry);
    return {
      ...entry,
      comments: comments.concat({
        id: Date.now(),
        body,
        author: getCurrentUser()?.name || "Reiziger",
        created: new Date().toLocaleString("nl-NL", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }),
      }),
    };
  });
  diaryCommentDrafts[key] = "";
  saveStageDiary(stageIndex, entries);
  renderStages();
  renderDiaryPanel();
  renderDashboardOnly();
}

async function updateDiaryEntry(stageIndex, entryId, value) {
  if (isCloudMode() && remoteTrip) {
    const { error } = await supabaseClient
      .from("diary_entries")
      .update({ note: value, updated_at: new Date().toISOString() })
      .eq("id", entryId);
    if (error) authMessage = error.message;
    await loadRemoteDiary();
  renderStages();
    renderDiaryPanel();
    renderDashboardOnly();
    return;
  }

  const entries = getStageDiary(stageIndex).map((entry) =>
    entry.id === entryId ? { ...entry, note: value } : entry
  );
  saveStageDiary(stageIndex, entries);
  renderDiaryPanel();
}

function loadDiaryImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Deze afbeelding kan niet worden gelezen."));
    image.src = src;
  });
}

function canvasToJpegBlob(canvas, quality = 0.88) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("De 360-foto kon niet worden verkleind."))),
      "image/jpeg",
      quality
    );
  });
}

async function prepareDiaryPhoto(file, projection = "flat") {
  if (!file.type.startsWith("image/")) throw new Error(`${file.name} is geen afbeelding.`);
  if (file.size > 45 * 1024 * 1024) throw new Error(`${file.name} is groter dan 45 MB.`);

  let previewUrl = URL.createObjectURL(file);
  let uploadFile = file;
  let image;

  try {
    image = await loadDiaryImage(previewUrl);
    const ratio = image.naturalWidth / Math.max(1, image.naturalHeight);
    const isFullSphere = ratio >= 1.9 && ratio <= 2.1;

    if (
      projection === "equirectangular" &&
      isFullSphere &&
      (image.naturalWidth > 4096 || file.size > 6 * 1024 * 1024)
    ) {
      const width = Math.min(4096, image.naturalWidth);
      const height = Math.round(width / 2);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Deze telefoon kan de 360-foto niet verkleinen.");
      context.drawImage(image, 0, 0, width, height);
      const optimizedBlob = await canvasToJpegBlob(canvas);
      const baseName = file.name.replace(/\.[^.]+$/, "") || "panorama";
      uploadFile = new File([optimizedBlob], `${baseName}-360.jpg`, {
        type: "image/jpeg",
        lastModified: file.lastModified || Date.now(),
      });
      URL.revokeObjectURL(previewUrl);
      previewUrl = URL.createObjectURL(uploadFile);
      image = await loadDiaryImage(previewUrl);
    }

    return {
      src: previewUrl,
      file: uploadFile,
      caption: "",
      takenAt: file.lastModified ? new Date(file.lastModified).toISOString() : new Date().toISOString(),
      projection,
      width: image.naturalWidth,
      height: image.naturalHeight,
    };
  } catch (error) {
    URL.revokeObjectURL(previewUrl);
    throw error;
  }
}

async function handleDiaryPhotos(input, projection = "flat") {
  const files = Array.from(input.files || []);
  if (!files.length) return;

  diaryDraft.status = projection === "equirectangular" ? "360-foto wordt voorbereid..." : "Foto wordt voorbereid...";
  renderStages();
  renderDashboardOnly();

  try {
    const photos = await Promise.all(files.map((file) => prepareDiaryPhoto(file, projection)));
    diaryDraft.photos = diaryDraft.photos.concat(photos);
    const label = projection === "equirectangular" ? "360-foto" : "foto";
    diaryDraft.status = `${photos.length} ${label}${photos.length === 1 ? "" : "'s"} klaar om toe te voegen.`;
  } catch (error) {
    diaryDraft.status = `Foto toevoegen lukte niet: ${error.message}`;
  } finally {
    input.value = "";
    renderStages();
    renderDashboardOnly();
  }
}

function updateDiaryPhotoCaption(index, value) {
  diaryDraft.photos = diaryDraft.photos.map((photo, photoIndex) =>
    photoIndex === index ? { ...normalizeDiaryPhoto(photo), caption: value } : photo
  );
}

function toggleDiaryPhotoProjection(index) {
  diaryDraft.photos = diaryDraft.photos.map((photo, photoIndex) => {
    if (photoIndex !== index) return photo;
    const item = normalizeDiaryPhoto(photo);
    return {
      ...item,
      projection: item.projection === "equirectangular" ? "flat" : "equirectangular",
    };
  });
  diaryDraft.status = isPanoramaPhoto(diaryDraft.photos[index])
    ? "Foto wordt als interactieve 360-foto opgeslagen."
    : "Foto wordt als gewone foto opgeslagen.";
  renderStages();
  renderDashboardOnly();
}

function openPanoramaFromButton(button) {
  openPanorama(button.dataset.panoramaSrc || "", button.dataset.panoramaCaption || "");
}

function openPanorama(src, caption = "") {
  const dialog = document.getElementById("panoramaDialog");
  const container = document.getElementById("panoramaViewer");
  const title = document.getElementById("panoramaTitle");
  if (!dialog || !container || !src) return;

  if (!window.pannellum) {
    authMessage = "De 360-viewer kon niet worden geladen. Open de app opnieuw met internetverbinding.";
    renderDiaryPanel();
    return;
  }

  if (panoramaViewer?.destroy) panoramaViewer.destroy();
  container.innerHTML = "";
  if (title) title.textContent = caption || "360-foto";
  if (typeof dialog.showModal === "function") {
    dialog.showModal();
  } else {
    dialog.setAttribute("open", "");
  }

  panoramaViewer = window.pannellum.viewer(container, {
    type: "equirectangular",
    panorama: src,
    autoLoad: true,
    showControls: true,
    showFullscreenCtrl: true,
    orientationOnByDefault: false,
    title: caption || undefined,
  });
}

function closePanorama() {
  const dialog = document.getElementById("panoramaDialog");
  if (panoramaViewer?.destroy) panoramaViewer.destroy();
  panoramaViewer = null;
  const container = document.getElementById("panoramaViewer");
  if (container) container.innerHTML = "";
  if (dialog?.open && typeof dialog.close === "function") dialog.close();
  else dialog?.removeAttribute("open");
}

function closePanoramaFromBackdrop(event) {
  if (event.target === event.currentTarget) closePanorama();
}

function removeDiaryPhoto(index) {
  const src = normalizeDiaryPhoto(diaryDraft.photos[index]).src;
  if (src.startsWith("blob:")) URL.revokeObjectURL(src);
  diaryDraft.photos = diaryDraft.photos.filter((_, photoIndex) => photoIndex !== index);
  diaryDraft.status = diaryDraft.photos.length ? "Foto verwijderd uit dit concept." : "";
  renderStages();
  renderDashboardOnly();
}

function dataUrlToBlob(dataUrl) {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/data:(.*?);base64/)?.[1] || "application/octet-stream";
  const bytes = atob(base64 || "");
  const array = new Uint8Array(bytes.length);
  for (let index = 0; index < bytes.length; index++) array[index] = bytes.charCodeAt(index);
  return new Blob([array], { type: mime });
}

function getFileExtensionFromDataUrl(dataUrl, fallback = "bin") {
  const mime = dataUrl.match(/data:(.*?);base64/)?.[1] || "";
  const extension = mime.split("/")[1]?.split(";")[0] || fallback;
  if (extension === "jpeg") return "jpg";
  if (extension === "webm") return "webm";
  return extension.replace(/[^a-z0-9]/gi, "") || fallback;
}

function getFileExtensionFromName(name, fallback = "bin") {
  const extension = String(name || "").split(".").pop();
  if (!extension || extension === name) return fallback;
  return extension.replace(/[^a-z0-9]/gi, "").toLowerCase() || fallback;
}

async function uploadDiaryFiles(stageIndex, items, kind) {
  const bucket = kind === "audio" ? "diary-audio" : "diary-photos";
  const rows = [];
  const group = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  for (let index = 0; index < items.length; index++) {
    const item = normalizeDiaryPhoto(items[index]);
    const dataUrl = kind === "photo" ? item.src : items[index];
    const caption = kind === "photo" ? item.caption.trim() : "";
    const takenAt = kind === "photo" && item.takenAt ? new Date(item.takenAt).toISOString() : "";
    const projection = kind === "photo" ? item.projection : "flat";
    const fallbackExtension = kind === "audio" ? "webm" : "jpg";
    const blob = kind === "photo" && item.file ? item.file : dataUrlToBlob(dataUrl);
    const extension =
      kind === "photo" && item.file
        ? getFileExtensionFromName(item.file.name, fallbackExtension)
        : getFileExtensionFromDataUrl(dataUrl, fallbackExtension);
    const panoramaSuffix = projection === "equirectangular" ? "-360" : "";
    const path = `${remoteTrip.id}/${stageIndex}/draft-${group}/${kind}-${index}${panoramaSuffix}.${extension}`;
    const { error: uploadError } = await supabaseClient.storage.from(bucket).upload(path, blob, {
      contentType: blob.type || "application/octet-stream",
      upsert: false,
    });
    if (uploadError) throw uploadError;

    rows.push({
      kind,
      storage_path: path,
      admin_only: kind === "audio",
      ...(caption ? { caption } : {}),
      ...(takenAt ? { taken_at: takenAt } : {}),
      ...(kind === "photo" ? { projection } : {}),
    });
  }

  return rows;
}

async function attachDiaryMedia(entryId, rows) {
  if (!rows.length) return;

  let payload = rows.map((row) => ({ ...row, diary_entry_id: entryId }));
  let result = await supabaseClient.from("diary_media").insert(payload);
  let missingProjection = false;

  if (result.error && /projection|schema cache/i.test(result.error.message || "")) {
    missingProjection = true;
    payload = payload.map(({ projection, ...row }) => row);
    result = await supabaseClient.from("diary_media").insert(payload);
  }

  if (result.error && /caption|taken_at|column|schema cache/i.test(result.error.message || "")) {
    payload = payload.map(({ caption, taken_at, ...row }) => row);
    result = await supabaseClient.from("diary_media").insert(payload);
    if (!result.error) {
      authMessage = "Foto opgeslagen. Fototekst wordt centraal bewaard nadat de fotomigraties zijn uitgevoerd.";
    }
  }

  if (result.error) throw result.error;
  if (missingProjection) {
    authMessage = "360-foto opgeslagen. Voer de 360-fotomigratie uit om de projectie ook in de database vast te leggen.";
  }
}

async function saveDiaryDraft() {
  if (diaryDraft.saving) return;
  const note = diaryDraft.note.trim();
  const transcript = diaryDraft.transcript.trim();
  const hasContent = note || transcript || diaryDraft.photos.length || diaryDraft.audioData;

  if (!hasContent) return;

  if (isCloudMode() && remoteTrip && authUser) {
    diaryDraft.saving = true;
    diaryDraft.status = diaryDraft.photos.length ? "Foto wordt geupload..." : "Dagboeknotitie wordt opgeslagen...";
    authMessage = "Dagboeknotitie wordt opgeslagen...";
  renderStages();

    let mediaRows = [];
    try {
      mediaRows = mediaRows.concat(await uploadDiaryFiles(diaryDraft.stageIndex, diaryDraft.photos, "photo"));
      if (diaryDraft.audioData) {
        mediaRows = mediaRows.concat(await uploadDiaryFiles(diaryDraft.stageIndex, [diaryDraft.audioData], "audio"));
      }
    } catch (mediaError) {
      diaryDraft.saving = false;
      diaryDraft.status = `Foto uploaden lukte niet: ${mediaError.message}. De foto staat nog in dit concept.`;
      authMessage = diaryDraft.status;
      renderStages();
      renderDiaryPanel();
      renderDashboardOnly();
      return;
    }

    diaryDraft.status = "Dagboekregel wordt opgeslagen...";
    renderStages();

    const { data: entry, error } = await supabaseClient
      .from("diary_entries")
      .insert({
        trip_id: remoteTrip.id,
        stage_index: diaryDraft.stageIndex,
        user_id: authUser.id,
        note,
        transcript,
      })
      .select("*")
      .single();

    if (error) {
      diaryDraft.saving = false;
      diaryDraft.status = `Dagboek opslaan lukte niet: ${error.message}. Probeer opnieuw.`;
      authMessage = diaryDraft.status;
      renderStages();
      renderDiaryPanel();
      return;
    }

    try {
      await attachDiaryMedia(entry.id, mediaRows);
      authMessage = "Dagboeknotitie opgeslagen voor het reisarchief.";
    } catch (mediaError) {
      diaryDraft.saving = false;
      diaryDraft.status = `Foto is geupload, maar koppelen aan het dagboek lukte niet: ${mediaError.message}.`;
      authMessage = diaryDraft.status;
      await loadRemoteDiary();
      renderStages();
      renderDiaryPanel();
      renderDashboardOnly();
      return;
    }

    await loadRemoteDiary();
    resetDiaryDraft(diaryDraft.stageIndex);
  renderStages();
    renderDiaryPanel();
    renderDashboardOnly();
    return;
  }

  const localPhotos = await Promise.all(
    diaryDraft.photos.map(async (photo) => {
      const item = normalizeDiaryPhoto(photo);
      return {
        ...item,
        src: item.file ? await blobToDataUrl(item.file) : item.src,
        file: null,
      };
    })
  );

  addDiaryEntry(diaryDraft.stageIndex, {
    note,
    photos: localPhotos,
    audioData: diaryDraft.audioData,
    transcript,
  });
  resetDiaryDraft(diaryDraft.stageIndex);
  renderStages();
  renderDiaryPanel();
  renderDashboardOnly();
}

function renderDashboardOnly() {
  const summary = document.getElementById("summary");
  if (!summary || !document.getElementById("map")?.classList.contains("active")) return;
  resetDashboardRoute();
  summary.innerHTML = renderDashboard();
  setTimeout(initDashboardRoute, 0);
}

function getTravelArchiveData() {
  return {
    title: TRIP_TITLE,
    exportedAt: new Date().toISOString(),
    trip: remoteTrip
      ? {
          id: remoteTrip.id,
          slug: remoteTrip.slug,
          title: remoteTrip.title,
        }
      : null,
    stages: STAGES.map((stage, index) => ({
      day: stage.day,
      title: stage.title,
      from: stage.from,
      to: stage.to,
      route: stage.route,
      diary: getStageDiary(index).map((entry) => ({
        created: entry.created,
        author: entry.author || "",
        note: entry.note || "",
        transcript: entry.transcript || "",
        photos: entry.photos || [],
        comments: getDiaryComments(entry).map((comment) => ({
          created: comment.created || "",
          author: comment.author || "",
          body: comment.body || "",
        })),
        audio: canSeeAdminFiles() ? entry.audioData || "" : "",
      })),
    })),
  };
}

function downloadTextFile(filename, content, type = "application/json") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function exportTravelArchive() {
  if (isCloudMode() && remoteTrip) await loadRemoteDiary();
  const archive = getTravelArchiveData();
  const stamp = new Date().toISOString().slice(0, 10);
  downloadTextFile(`rondreis-noorwegen-2026-archief-${stamp}.json`, JSON.stringify(archive, null, 2));
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
        ${
          canAddDiaryMedia()
            ? `<button class="linkbtn ${diaryDraft.mode === "camera" ? "primary" : ""}" onclick="openDiaryPhotoInput('camera')">Foto maken</button>
               <button class="linkbtn ${diaryDraft.mode === "photos" ? "primary" : ""}" onclick="openDiaryPhotoInput('photos')">Foto's kiezen</button>
               <button class="linkbtn panorama-select ${diaryDraft.mode === "panorama" ? "primary" : ""}" onclick="openDiaryPhotoInput('panorama')">360°-foto kiezen</button>`
            : ""
        }
        <button class="linkbtn ${diaryDraft.mode === "text" ? "primary" : ""}" onclick="setDiaryMode('text')">Tekst</button>
        ${canAddDiaryMedia() ? `<button class="linkbtn ${diaryDraft.mode === "voice" ? "primary" : ""}" onclick="setDiaryMode('voice')">Microfoon</button>` : ""}
      </div>

      <input id="diaryCameraInput" class="diary-hidden-input" type="file" accept="image/*" capture="environment" onchange="handleDiaryPhotos(this)">
      <input id="diaryPhotosInput" class="diary-hidden-input" type="file" accept="image/*" multiple onchange="handleDiaryPhotos(this)">
      <input id="diaryPanoramaInput" class="diary-hidden-input" type="file" accept="image/jpeg,image/png,image/webp" onchange="handleDiaryPhotos(this, 'equirectangular')">

      ${
        diaryDraft.mode === "text" || diaryDraft.mode === "voice"
          ? `<textarea class="diary-compose-text" oninput="updateDiaryDraftNote(this.value)" placeholder="Wat willen we later terugvinden? Typ, of gebruik de microfoon op je toetsenbord.">${escapeHtml(diaryDraft.note)}</textarea>`
          : ""
      }

      ${
        diaryDraft.photos.length
          ? `<div class="diary-photo-grid">
              ${diaryDraft.photos
                .map(
                  (photo, index) => {
                    const photoItem = normalizeDiaryPhoto(photo);
                    const panorama = isPanoramaPhoto(photoItem);
                    return `
                    <div class="diary-photo-draft ${panorama ? "panorama" : ""}">
                      <div class="diary-photo-preview">
                        <img src="${photoItem.src}" alt="${panorama ? "Voorbeeld van 360-foto" : "Dagboekfoto"}">
                        ${panorama ? `
                          <span class="panorama-badge">360°</span>
                          <button
                            class="panorama-preview-open"
                            type="button"
                            data-panorama-src="${escapeHtml(photoItem.src)}"
                            data-panorama-caption="${escapeHtml(photoItem.caption)}"
                            onclick="openPanoramaFromButton(this)"
                          >360° bekijken</button>
                        ` : ""}
                      </div>
                      <textarea class="diary-photo-caption" oninput="updateDiaryPhotoCaption(${index}, this.value)" placeholder="Tekstje bij deze foto (optioneel). Typ, of gebruik de microfoon op je toetsenbord.">${escapeHtml(photoItem.caption)}</textarea>
                      <button class="linkbtn" onclick="toggleDiaryPhotoProjection(${index})">
                        ${panorama ? "Opslaan als gewone foto" : "Markeer als 360°-foto"}
                      </button>
                      <button class="linkbtn stopbtn" onclick="removeDiaryPhoto(${index})">Verwijderen</button>
                    </div>
                  `;
                  }
                )
                .join("")}
            </div>`
          : ""
      }

      ${
        canAddDiaryMedia() && diaryDraft.mode === "voice"
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

      ${diaryDraft.status ? `<p class="diary-save-status">${diaryDraft.status}</p>` : ""}

      <div class="diary-compose-actions">
        <button class="linkbtn mapsbtn" onclick="saveDiaryDraft()" ${diaryDraft.saving ? "disabled" : ""}>
          ${diaryDraft.saving ? "Bezig..." : "Toevoegen"}
        </button>
        <button class="linkbtn" onclick="closeDiaryComposer()">Sluiten</button>
      </div>
    </div>
  `;
}

function renderAdminPanel() {
  const members = getMembers();
  if (!document.getElementById("adminPanel")) return;
  const joinedMembers = members.filter((member) => member.joined || member.id === currentUserId);
  const inviteMembers = members.filter((member) => !member.joined && member.id !== currentUserId);
  const visibleMembers =
    adminMemberView === "joined" ? joinedMembers :
    adminMemberView === "invites" ? inviteMembers :
    members;
  const memberViewButtons = [
    ["all", `Alle (${members.length})`],
    ["joined", `Ingelogd (${joinedMembers.length})`],
    ["invites", `Uitnodigingen (${inviteMembers.length})`],
  ];

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

      <div class="archive-actions">
        <button class="linkbtn mapsbtn" onclick="exportTravelArchive()">Reisarchief downloaden</button>
        <button class="linkbtn stopbtn" onclick="clearLocalTestData()">Lokale testdata wissen</button>
        <p class="muted">Bundelt alle centrale dagboeknotities, teksten, foto's en admin-audio tot een exportbestand voor het fotoboek.</p>
        <p class="muted">Lokale testdata wissen raakt alleen dit apparaat. Centrale reisdata wis je bewust via het Supabase reset-script.</p>
      </div>

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

      <div class="member-view-tabs" aria-label="Ledenfilter">
        ${memberViewButtons
          .map(
            ([key, label]) => `
              <button class="view-mode-btn ${adminMemberView === key ? "active" : ""}" onclick="setAdminMemberView('${key}')">
                ${label}
              </button>
            `
          )
          .join("")}
      </div>

      <div class="member-list">
        ${authMessage ? `<p class="admin-message">${authMessage}</p>` : ""}
        ${
          visibleMembers.length
            ? visibleMembers
                .map(
                  (member) => `
              <div class="member-row">
                <input value="${member.name}" onchange="updateMemberName('${member.id}', this.value)">
                <select onchange="updateMemberRole('${member.id}', this.value)">
                  ${Object.entries(ROLES)
                    .map(([key, label]) => `<option value="${key}" ${member.role === key ? "selected" : ""}>${label}</option>`)
                    .join("")}
                </select>
                <span class="member-current">${member.id === currentUserId ? "Actief" : member.joined ? "Ingelogd" : member.email || "Uitnodiging"}</span>
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
                .join("")
            : `<p class="muted">Geen leden in deze weergave.</p>`
        }
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
  const weatherButton = document.getElementById("weatherNavButton");
  if (adminButton) {
    adminButton.style.display = getActualRole() === "admin" && (!isCloudMode() || authUser) ? "inline-flex" : "none";
  }
  if (weatherButton) {
    weatherButton.style.display = canSeeWeatherTab() && (!isCloudMode() || authUser) ? "inline-flex" : "none";
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
      if (isPoiVisited(stageIndex, poiIndex)) count++;
    });
  });
  return count;
}

function getTotalPoiCount() {
  return STAGES.reduce((total, stage) => total + stage.pois.length, 0);
}

function getMustSeeCount() {
  return STAGES.reduce((total, stage) => total + stage.pois.filter((poi) => poi[1] >= 5).length, 0);
}

function getMustSeenCount() {
  let count = 0;
  STAGES.forEach((stage, stageIndex) => {
    stage.pois.forEach((poi, poiIndex) => {
      if (poi[1] >= 5 && isPoiVisited(stageIndex, poiIndex)) count++;
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


const TOTAL_ROUTE_HIGHLIGHTS = [
  { stage: 0, point: 1, name: "Drents-Friese Wold", type: "Natuur", score: 3, note: "Rustige bos- en heidepauze rond Bovensmilde/Appelscha voordat de lange rit echt begint.", search: "Nationaal Park Drents-Friese Wold" },
  { stage: 0, point: 2, name: "Hamburg Speicherstadt", type: "Stad", score: 3, note: "UNESCO-pakhuizen en havengevoel; alleen doen als Hamburg toch pauze wordt.", search: "Speicherstadt Hamburg" },
  { stage: 0, point: 3, name: "Jelling monumenten", type: "UNESCO", score: 4, note: "Vikingstenen en grafheuvels; een van de bekendste historische stops van Denemarken.", search: "Jelling Monuments Denmark" },
  { stage: 0, point: 4, name: "Nyborg bij de Grote Belt", type: "Uitzicht", score: 3, note: "Goede plek om de Grote Beltbrug niet alleen vanuit de auto te zien.", search: "Nyborg Great Belt Bridge viewpoint" },
  { stage: 0, point: 5, name: "Dragør oude haven", type: "Kustplaats", score: 3, note: "Historisch havenstadje bij Kopenhagen, handig vlak voor of na de Oresundbrug.", search: "Dragor old town Denmark" },
  { stage: 0, point: 6, name: "Lund kathedraal", type: "Cultuur", score: 3, note: "Historische stad vlak bij Malmö; betere stop dan eindeloos tankstationhangen.", search: "Lund Cathedral Sweden" },
  { stage: 1, point: 1, name: "Göteborg archipel", type: "Kust", score: 3, note: "Mooie kustsfeer bij Göteborg; vooral interessant als jullie daar tijd over hebben.", search: "Gothenburg archipelago viewpoint" },
  { stage: 1, point: 1, name: "Bohus vesting", type: "Historie", score: 3, note: "Kasteelruïne noord van Göteborg, logisch langs de route richting Noorwegen.", search: "Bohus Fortress Sweden" },
  { stage: 1, point: 2, name: "Oslo Operahuis", type: "Stad", score: 3, note: "Korte stadsstop met uitzicht vanaf het dak, mits Oslo niet te druk voelt.", search: "Oslo Opera House" },
  { stage: 1, point: 2, name: "Holmenkollen", type: "Uitzicht", score: 3, note: "Bekende skispringschans en uitzicht over Oslo; kleine omweg, groot herkenningspunt.", search: "Holmenkollen Oslo" },
  { stage: 1, point: 3, name: "Spiralen Drammen", type: "Uitzicht", score: 3, note: "Tunnelspiraal naar uitzichtpunt boven Drammen; past goed als korte pauze.", search: "Spiralen Drammen viewpoint" },
  { stage: 1, point: 4, name: "Torpo staafkerk", type: "Cultuur", score: 3, note: "Oudere staafkerk langs Hallingdal, minder druk dan de grote namen.", search: "Torpo Stave Church Norway" },
  { stage: 2, point: 2, name: "Sysendammen", type: "Route", score: 3, note: "Stuwdam op Hardangervidda, goed als extra hoogvlakte-stop.", search: "Sysendammen Hardangervidda" },
  { stage: 2, point: 3, name: "Vøringsfossen Fossli", type: "Waterval", score: 5, note: "Extra uitzichtpunt bij Vøringsfossen; deze wil je meestal niet missen.", search: "Voringfossen Fossli viewpoint" },
  { stage: 2, point: 4, name: "Kjeåsen bergboerderij", type: "Uitzicht", score: 4, note: "Spectaculair boven Eidfjord, maar check weg/tunnelregeling en voertuiggeschiktheid.", search: "Kjeåsen mountain farm Eidfjord" },
  { stage: 3, point: 1, name: "Hardangerfjord uitzichtpunten", type: "Fjord", score: 4, note: "Meerdere korte stops rond de Hardangerbrug en fjordarmen.", search: "Hardangerfjord viewpoint near Hardanger Bridge" },
  { stage: 3, point: 2, name: "Steinsdalsfossen", type: "Waterval", score: 4, note: "Bekende waterval waar je achterlangs kunt lopen; mooie Hardanger-omweg.", search: "Steinsdalsfossen Norway" },
  { stage: 3, point: 3, name: "Tvindefossen", type: "Waterval", score: 4, note: "Makkelijk bereikbare waterval bij Voss, sterk als korte stop.", search: "Tvindefossen Voss Norway" },
  { stage: 3, point: 4, name: "Gudvangen", type: "Fjorddorp", score: 4, note: "Dorp aan de Nærøyfjord; toeristisch, maar landschappelijk erg sterk.", search: "Gudvangen Norway" },
  { stage: 3, point: 4, name: "Nærøyfjord", type: "UNESCO fjord", score: 5, note: "Een van de beroemdste fjorden van Noorwegen; vooral interessant per boot of uitzichtpunt.", search: "Nærøyfjord Norway" },
  { stage: 3, point: 4, name: "Flåmsbana", type: "Trein", score: 4, note: "Bekende bergspoorlijn vanuit Flåm; alleen doen als jullie bewust tijd reserveren.", search: "Flåmsbana Flåm Railway" },
  { stage: 4, point: 1, name: "Aurlandsfjellet snow road", type: "Scenic route", score: 5, note: "Officiële scenic route boven de Laerdaltunnel; check opening en weer.", search: "Aurlandsfjellet scenic route Norway" },
  { stage: 4, point: 2, name: "Vindhellavegen", type: "Wandeling", score: 4, note: "Historische weg/wandeling bij Borgund, mooi te combineren met de staafkerk.", search: "Vindhellavegen Borgund" },
  { stage: 4, point: 3, name: "Bøyabreen gletsjer", type: "Gletsjer", score: 4, note: "Toegankelijke gletsjerarm onderweg richting Olden/Loen.", search: "Bøyabreen glacier Norway" },
  { stage: 4, point: 4, name: "Briksdalsbreen", type: "Gletsjer", score: 5, note: "Een van de bekendste gletsjerstops bij Olden; kost wel tijd.", search: "Briksdalsbreen Olden" },
  { stage: 4, point: 5, name: "Loen Skylift", type: "Uitzicht", score: 5, note: "Groot uitzicht boven Loen; alleen bij redelijk zicht echt de moeite waard.", search: "Loen Skylift Norway" },
  { stage: 4, point: 5, name: "Lovatnet", type: "Meer", score: 5, note: "Fotogeniek meer bij Loen, sterk voor rustige avond of ochtend.", search: "Lovatnet Loen Norway" },
  { stage: 5, point: 2, name: "Gamle Strynefjellsvegen", type: "Scenic route", score: 5, note: "Historische bergweg; check seizoen/opening en voertuigkeuze.", search: "Gamle Strynefjellsvegen Norway" },
  { stage: 5, point: 3, name: "Djupvatnet", type: "Bergmeer", score: 4, note: "Bergmeer richting Dalsnibba, vaak ruig en fotogeniek.", search: "Djupvatnet Norway" },
  { stage: 5, point: 5, name: "Seven Sisters waterval", type: "Waterval", score: 5, note: "Klassieker in de Geirangerfjord; meestal vanaf boot of fjordzicht goed te zien.", search: "Seven Sisters Waterfall Geiranger" },
  { stage: 5, point: 5, name: "Geiranger-Hellesylt ferry", type: "Fjordtocht", score: 5, note: "Autoferry die tegelijk sightseeing is; sterk als route en beleving samenvallen.", search: "Geiranger Hellesylt ferry" },
  { stage: 6, point: 2, name: "Gudbrandsjuvet", type: "Kloof", score: 4, note: "Korte stop met goed platform boven wild water.", search: "Gudbrandsjuvet viewpoint" },
  { stage: 6, point: 3, name: "Trollstigen visitor centre", type: "Uitzicht", score: 5, note: "Hoofdplek voor zicht op de haarspeldbochten, mits de weg open is.", search: "Trollstigen visitor centre" },
  { stage: 6, point: 4, name: "Rampestreken", type: "Wandeling", score: 4, note: "Uitzichtpunt boven Åndalsnes; stevige wandeling, dus alleen met tijd/energie.", search: "Rampestreken Åndalsnes" },
  { stage: 6, point: 4, name: "Romsdalseggen", type: "Wandeling", score: 5, note: "Topwandeling bij goed weer, maar geen snelle stop.", search: "Romsdalseggen hike" },
  { stage: 7, point: 1, name: "Varden Molde panorama", type: "Uitzicht", score: 4, note: "Uitzicht over Molde en de bergketen; korte omweg als het helder is.", search: "Varden Molde panorama" },
  { stage: 7, point: 2, name: "Ergan Coastal Fort Bud", type: "Historie", score: 3, note: "Kustfort/museum bij Bud, passend bij de Atlantische kustroute.", search: "Ergan Coastal Fort Bud Norway" },
  { stage: 7, point: 3, name: "Eldhusøya viewpoint", type: "Uitzicht", score: 5, note: "Wandelpad en uitzichtpunt op de Atlantische Weg; beter dan alleen doorrijden.", search: "Eldhusøya Atlantic Road" },
  { stage: 7, point: 4, name: "Kvernes staafkerk", type: "Cultuur", score: 3, note: "Historische kerk op Averøy, mooi als extra stop rond de Atlantische Weg.", search: "Kvernes Stave Church" },
  { stage: 8, point: 2, name: "Dovrefjell musk ox area", type: "Natuur", score: 4, note: "Bekend gebied voor muskusossen; alleen verantwoord met tijd en afstand houden.", search: "Dovrefjell musk ox viewpoint" },
  { stage: 8, point: 4, name: "Bakeriet i Lom", type: "Pauze", score: 3, note: "Bekende bakkerij in Lom, goede pauze rond de staafkerk.", search: "Bakeriet i Lom" },
  { stage: 8, point: 5, name: "Sognefjellet", type: "Scenic route", score: 5, note: "Hoogste bergpasroute van Noord-Europa; alleen als hij logisch in jullie dag past.", search: "Sognefjellet scenic route Norway" },
  { stage: 9, point: 0, name: "Gjende en Besseggen", type: "Meer/wandeling", score: 5, note: "Iconische Jotunheimen-plek; meer dagactiviteit dan snelle stop.", search: "Gjende Besseggen Jotunheimen" },
  { stage: 9, point: 1, name: "Valdresflye", type: "Scenic route", score: 5, note: "Open berglandschap tussen Jotunheimen en Valdres, erg sterk bij helder weer.", search: "Valdresflye scenic route" },
  { stage: 9, point: 6, name: "Karlstad centrum en Klarälven", type: "Stad", score: 2, note: "Logische Zweden-stop voor avondeten of korte wandeling aan de rivier.", search: "Karlstad Klarälven" },
  { stage: 10, point: 1, name: "Universeum Göteborg", type: "Kinderen", score: 3, note: "Goed indoor alternatief als weer of energie niet meewerkt.", search: "Universeum Gothenburg" },
  { stage: 10, point: 2, name: "Ribersborg Malmö", type: "Kust", score: 2, note: "Strand/kustpauze bij Malmö voor de lange terugrit.", search: "Ribersborg Malmö" },
  { stage: 10, point: 5, name: "Lüneburger Heide", type: "Natuur", score: 2, note: "Mogelijke rustige pauze tussen Hamburg en Nederland als de terugreis lang wordt.", search: "Lüneburger Heide viewpoint" },
];

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
  const imagery = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
    attribution: "Tiles &copy; Esri",
    maxZoom: 19,
  }).addTo(map);

  L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}", {
    attribution: "Roads &copy; Esri",
    maxZoom: 19,
    pane: "overlayPane",
  }).addTo(map);

  L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}", {
    attribution: "Labels &copy; Esri",
    maxZoom: 19,
    pane: "overlayPane",
  }).addTo(map);

  return imagery;
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

  refreshSharedGpsTrack();
  restoreDashboardTrack();
  updateDashboardFollowControl();
  setTimeout(() => dashboardRouteMap.invalidateSize(), 80);
}


function getRouteStageOffsets() {
  const offsets = [];
  let total = 0;
  ROUTE_STAGES.forEach((points) => {
    offsets.push(total);
    total += points.length;
  });
  return offsets;
}

function getRouteProgressIndex() {
  const track = getSavedTrack();
  const last = track[track.length - 1];
  if (!last) return -1;
  const routePoints = ROUTE_STAGES.flat();
  let nearestIndex = -1;
  let nearestDistance = Infinity;
  routePoints.forEach((point, index) => {
    const distance = distanceKm([last.lat, last.lon], point);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  });
  return nearestDistance <= 80 ? nearestIndex : -1;
}

function getHighlightRouteIndex(highlight) {
  const offsets = getRouteStageOffsets();
  return (offsets[highlight.stage] || 0) + Math.max(0, highlight.point || 0);
}

function getRemainingRouteHighlights() {
  const progressIndex = getRouteProgressIndex();
  if (progressIndex < 0) return TOTAL_ROUTE_HIGHLIGHTS;
  return TOTAL_ROUTE_HIGHLIGHTS.filter((highlight) => getHighlightRouteIndex(highlight) >= progressIndex - 1);
}

function getHighlightMapsUrl(highlight) {
  return `https://www.google.com/maps/search/${encodeURIComponent(highlight.search || highlight.name)}`;
}

function renderTotalRouteHighlights() {
  const container = document.getElementById("totalRouteHighlights");
  if (!container) return;
  const remaining = getRemainingRouteHighlights();
  const progressKnown = getRouteProgressIndex() >= 0;
  const countText = progressKnown
    ? `${remaining.length} tips nog voor jullie routepositie.`
    : `${remaining.length} tips langs de totale route. Start GPS om bezochte punten automatisch te verbergen.`;
  container.innerHTML = `
    <div class="total-highlights-head">
      <div>
        <p class="eyebrow">Nog te bekijken</p>
        <h3>Bezienswaardigheden langs de totaalroute</h3>
        <p class="muted">${countText}</p>
      </div>
      <a class="linkbtn" target="_blank" href="${getTotalMapUrl()}">Route in Google Maps</a>
    </div>
    <div class="total-highlight-list">
      ${remaining.map((highlight) => `
        <article class="total-highlight score-${highlight.score}">
          <div>
            <span>${highlight.type}</span>
            <h4>${highlight.name}</h4>
            <p>${highlight.note}</p>
          </div>
          <a class="linkbtn mapsbtn" target="_blank" href="${getHighlightMapsUrl(highlight)}">Google Pin</a>
        </article>`).join("")}
    </div>`;
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
    refreshSharedGpsTrack();
    restoreLiveTrack();
  }

  setTimeout(() => totalRouteMap.invalidateSize(), 80);
  centerTotalRoute();
  renderTotalRouteHighlights();
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
  if (isCloudMode() && remoteTrip && remoteGpsPoints.length) {
    return remoteGpsPoints.map((point) => ({
      lat: point.lat,
      lon: point.lon,
      accuracy: point.accuracy_m || 0,
      time: new Date(point.recorded_at).getTime(),
      userId: point.user_id,
    }));
  }

  return JSON.parse(localStorage.getItem("reisapp_live_track") || "[]");
}

async function saveTrackPoint(point) {
  const localTrack = JSON.parse(localStorage.getItem("reisapp_live_track") || "[]");
  localTrack.push(point);
  localStorage.setItem("reisapp_live_track", JSON.stringify(localTrack.slice(-1200)));

  if (!isCloudMode() || !remoteTrip || !authUser || !canUpdateGps()) return { shared: false };

  const row = {
    trip_id: remoteTrip.id,
    user_id: authUser.id,
    lat: point.lat,
    lon: point.lon,
    accuracy_m: point.accuracy,
    source: "browser",
    recorded_at: new Date(point.time).toISOString(),
  };

  const { data, error } = await supabaseClient
    .from("gps_points")
    .insert(row)
    .select("id, user_id, lat, lon, accuracy_m, source, recorded_at")
    .single();

  if (error) return { shared: false, error };
  remoteGpsPoints = [...remoteGpsPoints, data].slice(-1200);
  loadLiveWeather(true);
  return { shared: true };
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
      async (position) => {
        await saveBrowserPosition(position);
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

async function saveBrowserPosition(position) {
  const point = {
    lat: position.coords.latitude,
    lon: position.coords.longitude,
    accuracy: Math.round(position.coords.accuracy || 0),
    time: Date.now(),
  };

  const saved = await saveTrackPoint(point);
  setDashboardFollowLive(true);
  drawLivePosition(point);
  if (totalRouteMap) totalRouteMap.panTo([point.lat, point.lon], { animate: true });
  setGpsStatus(
    saved.shared
      ? `GPS-punt gedeeld. Nauwkeurigheid ongeveer ${point.accuracy} meter.`
      : `GPS-punt gezet op dit apparaat. Nauwkeurigheid ongeveer ${point.accuracy} meter.`
  );
}

function stopLocationWatch() {
  if (locationWatchId === null || !navigator.geolocation) return;
  navigator.geolocation.clearWatch(locationWatchId);
  locationWatchId = null;
}

function stopLocationTracking() {
  if (locationTimer) clearInterval(locationTimer);
  locationTimer = null;
  stopLocationWatch();
}

function startLocationTracking() {
  updateLivePosition();
  if (locationTimer) clearInterval(locationTimer);
  locationTimer = setInterval(updateLivePosition, 300000);
  stopLocationWatch();
  if (navigator.geolocation && window.isSecureContext) {
    locationWatchId = navigator.geolocation.watchPosition(
      saveBrowserPosition,
      () => {},
      {
        enableHighAccuracy: true,
        maximumAge: 60000,
        timeout: 30000,
      }
    );
  }
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

function renderDiaryPhotoVisual(photo, alt) {
  const item = normalizeDiaryPhoto(photo);
  if (!isPanoramaPhoto(item)) {
    return `<img src="${escapeHtml(item.src)}" alt="${escapeHtml(alt)}">`;
  }

  return `
    <button
      class="panorama-photo-open"
      type="button"
      data-panorama-src="${escapeHtml(item.src)}"
      data-panorama-caption="${escapeHtml(item.caption)}"
      onclick="openPanoramaFromButton(this)"
      aria-label="Open 360-foto"
    >
      <img src="${escapeHtml(item.src)}" alt="${escapeHtml(alt)}">
      <span class="panorama-badge">360°</span>
      <span class="panorama-open-label">Open 360°</span>
    </button>
  `;
}


function getAllDiaryPhotos() {
  return STAGES.flatMap((stage, stageIndex) =>
    getStageDiary(stageIndex).flatMap((entry) =>
      getDiaryPhotoItems(entry).map((photo) => ({
        photo: photo.src,
        projection: photo.projection,
        stageIndex,
        stageTitle: stage.title,
        created: entry.created,
        takenAt: getDiaryPhotoTakenAt(photo) || "",
        author: entry.author || "Reiziger",
        note: photo.caption || entry.note || entry.transcript || "",
      }))
    )
  ).sort((left, right) => {
    const leftTime = Date.parse(left.takenAt || left.created || "") || 0;
    const rightTime = Date.parse(right.takenAt || right.created || "") || 0;
    return rightTime - leftTime;
  });
}

function getDiaryPhotoIssueCount() {
  return STAGES.reduce(
    (total, _, stageIndex) =>
      total +
      getStageDiary(stageIndex).filter(
        (entry) =>
          Number(entry.photoIssueCount || 0) > 0 ||
          (!(entry.note || "").trim() &&
            !(entry.transcript || "").trim() &&
            !(entry.photos || []).length)
      ).length,
    0
  );
}

function renderTravelPhotoGallery() {
  const photos = getAllDiaryPhotos();
  const issueCount = getDiaryPhotoIssueCount();
  return `
    <section class="card travel-photo-panel">
      <div class="diary-head">
        <div>
          <p class="eyebrow">Reisfoto's</p>
          <h2>Foto's van onderweg</h2>
        </div>
        <button class="linkbtn" onclick="showTab('diary')">Open dagboek</button>
      </div>
      ${
        photos.length
          ? `<div class="travel-photo-grid">
              ${photos
                .map(
                  (item) => `
                    <figure class="travel-photo-item">
                      ${renderDiaryPhotoVisual(
                        {
                          src: item.photo,
                          caption: item.note,
                          projection: item.projection,
                        },
                        `Reisfoto van ${item.stageTitle}`
                      )}
                      <figcaption>
                        <b>${item.stageTitle}</b>
                        <span>${item.created}${item.author ? ` - ${item.author}` : ""}</span>
                        ${item.note ? `<small>${escapeHtml(item.note)}</small>` : ""}
                      </figcaption>
                    </figure>
                  `
                )
                .join("")}
            </div>`
          : `<p class="muted">${
              issueCount
                ? `${issueCount} herinnering${issueCount === 1 ? "" : "en"} gevonden, maar daar hangt nog geen laadbare foto aan. Controleer Supabase Storage of upload de foto opnieuw.`
                : "Nog geen reisfoto's opgeslagen. Zodra reizigers foto's toevoegen aan het dagboek, verschijnen ze hier voor iedereen die mee mag kijken."
            }</p>`
      }
    </section>
  `;
}

function renderDiaryEntryContent(entry, stageIndex, allowEdit = false) {
  const photoItems = getDiaryPhotoItems(entry);
  const comments = getDiaryComments(entry);
  const commentKey = getDiaryCommentKey(stageIndex, entry.id);
  const canComment = !isCloudMode() || Boolean(authUser);
  return `
    <div class="diary-entry">
      <span>${entry.created}${entry.author ? ` - ${entry.author}` : ""}</span>
      ${
        allowEdit
          ? `<textarea onchange="updateDiaryEntry(${stageIndex}, ${entry.id}, this.value)" placeholder="Wat willen we onthouden van deze dag?">${entry.note}</textarea>`
          : entry.note
            ? `<p class="diary-note-readonly">${entry.note}</p>`
            : ""
      }
      ${entry.transcript ? `<p class="diary-transcript">${entry.transcript}</p>` : ""}
      ${
        photoItems.length
          ? `<div class="diary-photo-grid saved">
              ${photoItems
                .map((photo) => `
                  <figure class="diary-photo-saved">
                    ${renderDiaryPhotoVisual(photo, isPanoramaPhoto(photo) ? "360-dagboekfoto" : "Dagboekfoto")}
                    ${photo.caption ? `<figcaption>${escapeHtml(photo.caption)}</figcaption>` : ""}
                  </figure>
                `)
                .join("")}
            </div>`
          : ""
      }
      ${
        entry.photoIssueCount
          ? `<p class="diary-media-warning">${entry.photoIssueCount} foto${entry.photoIssueCount === 1 ? "" : "'s"} gekoppeld, maar de fotolink kan niet worden geladen. Controleer Supabase Storage-rechten.</p>`
          : ""
      }
      ${
        !(entry.note || "").trim() &&
        !(entry.transcript || "").trim() &&
        !photoItems.length &&
        !entry.photoIssueCount
          ? `<p class="diary-media-warning">Deze herinnering heeft nog geen tekst of laadbare foto. Waarschijnlijk is de foto-upload onderweg mislukt.</p>`
          : ""
      }
      ${entry.audioData && canSeeAdminFiles() ? `<audio class="diary-audio" controls src="${entry.audioData}"></audio>` : ""}
      <div class="diary-comments">
        ${comments.length ? `
          <div class="diary-comment-list">
            ${comments
              .map((comment) => `
                <article class="diary-comment">
                  <span>${escapeHtml(comment.created || "")}${comment.author ? ` - ${escapeHtml(comment.author)}` : ""}</span>
                  <p>${escapeHtml(comment.body || "")}</p>
                </article>
              `)
              .join("")}
          </div>
        ` : `<p class="muted diary-comment-empty">Nog geen reacties.</p>`}
        ${
          canComment
            ? `<div class="diary-comment-form">
                <textarea oninput="updateDiaryCommentDraft(${JSON.stringify(commentKey)}, this.value)" placeholder="Reageer op deze herinnering... Typ, of gebruik de microfoon op je toetsenbord.">${escapeHtml(diaryCommentDrafts[commentKey] || "")}</textarea>
                <button class="linkbtn" onclick="saveDiaryComment(${stageIndex}, ${JSON.stringify(String(entry.id))})">Reactie plaatsen</button>
              </div>`
            : `<p class="muted diary-comment-empty">Log in om te reageren.</p>`
        }
      </div>
    </div>
  `;
}

function renderDiaryPanel() {
  const panel = document.getElementById("diaryPanel");
  if (!panel) return;

  const totalEntries = STAGES.reduce((total, _, index) => total + getStageDiary(index).length, 0);

  panel.innerHTML = `
    <section class="card trip-diary-panel">
      <div class="diary-head">
        <div>
          <p class="eyebrow">Reisdagboek</p>
          <h2>Dagboek per dag</h2>
        </div>
        <button class="linkbtn" onclick="showTab('days')">Naar dagroutes</button>
      </div>
      ${
        totalEntries
          ? `<div class="trip-diary-days">
              ${STAGES.map((stage, index) => {
                const entries = getStageDiary(index);
                const dateBadge = getStageDateBadge(index);
                return `
                  <section class="trip-diary-day">
                    <div class="trip-diary-day-head">
                      <span class="day-badge">${dateBadge.top}<br>${dateBadge.bottom}</span>
                      <div>
                        <h3>${stage.title}</h3>
                        <p class="muted">${getStageDateLabel(index)} - ${entries.length ? `${entries.length} ${entries.length === 1 ? "herinnering" : "herinneringen"}` : "Nog niets toegevoegd"}</p>
                      </div>
                    </div>
                    ${
                      entries.length
                        ? entries.map((entry) => renderDiaryEntryContent(entry, index, canEditDiary())).join("")
                        : `<p class="muted">Nog geen dagboek voor deze dag.</p>`
                    }
                  </section>
                `;
              }).join("")}
            </div>`
          : `<p class="muted">Nog geen dagboeknotities toegevoegd.</p>`
      }
    </section>
  `;
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
        <span class="dashicon">Gezien</span>
        <span class="dashnum">${getVisitedCount()}</span>
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
            (item, index) => {
              const dateBadge = getStageDateBadge(index);
              return `
                <button class="stage-row ${getStageStatus(index)} ${index === activeStage ? "selected" : ""}" onclick="openStage(${index})">
                  <span class="day-badge">${dateBadge.top}<br>${dateBadge.bottom}</span>
                  <span class="stage-row-main">
                    <b>${item.title}</b>
                    <small>${item.goal}</small>
                  </span>
                  <span class="stage-row-meta">${item.km}<br>${item.time}</span>
                </button>
              `;
            }
          ).join("")}
        </div>
      </div>

      <div class="card selected-stage-panel">
        <p class="eyebrow">Vandaag geselecteerd</p>
        <div class="selected-stage-head">
          <span class="day-badge large">${getStageDateBadge(activeStage).top}<br>${getStageDateBadge(activeStage).bottom}</span>
          <div>
            <h2>${stage.title}</h2>
            <p class="muted">${getStageDateLabel(activeStage)} - ${stage.goal}</p>
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
          ${
            canEditDiary()
              ? `<button class="linkbtn diary-add" onclick="openDiaryComposer(${activeStage})">Dagboeknotitie toevoegen</button>`
              : ""
          }
        </div>

        ${renderDiaryComposer(activeStage)}

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

    ${renderTravelPhotoGallery()}
  `;
}

function setFuelType(type) {
  fuelType = FUEL_TYPES[type] ? type : "diesel";
  localStorage.setItem("reisapp_fuel_type", fuelType);
  fuelLookupState = {
    stageIndex: activeStage,
    loading: false,
    message: "",
    stations: [],
    targetLabel: "",
  };
  renderStages();
}

function getFuelSearchUrl(stop) {
  const target = stop.lat && stop.lng ? `${stop.lat},${stop.lng}` : stop.search || stop.label;
  const terms = ["cheap", fuelType === "diesel" ? "diesel" : "petrol", "station", "near", target].join(" ");
  return `https://www.google.com/maps/search/${encodeURIComponent(terms)}`;
}

function getCurrentPositionForNearby(label = "huidige locatie") {
  if (!navigator.geolocation || !window.isSecureContext) return Promise.resolve(null);

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          label,
          search: label,
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6)),
          note: "Gebruikt omdat je nu op deze knop drukte.",
        }),
      () => resolve(null),
      {
        enableHighAccuracy: true,
        maximumAge: 120000,
        timeout: 12000,
      }
    );
  });
}

function getGrocerySearchUrl(stop) {
  const target = stop.lat && stop.lng ? `${stop.lat},${stop.lng}` : stop.search || stop.label;
  const terms = ["supermarket", "grocery", "near", target].join(" ");
  return `https://www.google.com/maps/search/${encodeURIComponent(terms)}`;
}

function getFuelPriceClass(station, index, stations) {
  if (!station.price || stations.length < 2) return "";
  if (index === 0) return "cheap";
  if (index === stations.length - 1) return "expensive";
  return "normal";
}

function getFuelAdvice(stage) {
  const routeText = `${stage.from} ${stage.to} ${stage.route.join(" ")}`.toLowerCase();
  const routeKm = Number(String(stage.km).match(/\d+/)?.[0] || 0);
  const tankStop = stage.route[1] || stage.from;
  const crossesGermanyDenmarkSweden =
    /germany|duitsland|hamburg/.test(routeText) &&
    /denmark|denemarken|kolding|great belt|grote belt|oresund|øresund/.test(routeText) &&
    /sweden|zweden|malmo|gothenburg|goteborg/.test(routeText);
  const fromSwedenToDenmarkGermany =
    /sweden|zweden|malmo|gothenburg|goteborg|karlstad/.test(routeText) &&
    /denmark|denemarken|great belt|grote belt|oresund|øresund/.test(routeText) &&
    /germany|duitsland|hamburg/.test(routeText);
  const isNorway = /norway|noorwegen|fjord|bergen|trondheim|lofoten|geiranger|alesund|bodo|oslo|geilo|haugastol|eidfjord|aurland|olden|loen|andalsnes/.test(routeText);

  if (crossesGermanyDenmarkSweden) {
    return {
      title: "Volgooien in Duitsland, Denemarken overslaan",
      body: "Deze etappe is lang en loopt via Duitsland, Denemarken en Zweden. Tank aan de Duitse kant vlak voor Denemarken nog vol, rij Denemarken bij voorkeur door met zo min mogelijk tanken, en vul daarna in Zweden weer bij. Denemarken is vaak duurder; check vlak voor vertrek nog even de actuele prijzen.",
      search: "Flensburg, Germany",
      priceStops: [
        {
          label: "A7 Flensburg / Duitse grenszone",
          country: "Duitsland",
          search: "A7 Flensburg Germany petrol station",
          lat: 54.7937,
          lng: 9.4469,
          note: "Hoofdstop: Duitse kant vlak voor Denemarken volgooien.",
        },
        {
          label: "Malmo-regio",
          country: "Zweden",
          search: "Malmo, Sweden",
          lat: 55.605,
          lng: 13.0038,
          note: "Bijvullen na Denemarken als de dag nog lang is.",
        },
      ],
    };
  }

  if (fromSwedenToDenmarkGermany) {
    return {
      title: "Eerst Zweden, Denemarken minimaal, daarna Duitsland",
      body: "Vul in Zweden voldoende bij voor de Deense doortocht. Tank in Denemarken alleen als het moet en plan de volgende volle tank in Duitsland. Zo voorkom je dat de duurste kilometers je tankstrategie bepalen.",
      search: "Malmo, Sweden",
      priceStops: [
        {
          label: "Malmo-regio",
          country: "Zweden",
          search: "Malmo, Sweden",
          lat: 55.605,
          lng: 13.0038,
          note: "Vul hier voldoende bij voor Denemarken.",
        },
        {
          label: "A7 Flensburg / Duitse grenszone",
          country: "Duitsland",
          search: "A7 Flensburg Germany petrol station",
          lat: 54.7937,
          lng: 9.4469,
          note: "Na Denemarken weer in Duitsland tanken.",
        },
      ],
    };
  }

  if (isNorway) {
    return {
      title: "Houd minimaal halfvol aan",
      body: `Tank bij vertrek of rond ${tankStop}. In Noorwegen liever niet op reserve rijden; buiten grotere plaatsen zitten tankstations verder uit elkaar.`,
      search: tankStop,
      priceStops: [
        {
          label: tankStop,
          country: "Noorwegen",
          search: tankStop,
          note: "Prijs is minder belangrijk dan marge: liever halfvol blijven.",
        },
      ],
    };
  }

  if (routeKm >= 280) {
    return {
      title: "Plan een tankmoment halverwege",
      body: `Deze etappe is lang genoeg om tanken apart te plannen. Zoek rond ${tankStop} en voorkom dat tanken je eindstop bepaalt.`,
      search: tankStop,
      priceStops: [
        {
          label: tankStop,
          search: tankStop,
          note: "Logisch tankpunt halverwege de etappe.",
        },
      ],
    };
  }

  return {
    title: "Tanken alleen als het logisch ligt",
    body: `Deze etappe is korter. Vertrek met voldoende marge en tank alleen rond ${tankStop} als het goed op de route ligt.`,
    search: tankStop,
    priceStops: [
      {
        label: tankStop,
        search: tankStop,
        note: "Alleen gebruiken als het handig op de route ligt.",
      },
    ],
  };
}

const WEATHER_CODE_LABELS = {
  0: "Helder",
  1: "Licht bewolkt",
  2: "Half bewolkt",
  3: "Bewolkt",
  45: "Mist",
  48: "Rijpmist",
  51: "Lichte motregen",
  53: "Motregen",
  55: "Stevige motregen",
  56: "IJzelmotregen",
  57: "Stevige ijzelmotregen",
  61: "Lichte regen",
  63: "Regen",
  65: "Stevige regen",
  66: "IJzel",
  67: "Stevige ijzel",
  71: "Lichte sneeuw",
  73: "Sneeuw",
  75: "Stevige sneeuw",
  77: "Sneeuwkorrels",
  80: "Lichte buien",
  81: "Buien",
  82: "Zware buien",
  85: "Lichte sneeuwbuien",
  86: "Sneeuwbuien",
  95: "Onweer",
  96: "Onweer met hagel",
  99: "Zwaar onweer met hagel",
};

function getWeatherLabel(code) {
  return WEATHER_CODE_LABELS[code] || "Onbekend weerbeeld";
}

function formatWeatherValue(value, suffix) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
  return `${Math.round(Number(value))}${suffix}`;
}

function getLatestSharedWeatherPosition() {
  if (!remoteGpsPoints.length) return null;

  const latest = remoteGpsPoints.reduce((best, point) => {
    if (!best) return point;
    return new Date(point.recorded_at).getTime() > new Date(best.recorded_at).getTime() ? point : best;
  }, null);

  const lat = Number(latest?.lat);
  const lon = Number(latest?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  return {
    lat,
    lon,
    label: "laatst gedeelde GPS-locatie",
  };
}

function getStageWeatherFallbackPosition() {
  const points = ROUTE_STAGES[activeStage] || [];
  const last = points[points.length - 1];
  if (!last) return null;

  return {
    lat: last[0],
    lon: last[1],
    label: `eindpunt ${STAGES[activeStage].to}`,
  };
}

function getBrowserWeatherPosition() {
  if (!navigator.geolocation || !window.isSecureContext) return Promise.resolve(null);

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          lat: Number(position.coords.latitude.toFixed(6)),
          lon: Number(position.coords.longitude.toFixed(6)),
          label: "huidige browserlocatie",
        }),
      () => resolve(null),
      {
        enableHighAccuracy: true,
        maximumAge: 300000,
        timeout: 10000,
      }
    );
  });
}

async function resolveWeatherPosition() {
  return getLatestSharedWeatherPosition() || (await getBrowserWeatherPosition()) || getStageWeatherFallbackPosition();
}

function getWeatherForecastRows() {
  const hourly = weatherState.data?.hourly;
  if (!hourly?.time?.length) return [];

  const now = Date.now();
  return hourly.time
    .map((time, index) => ({
      time,
      index,
      timestamp: new Date(time).getTime(),
    }))
    .filter((item) => item.timestamp >= now - 60 * 60 * 1000)
    .slice(0, 4)
    .map(({ time, index }) => ({
      time: new Date(time).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" }),
      temp: formatWeatherValue(hourly.temperature_2m?.[index], " graden"),
      rain: hourly.precipitation_probability?.[index] ?? "-",
      wind: formatWeatherValue(hourly.wind_speed_10m?.[index], " km/u"),
      label: getWeatherLabel(hourly.weather_code?.[index]),
    }));
}

async function loadLiveWeather(force = false) {
  if (weatherState.loading) return;

  const updatedAt = weatherState.updatedAt ? new Date(weatherState.updatedAt).getTime() : 0;
  if (!force && updatedAt && Date.now() - updatedAt < 10 * 60 * 1000) return;

  weatherState = {
    ...weatherState,
    loading: true,
    requested: true,
    message: "Weer wordt opgehaald...",
  };
  renderDaysWeatherSummary();
  renderStages();

  try {
    const position = await resolveWeatherPosition();
    if (!position) throw new Error("Geen locatie beschikbaar voor weerbericht.");

    const params = new URLSearchParams({
      latitude: String(position.lat),
      longitude: String(position.lon),
      current: "temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m",
      hourly: "temperature_2m,precipitation_probability,weather_code,wind_speed_10m",
      forecast_days: "1",
      timezone: "auto",
    });
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
    if (!response.ok) throw new Error("Weerbericht ophalen mislukt.");

    weatherState = {
      loading: false,
      requested: true,
      message: "",
      data: await response.json(),
      position,
      updatedAt: new Date().toISOString(),
    };
    renderWeatherPanel();
    renderDaysWeatherSummary();
  } catch (error) {
    weatherState = {
      ...weatherState,
      loading: false,
      requested: true,
      message: error.message || "Weerbericht is nu niet beschikbaar.",
    };
    renderWeatherPanel();
    renderDaysWeatherSummary();
  }
  renderStages();
}

function renderLiveWeather() {

  if (!weatherState.requested && !weatherState.loading) {
    weatherState.requested = true;
    setTimeout(() => loadLiveWeather(), 0);
  }

  const current = weatherState.data?.current;
  const updated = weatherState.updatedAt
    ? new Date(weatherState.updatedAt).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })
    : "-";
  const where = weatherState.position?.label || "locatie nog bepalen";
  const weatherButton = canSeeWeatherTab()
    ? `<button class="linkbtn" onclick="showTab('weather')">Uitgebreid weer</button>`
    : "";

  if (!current) {
    return `
      <section class="weather-strip">
        <div>
          <p class="eyebrow">Live weer</p>
          <h3>${weatherState.message}</h3>
        </div>
        ${weatherButton}
      </section>
    `;
  }

  return `
    <section class="weather-strip">
      <div>
        <p class="eyebrow">Live weer</p>
        <h3>${formatWeatherValue(current.temperature_2m, " graden")} bij ${where}</h3>
        <p class="muted">${getWeatherLabel(current.weather_code)}. Bijgewerkt ${updated}.</p>
      </div>
      ${weatherButton}
    </section>
  `;
}

function renderDaysWeatherSummary() {
  const summary = document.getElementById("daysWeatherSummary");
  if (!summary) return;
  summary.innerHTML = renderLiveWeather();
}

function renderWeatherPanel() {
  const panel = document.getElementById("weatherPanel");
  if (!panel) return;

  if (!canSeeWeatherTab()) {
    panel.innerHTML = "";
    return;
  }

  const current = weatherState.data?.current;
  const rows = getWeatherForecastRows();
  const updated = weatherState.updatedAt
    ? new Date(weatherState.updatedAt).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })
    : "-";

  if (!current) {
    panel.innerHTML = `
      <div class="card weather-panel">
        <div class="weather-head">
          <div>
            <p class="eyebrow">Uitgebreid weer</p>
            <h2>Weerbericht</h2>
          </div>
          <button class="linkbtn" onclick="loadLiveWeather(true)">Ververs</button>
        </div>
        <p class="weather-message">${weatherState.message}</p>
      </div>
    `;
    return;
  }

  panel.innerHTML = `
    <div class="card weather-panel">
      <div class="weather-head">
        <div>
          <p class="eyebrow">Uitgebreid weer</p>
          <h2>${getWeatherLabel(current.weather_code)}</h2>
          <p class="muted">Gebaseerd op ${weatherState.position?.label || "locatie"}. Laatst bijgewerkt ${updated}.</p>
        </div>
        <button class="linkbtn" onclick="loadLiveWeather(true)">Ververs</button>
      </div>
      <div class="weather-current">
        <strong>${formatWeatherValue(current.temperature_2m, " graden")}</strong>
        <span>Voelt als ${formatWeatherValue(current.apparent_temperature, " graden")}</span>
        <span>Wind ${formatWeatherValue(current.wind_speed_10m, " km/u")}</span>
        <span>Regen nu ${formatWeatherValue(current.precipitation, " mm")}</span>
      </div>
      ${
        rows.length
          ? `<div class="weather-forecast">
              ${rows
                .map(
                  (row) => `
                    <div>
                      <b>${row.time}</b>
                      <span>${row.label}</span>
                      <small>${row.temp} / regen ${row.rain}% / wind ${row.wind}</small>
                    </div>
                  `
                )
                .join("")}
            </div>`
          : ""
      }
    </div>
  `;
}

function renderFuelPriceLookup(fuelAdvice) {
  const stops = fuelAdvice.priceStops || [{ label: fuelAdvice.search, search: fuelAdvice.search }];
  const state = fuelLookupState.stageIndex === activeStage ? fuelLookupState : { loading: false, message: "", stations: [], targetLabel: "" };
  const proxyEnabled = Boolean(getConfig().fuelPriceProxyUrl);

  return `
    <div class="fuel-control">
      <label>
        <span>Brandstof</span>
        <select onchange="setFuelType(this.value)">
          ${Object.entries(FUEL_TYPES)
            .map(([key, label]) => `<option value="${key}" ${fuelType === key ? "selected" : ""}>${label}</option>`)
            .join("")}
        </select>
      </label>
      <button class="linkbtn mapsbtn" onclick="loadCheapFuelStations(${activeStage})">
        ${state.loading ? "Locatie/prijzen laden..." : "Tankstations in de buurt"}
      </button>
    </div>

    <div class="fuel-stop-list">
      ${stops
        .map(
          (stop) => `
            <a class="textlink" target="_blank" href="${getFuelSearchUrl(stop)}">
              ${stop.label || stop.search}${stop.country ? ` (${stop.country})` : ""}
            </a>
            ${stop.note ? `<small class="muted">${stop.note}</small>` : ""}
          `
        )
        .join("")}
    </div>

    ${state.targetLabel ? `<p class="muted">Zoekgebied: ${state.targetLabel}</p>` : ""}
    ${!proxyEnabled ? `<p class="muted">Live prijs-kleuren zijn voorbereid. Zonder prijs-proxy opent de knop Google Maps rond je huidige locatie of de grenszone.</p>` : ""}
    ${state.message ? `<p class="fuel-message">${state.message}</p>` : ""}
    ${
      state.stations.length
        ? `<div class="fuel-results">
            ${state.stations
              .map(
                (station, index) => `
                  <a class="fuel-result ${getFuelPriceClass(station, index, state.stations)}" target="_blank" href="${station.mapsUrl || getFuelSearchUrl({ search: `${station.name} ${station.place || ""}` })}">
                    <b>${station.price ? `€${Number(station.price).toFixed(3)}` : "Prijs onbekend"} · ${station.name || station.brand || "Tankstation"}</b>
                    <span>${station.place || station.address || ""}${station.distanceKm ? ` · ${station.distanceKm} km` : ""}${station.isOpen === false ? " · gesloten" : ""}</span>
                  </a>
                `
              )
              .join("")}
          </div>
          <p class="muted">Bron: Tankerkonig / MTS-K. Alleen Duitse actuele prijzen.</p>`
        : ""
    }
  `;
}

async function loadCheapFuelStations(stageIndex) {
  const stage = STAGES[stageIndex];
  const fuelAdvice = getFuelAdvice(stage);
  const stops = fuelAdvice.priceStops || [{ label: fuelAdvice.search, search: fuelAdvice.search }];
  const proxyUrl = getConfig().fuelPriceProxyUrl;
  const plannedStop = stops[0] || { label: fuelAdvice.search, search: fuelAdvice.search };

  fuelLookupState = {
    stageIndex,
    loading: true,
    message: "Locatie wordt bepaald...",
    stations: [],
    targetLabel: "",
  };
  renderStages();

  const mapsWindow = !proxyUrl ? window.open("about:blank", "_blank") : null;
  if (mapsWindow) {
    mapsWindow.document.write("<p style=\"font-family:system-ui;padding:16px\">Locatie wordt bepaald...</p>");
  }

  const currentStop = await getCurrentPositionForNearby("huidige locatie");
  const targetStop = currentStop || plannedStop;
  const targetLabel = currentStop ? "huidige locatie" : `${plannedStop.label || plannedStop.search} (fallback)`;

  if (!proxyUrl) {
    const searchUrl = getFuelSearchUrl(targetStop);
    if (mapsWindow) {
      mapsWindow.location.href = searchUrl;
    } else {
      window.open(searchUrl, "_blank", "noopener");
    }
    fuelLookupState = {
      stageIndex,
      loading: false,
      message: currentStop
        ? "Ik heb Google Maps geopend rond je huidige locatie. Live groen/rood prijzen volgen zodra de prijs-proxy gekoppeld is."
        : "GPS lukte niet, dus ik heb Google Maps geopend rond de geplande tankzone.",
      stations: [],
      targetLabel,
    };
  renderStages();
    return;
  }

  try {
    const response = await fetch(proxyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fuelType, stops: [targetStop], plannedStops: stops }),
    });
    const data = await response.json();
    if (!response.ok || data.error) throw new Error(data.error || "Prijsdienst gaf geen bruikbaar antwoord.");
    const stations = (data.stations || [])
      .filter((station) => station.price)
      .sort((a, b) => Number(a.price) - Number(b.price))
      .slice(0, 6);

    fuelLookupState = {
      stageIndex,
      loading: false,
      message: stations.length ? `Live prijzen voor ${FUEL_TYPES[fuelType]} gevonden.` : "Geen actuele prijzen gevonden voor deze stop.",
      stations,
      targetLabel,
    };
  } catch (error) {
    window.open(getFuelSearchUrl(targetStop), "_blank", "noopener");
    fuelLookupState = {
      stageIndex,
      loading: false,
      message: `Live prijscheck lukte niet: ${error.message}. Ik heb daarom Google Maps rond het zoekgebied geopend.`,
      stations: [],
      targetLabel,
    };
  }
  renderStages();
}

function getGroceryAdvice(stage) {
  const groceryStop = stage.route[Math.max(0, stage.route.length - 2)] || stage.to;
  return {
    title: "Boodschappen voor aankomst",
    body: `Plan boodschappen rond ${groceryStop}, voordat je richting camping, fjordweg of kleinere plaats rijdt.`,
    search: groceryStop,
  };
}

function renderGroceryLookup(groceryAdvice) {
  const state = groceryLookupState.stageIndex === activeStage ? groceryLookupState : { loading: false, message: "", targetLabel: "" };

  return `
    <div class="nearby-control">
      <button class="linkbtn mapsbtn" onclick="openNearbyGroceryStores(${activeStage})">
        ${state.loading ? "Locatie laden..." : "Supermarkten in de buurt"}
      </button>
      <a class="textlink" target="_blank" href="${getGrocerySearchUrl({ search: groceryAdvice.search })}">
        Supermarkten bij geplande stop
      </a>
    </div>
    ${state.targetLabel ? `<p class="muted">Zoekgebied: ${state.targetLabel}</p>` : ""}
    ${state.message ? `<p class="nearby-message">${state.message}</p>` : ""}
  `;
}

async function openNearbyGroceryStores(stageIndex) {
  const stage = STAGES[stageIndex];
  const groceryAdvice = getGroceryAdvice(stage);
  const plannedStop = { label: groceryAdvice.search, search: groceryAdvice.search };

  groceryLookupState = {
    stageIndex,
    loading: true,
    message: "Locatie wordt bepaald...",
    targetLabel: "",
  };
  renderStages();

  const mapsWindow = window.open("about:blank", "_blank");
  if (mapsWindow) {
    mapsWindow.document.write("<p style=\"font-family:system-ui;padding:16px\">Locatie wordt bepaald...</p>");
  }

  const currentStop = await getCurrentPositionForNearby("huidige locatie");
  const targetStop = currentStop || plannedStop;
  const targetLabel = currentStop ? "huidige locatie" : `${plannedStop.label || plannedStop.search} (fallback)`;
  const searchUrl = getGrocerySearchUrl(targetStop);

  if (mapsWindow) {
    mapsWindow.location.href = searchUrl;
  } else {
    window.open(searchUrl, "_blank", "noopener");
  }

  groceryLookupState = {
    stageIndex,
    loading: false,
    message: currentStop
      ? "Ik heb Google Maps geopend met supermarkten rond je huidige locatie."
      : "GPS lukte niet, dus ik heb supermarkten rond de geplande boodschappenplek geopend.",
    targetLabel,
  };
  renderStages();
}

function renderDayRouteOverview() {
  return `
    <section class="day-routes-overview" aria-labelledby="dayRoutesTitle">
      <div class="section-head day-routes-head">
        <p class="eyebrow">Volledige reisplanning</p>
        <h2 id="dayRoutesTitle">Alle dagroutes</h2>
        <p class="muted">${STAGES.length} etappes van vertrek tot thuiskomst.</p>
      </div>
      <div class="day-route-list">
        ${STAGES.map((stage, index) => {
          const badge = getStageDateBadge(index);
          const routeText = stage.route.join(" -> ");

          return `
            <article class="day-route-summary ${index === activeStage ? "selected" : ""}">
              <span class="day-badge">${badge.top}<br>${badge.bottom}</span>
              <div class="day-route-summary-main">
                <h3>${stage.title}</h3>
                <p class="day-route-summary-meta">${stage.km} - ${stage.time}</p>
                <p class="day-route-points">${routeText}</p>
              </div>
              <div class="day-route-summary-actions">
                <a class="linkbtn ${index === activeStage ? "primary" : ""}" target="_blank" rel="noopener" href="${getDayRouteUrl(index)}">
                  Open dag
                </a>
                <a class="textlink" target="_blank" href="${stage.maps}">Google Maps</a>
              </div>
            </article>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function renderStages() {
  const stage = STAGES[activeStage];
  const diary = getStageDiary(activeStage);
  const showStageDiaryHistory = canSeeDiaryHistoryInStage();
  const fuelAdvice = getFuelAdvice(stage);
  const groceryAdvice = getGroceryAdvice(stage);
  const routeText = stage.route.join(" -> ");
  const navigationUrl = getGoogleNavigationUrl(stage);

  document.getElementById("stageList").innerHTML = `
    ${renderDayRouteOverview()}
    <div id="selectedDayRoute" class="card stage-detail">
      ${
        canControlRoute()
          ? `<button class="linkbtn stage-start-toggle ${driving ? "stopbtn" : "startbtn"}" onclick="toggleDriving('${navigationUrl}')">
              ${driving ? "Stop etappe" : "Start etappe"}
            </button>`
          : ""
      }

      <p class="eyebrow">${getStageDateLabel(activeStage)}</p>
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
            canEditDiary()
              ? `<p class="muted">Alle eerdere herinneringen staan gebundeld in het dagboek.</p>
                 <button class="linkbtn" onclick="showTab('diary')">Open dagboek</button>`
              : ""
          }
          ${
            showStageDiaryHistory && diary.length
              ? diary
                  .map(
                    (entry) => renderDiaryEntryContent(entry, activeStage, false)
                  )
                  .join("")
              : showStageDiaryHistory
                ? `<p class="muted">Nog geen dagboeknotities voor deze dag.</p>`
                : ""
          }
        </section>

        <section class="day-tool">
          <p class="eyebrow">Pins en stops</p>
          <h3>Hoogtepunten</h3>
          ${stage.pois
            .map((poi, poiIndex) => {
              const visited = isPoiVisited(activeStage, poiIndex);

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
                        ? `<button class="linkbtn visitbtn ${visited ? "done" : ""}" onclick="toggleVisited(${activeStage}, ${poiIndex})">
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

        ${
          canSeePracticalDayInfo()
            ? `
              <section class="day-tool">
                <p class="eyebrow">Overnachten</p>
                <h3>Geadviseerde campingpunten</h3>
                <p><b>Eerste keuze:</b> zoek rond ${stage.to}, zodat de dag netjes eindigt bij de etappebestemming.</p>
                <p><b>Backup:</b> zoek 30-60 minuten voor ${stage.to}, handig als rijden, weer of stops uitlopen.</p>
                <a class="textlink" target="_blank" href="https://www.google.com/maps/search/camping+near+${encodeURIComponent(stage.to)}">Campings bij eindpunt</a>
              </section>

              <section class="day-tool">
                <p class="eyebrow">Brandstof</p>
                <h3>Tanken</h3>
                <p><b>${fuelAdvice.title}.</b> ${fuelAdvice.body}</p>
                ${renderFuelPriceLookup(fuelAdvice)}
              </section>

              <section class="day-tool">
                <p class="eyebrow">Voorraad</p>
                <h3>Boodschappen</h3>
                <p><b>${groceryAdvice.title}.</b> ${groceryAdvice.body}</p>
                ${renderGroceryLookup(groceryAdvice)}
              </section>
            `
            : ""
        }
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
  if (!canEditLottePassport()) return;
  const data = JSON.parse(localStorage.getItem("lotte_items") || "{}");
  data[index] = data[index] || {};
  data[index][field] = value;
  localStorage.setItem("lotte_items", JSON.stringify(data));
  renderLotte();
}

function saveLottePhoto(index, input) {
  if (!canEditLottePassport()) return;
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
    "Geit gezien",
    "Eland op een bord of in het echt gezien",
    "Waterval gezien",
    "Waterval gehoord voordat je hem zag",
    "Grote brug gezien",
    "Veerboot geweest",
    "Boot of ferry gefotografeerd",
    "Staafkerk bezocht",
    "Noors ijsje gegeten",
    "Noorse supermarkt ontdekt",
    "Iets Noors geproefd dat je nog niet kende",
    "Lange tunnel gereden",
    "Tunnel met gekleurde lampen gezien",
    "Fjord gezien",
    "Fjordfoto gemaakt",
    "Gletsjer gezien",
    "Regenboog gezien",
    "Sneeuw gezien in de zomer",
    "Bergpas gereden",
    "Haarspeldbochten geteld",
    "Steenmannetje gebouwd",
    "Voeten in een fjord",
    "Mooie steen gevonden",
    "Bloem of plant gefotografeerd",
    "Vogel gespot",
    "Picknickplek gekozen",
    "Mooiste uitzicht van de dag gekozen",
    "Grappigste plaatsnaam gevonden",
    "Favoriete liedje van de dag gekozen",
    "Reisdag beoordeeld met sterren",
    "Mooiste camperfoto gemaakt",
  ];

  const saved = JSON.parse(localStorage.getItem("lotte_items") || "{}");
  const open = JSON.parse(localStorage.getItem("lotte_open") || "{}");
  const canEdit = canEditLottePassport();

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
                  <input type="checkbox" ${data.checked ? "checked" : ""} ${canEdit ? "" : "disabled"} onchange="saveLotteItem(${index}, 'checked', this.checked)">
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
                      ${
                        canEdit
                          ? `<label>Foto toevoegen:
                              <input type="file" accept="image/*" onchange="saveLottePhoto(${index}, this)">
                            </label>`
                          : ""
                      }

                      ${data.photo ? `<img class="lotte-photo" src="${data.photo}" alt="Foto">` : ""}

                      ${
                        canEdit
                          ? `<label>Vertel iets over wat je hebt gezien:
                              <textarea onchange="saveLotteItem(${index}, 'note', this.value)" placeholder="Vertel iets over wat je hebt gezien...">${data.note || ""}</textarea>
                            </label>

                            <label>Score:
                              <select onchange="saveLotteItem(${index}, 'score', this.value)">
                                <option value="">Kies score</option>
                                ${[1, 2, 3, 4, 5]
                                  .map((n) => `<option value="${n}" ${String(data.score) === String(n) ? "selected" : ""}>${n} sterren</option>`)
                                  .join("")}
                              </select>
                            </label>`
                          : `${data.note ? `<p class="lotte-readonly-note">${data.note}</p>` : ""}
                             ${data.score ? `<p class="lotte-readonly-score">${"*".repeat(Number(data.score))}</p>` : ""}`
                      }
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
    document.getElementById("weatherPanel").innerHTML = "";
    document.getElementById("diaryPanel").innerHTML = "";
    document.getElementById("daysWeatherSummary").innerHTML = "";
    return;
  }

  resetDashboardRoute();
  document.getElementById("summary").innerHTML = renderDashboard();
  setTimeout(initDashboardRoute, 0);
  renderDaysWeatherSummary();
  renderStages();
  renderDiaryPanel();
  renderLotte();
  renderAdminPanel();
  renderWeatherPanel();

  if (requestedDayPending) {
    requestedDayPending = false;
    localStorage.setItem("reisapp_active_stage", String(activeStage));
    showTab("days");
    requestAnimationFrame(() => {
      document.getElementById("selectedDayRoute")?.scrollIntoView({
        block: "start",
      });
    });
  }
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  render();
});

initAuth();
if (driving) startLocationTracking();
