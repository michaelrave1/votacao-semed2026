import {
  createEmptyElectionState,
  ensureElectionSeed,
  runElectionStateTransaction,
  subscribeToElectionState,
} from "./firebase-store.js";
const FINISH_DELAY_MS = 2600;
const VOTER_TYPES = ["Familiar de Aluno", "Funcionário Público"];
const TECH_LOGO_URL = "file:///C:/Users/Detic%20Michael/Pictures/para%20png/png/Design%20sem%20nome.png";
const MUNICIPAL_LOGO_URL = "file:///C:/Users/Detic%20Michael/Pictures/para%20png/ChatGPT%20Image%2030%20de%20abr.%20de%202026,%2015_19_43.png";
const UNIT_NAMES = [
  "E. M. ADOLFO BEZERRA DE MENEZES",
  "E. M. ARTHUR DE MELLO TEIXEIRA",
  "E. M. BOA VISTA",
  "E. M. CELINA SOARES DE PAIVA",
  "E. M. DOUTOR ALUÍZIO ROSA PRATA",
  "E. M. FREDERICO PEIRÓ",
  "E. M. GASTÃO MESQUITA FILHO",
  "E. M. JOÃOZINHO E MARIA",
  "E. M. JOSÉ MARCUS CHERÉM",
  "E. M. JOUBERT DE CARVALHO",
  "E. M. MADRE MARIA GEORGINA",
  "E. M. MARIA CAROLINA MENDES",
  "E. M. MARIA LOURENCINA PALMÉRIO",
  "E. M. MONTEIRO LOBATO",
  "E. M. NORMA SUELI BORGES",
  "E. M. PADRE EDDIE BERNARDES",
  "E. M. PEQUENO PRÍNCIPE",
  "E. M. PROF. ANÍSIO TEIXEIRA",
  "E. M. PROF. JOSÉ GERALDO GUIMARÃES",
  "E. M. PROF. JOSÉ MACCIOTTI",
  "E. M. PROF. PAULO RODRIGUES",
  "E. M. PROF.ª ESTHER LIMÍRIO BRIGAGÃO",
  "E. M. PROF.ª GENI CHAVES",
  "E. M. PROF.ª JANE LUCE ARAÚJO",
  "E. M. PROF.ª LUCIENE APARECIDA DO CARMO",
  "E. M. PROF.ª NIZA MARQUEZ GUARITÁ",
  "E. M. PROF.ª OLGA DE OLIVEIRA",
  "E. M. PROF.ª STELLA CHAVES",
  "E.M. PROF.ª TEREZINHA HUEB DE MENEZES",
  "E. M. REIS JÚNIOR",
  "E.M. RICARDO MISSON",
  "E. M. SANTA MARIA",
  "E. M. SÃO JUDAS TADEU",
  "E. M. SEBASTIÃO ANTÔNIO LEAL",
  "E. M. SÍTIO DO PICA-PAU AMARELO",
  "E. M. TOTONHO DE MORAIS",
  "E. M. UBERABA",
  "E.M. URBANA FREI EUGÊNIO",
  "E. M. VICENTE ALVES TRINDADE",
  "CEMEI ÂNGELA BEATRIZ BONÁDIO ALVES",
  "CEMEI APARECIDACONCEIÇÃO FERREIRA",
  "CEMEI CLÁUDIA APARECIDA VILELA MESQUITA",
  "CEMEI DIEGO JOSÉ FERREIRA LIMA",
  "CEMEI FRANCISCA VALIAS WENCESLAU",
  "CEMEI GERVÁSIO PEDRO ALVES",
  "CEMEI HILDO TOTI",
  "CEMEI INTEGRAÇÃO",
  "CEMEI JOÃO GILBERTO RIPPOSATI",
  "CEMEI JOÃO MIGUEL HUEB",
  "CEMEI JUSCELINO KUBITSCHECK",
  "CEMEI LUCIANO PORTELINHA MOTA",
  "CEMEI MÁRCIO EURÍPEDES MARTINS DOS SANTOS",
  "CEMEI MARIA ASSIS REZENDE",
  "CEMEI MARIA DE LOURDES VASQUES MARTINS MARINO",
  "CEMEI MARIA DE NAZARÉ",
  "CEMEI MARIA EDUARDA FARNEZICAETANO",
  "CEMEI MARIA ELISABETE SALGE MELO",
  "CEMEI MARIA ROSA DE OLIVEIRA",
  "CEMEI MICHELLE FLÁVIA MARTINS PIRES",
  "CEMEI MÔNICA MACHIYAMA",
  "CEMEI MONSENHOR JUVENAL ARDUINI",
  "CEMEI NICANOR PEDRO DA SILVEIRA",
  "CEMEI NOSSA SENHORA DE LOURDES",
  "CEMEI OCTÁVIA ALVES LOPES",
  "CEMEI PARAÍSO",
  "CEMEI PROF. JOÃO WILSON DE FREITAS",
  "CEMEI PROFESSOR RAIMUNDO EDMUNDO DE FREITAS",
  "CEMEI PROFª. BEATRIZ FAUSTINO MONTEIRO",
  "CEMEI PROF.ª DIRCE MIZIARA",
  "CEMEI PROF.ª EUNICE DE SOUSA PÜHLER",
  "CEMEI PROF.ª JOANA DARCCAMPOS OLIVEIRA",
  "CEMEI PROF.ª MARIA EMERENCIANACARDOSO",
  "CEMEI PROF.ª MARÍLIA BARBOSA PACHECO SILVA",
  "CEMEI PROF.ª NATALYA DAYRELL DECARVALHO",
  "CEMEI PROF.ª ZITA THEREZINHACAPUÇO",
  "CEMEI SOLANGE APARECIDACARDOSO DA SILVA",
  "CEMEI TUTUNAS",
  "CEMEI VOVÓ ADELINA",
  "CEMEI VOVÓ TIANA",
];

const uiState = {
  screen: "login",
  currentAccessId: null,
  activeSessionId: null,
  loginError: "",
  loginEmail: "",
  adminTab: "access",
  activeAccessEditId: null,
  activeCandidateId: null,
  accessNotice: "",
  candidateNotice: "",
  sessionNotice: "",
  resultUnitFilter: "",
  resultTypeFilter: "",
  ballotDigits: "",
  ballotBlank: false,
  ballotAlert: "",
  tempCandidatePhoto: "",
};

const appRoot = document.querySelector("#app");
let appState = createEmptyElectionState();
let finishTimer = null;
let isStateReady = false;
let isSeedCheckComplete = false;
let stateSyncError = "";

document.addEventListener("keydown", handleGlobalKeydown);
appRoot.addEventListener("click", handleClick);
appRoot.addEventListener("submit", handleSubmit);
appRoot.addEventListener("change", handleChange);

renderApp();
startStateSync();

function startStateSync() {
  subscribeToElectionState({
    onChange(nextState) {
      appState = nextState;
      renderApp();
    },
    onReady() {
      isStateReady = true;
      renderApp();
    },
    onError(error) {
      stateSyncError = "Nao foi possivel sincronizar os dados da votacao com o Firestore.";
      console.error(error);
      renderApp();
    },
  });

  initializeSeedState();
}

async function initializeSeedState() {
  try {
    await ensureElectionSeed(createSeedState());
  } catch (error) {
    stateSyncError = "Nao foi possivel preparar a base inicial no Firestore.";
    console.error(error);
  } finally {
    isSeedCheckComplete = true;
    renderApp();
  }
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seeded = createSeedState();
    persistState(seeded);
    return seeded;
  }

  try {
    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      !Array.isArray(parsed.units) ||
      !Array.isArray(parsed.accessAccounts) ||
      !Array.isArray(parsed.candidates) ||
      !Array.isArray(parsed.boothAssignments) ||
      !Array.isArray(parsed.votingSessions) ||
      !Array.isArray(parsed.votes)
    ) {
      throw new Error("Estado inválido.");
    }
    return parsed;
  } catch (error) {
    const seeded = createSeedState();
    persistState(seeded);
    return seeded;
  }
}

function persistState(nextState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
}

function createSeedState() {
  const units = UNIT_NAMES.map((name, index) => ({
    id: `unit-${String(index + 1).padStart(2, "0")}-${slugify(name).slice(0, 24)}`,
    name,
    officeTitle: "DIRETOR",
  }));

  const accessAccounts = [
    {
      id: makeId(),
      accessKind: "ADMINISTRADOR",
      name: "Administrador Geral",
      email: "admin@urna.local",
      password: "admin123",
      unitId: "",
      active: true,
    },
    ...units.map((unit, index) => ({
      id: makeId(),
      accessKind: "MESARIO",
      name: `Mesário ${String(index + 1).padStart(2, "0")}`,
      email: `mesario${String(index + 1).padStart(2, "0")}@urna.local`,
      password: "123456",
      unitId: unit.id,
      active: true,
    })),
  ];

  const candidateTemplates = [
    { number: "101", name: "Chapa Horizonte Escolar", color: "#1f6b46" },
    { number: "102", name: "Chapa Comunidade Viva", color: "#255d8b" },
    { number: "103", name: "Chapa Futuro Aberto", color: "#b0521c" },
  ];

  const candidates = units.flatMap((unit) =>
    candidateTemplates.map((template) => ({
      id: makeId(),
      unitId: unit.id,
      number: template.number,
      name: template.name,
      photoData: buildAvatar(template.name, template.color),
    })),
  );

  return {
    settings: {
      title: "Urna Escolar",
    },
    units,
    accessAccounts,
    candidates,
    boothAssignments: [],
    votingSessions: [],
    votes: [],
  };
}

function handleExternalStateChange(event) {
  if (event.key !== STORAGE_KEY) {
    return;
  }

  appState = loadState();
  renderApp();
}

function buildAvatar(name, color) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((piece) => piece[0].toUpperCase())
    .join("");

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="480" viewBox="0 0 400 480">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop stop-color="${color}" offset="0%"/>
          <stop stop-color="#f0e6c8" offset="100%"/>
        </linearGradient>
      </defs>
      <rect width="400" height="480" rx="36" fill="url(#g)"/>
      <circle cx="200" cy="150" r="84" fill="rgba(255,255,255,0.78)"/>
      <path d="M88 392c16-74 65-114 112-114 54 0 96 35 112 114" fill="rgba(255,255,255,0.72)"/>
      <text x="200" y="452" text-anchor="middle" font-family="Trebuchet MS, sans-serif" font-size="56" font-weight="700" fill="#152116">${initials}</text>
    </svg>
  `.trim();

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function handleGlobalKeydown(event) {
  if (uiState.screen !== "ballot") {
    return;
  }

  if (/^[0-9]$/.test(event.key)) {
    pushDigit(event.key);
  } else if (event.key === "Backspace") {
    clearBallot();
  } else if (event.key === "Enter") {
    confirmVote();
  }
}

function handleClick(event) {
  const actionTarget = event.target.closest("[data-action]");
  if (!actionTarget) {
    return;
  }

  const { action, value = "" } = actionTarget.dataset;

  if (action === "logout") {
    logout();
  } else if (action === "open-tab") {
    uiState.adminTab = value;
    uiState.accessNotice = "";
    uiState.candidateNotice = "";
    renderApp();
  } else if (action === "digit") {
    pushDigit(value);
  } else if (action === "blank") {
    markBlank();
  } else if (action === "correct") {
    clearBallot();
  } else if (action === "confirm") {
    confirmVote();
  } else if (action === "return-operator") {
    returnToMesarioPanel();
    renderApp();
  } else if (action === "resume-session") {
    resumeCurrentSession();
  } else if (action === "edit-access") {
    uiState.activeAccessEditId = value;
    uiState.adminTab = "access";
    uiState.accessNotice = "";
    renderApp();
  } else if (action === "new-access") {
    uiState.activeAccessEditId = null;
    uiState.accessNotice = "";
    renderApp();
  } else if (action === "toggle-access") {
    toggleAccessActive(value);
  } else if (action === "edit-candidate") {
    uiState.activeCandidateId = value;
    uiState.tempCandidatePhoto = "";
    uiState.adminTab = "candidates";
    uiState.candidateNotice = "";
    renderApp();
  } else if (action === "new-candidate") {
    uiState.activeCandidateId = null;
    uiState.tempCandidatePhoto = "";
    uiState.candidateNotice = "";
    renderApp();
  } else if (action === "delete-candidate") {
    deleteCandidate(value);
  } else if (action === "reset-form") {
    if (value === "access") {
      uiState.activeAccessEditId = null;
      uiState.accessNotice = "";
    }
    if (value === "candidate") {
      uiState.activeCandidateId = null;
      uiState.candidateNotice = "";
      uiState.tempCandidatePhoto = "";
    }
    renderApp();
  } else if (action === "set-demo-user") {
    uiState.loginEmail = value;
    renderApp();
  } else if (action === "clear-filters") {
    uiState.resultUnitFilter = "";
    uiState.resultTypeFilter = "";
    renderApp();
  }
}

function handleSubmit(event) {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) {
    return;
  }

  if (form.id === "login-form") {
    event.preventDefault();
    submitLogin(new FormData(form));
  }

  if (form.id === "session-form") {
    event.preventDefault();
    submitSessionForm(new FormData(form));
  }

  if (form.id === "access-form") {
    event.preventDefault();
    submitAccessForm(new FormData(form));
  }

  if (form.id === "candidate-form") {
    event.preventDefault();
    submitCandidateForm(new FormData(form));
  }
}

function handleChange(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  if (target.id === "results-unit-filter") {
    uiState.resultUnitFilter = target.value;
    renderApp();
  }

  if (target.id === "results-type-filter") {
    uiState.resultTypeFilter = target.value;
    renderApp();
  }

  if (target.id === "candidate-photo" && target instanceof HTMLInputElement && target.files && target.files[0]) {
    const reader = new FileReader();
    reader.onload = () => {
      uiState.tempCandidatePhoto = typeof reader.result === "string" ? reader.result : "";
      renderApp();
    };
    reader.readAsDataURL(target.files[0]);
  }
}

function submitLogin(formData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  uiState.loginEmail = email;

  const account = appState.accessAccounts.find(
    (item) => item.email.toLowerCase() === email && item.password === password && item.active,
  );

  if (!account) {
    uiState.loginError = "Credenciais inválidas ou acesso desativado.";
    renderApp();
    return;
  }

  clearTimeout(finishTimer);
  finishTimer = null;

  uiState.currentAccessId = account.id;
  uiState.activeSessionId = null;
  uiState.loginError = "";
  uiState.sessionNotice = "";
  resetBallotState();

  if (account.accessKind === "ADMINISTRADOR") {
    uiState.screen = "admin";
  } else {
    uiState.screen = "mesario";
  }

  renderApp();
}

async function submitSessionForm(formData) {
  const mesario = getCurrentAccess();
  if (!mesario || mesario.accessKind !== "MESARIO") {
    logout();
    return;
  }

  const activeBooth = getBoothAssignmentForUnit(mesario.unitId);
  const activeSession = activeBooth ? appState.votingSessions.find((session) => session.id === activeBooth.sessionId) || null : null;
  if (activeSession && activeSession.status === "Liberado") {
    uiState.sessionNotice = `A urna desta unidade já está liberada no token ${activeSession.token}. Conclua a votação atual antes de gerar uma nova.`;
    renderApp();
    return;
  }

  const voterType = String(formData.get("voterType") || "");
  if (!VOTER_TYPES.includes(voterType)) {
    uiState.sessionNotice = "Selecione o perfil do votante antes de iniciar a urna.";
    renderApp();
    return;
  }

  try {
    const result = await runElectionStateTransaction((draftState) => {
      const draftMesario = draftState.accessAccounts.find((item) => item.id === mesario.id && item.active);
      if (!draftMesario || draftMesario.accessKind !== "MESARIO") {
        return { status: "invalid-access" };
      }

      const draftBooth = draftState.boothAssignments.find((assignment) => assignment.unitId === draftMesario.unitId) || null;
      const draftSession = draftBooth
        ? draftState.votingSessions.find((session) => session.id === draftBooth.sessionId) || null
        : null;

      if (draftSession && draftSession.status === "Liberado") {
        return {
          status: "already-open",
          token: draftSession.token,
          voterType: draftSession.voterType,
        };
      }

      const unit = draftState.units.find((item) => item.id === draftMesario.unitId) || null;
      const createdAt = new Date().toISOString();
      const session = {
        id: makeId(),
        token: makeUniqueTokenFromState(draftState),
        voterType,
        unitId: draftMesario.unitId,
        unitName: unit ? unit.name : "",
        mesarioId: draftMesario.id,
        mesarioName: draftMesario.name,
        mesarioEmail: draftMesario.email,
        status: "Liberado",
        createdAt,
        usedAt: null,
      };

      draftState.boothAssignments = draftState.boothAssignments.filter(
        (assignment) => assignment.unitId !== draftMesario.unitId,
      );
      draftState.boothAssignments.unshift({
        id: makeId(),
        unitId: draftMesario.unitId,
        sessionId: session.id,
        releasedAt: createdAt,
      });
      draftState.votingSessions.unshift(session);

      return {
        status: "created",
        session,
      };
    });

    if (result.status === "invalid-access") {
      logout();
      return;
    }

    if (result.status === "already-open") {
      uiState.sessionNotice =
        `A urna desta unidade jÃ¡ estÃ¡ liberada no token ${result.token}. ` +
        "Conclua a votaÃ§Ã£o atual antes de gerar uma nova.";
      renderApp();
      return;
    }

    uiState.activeSessionId = result.session.id;
    uiState.sessionNotice = "";
    resetBallotState();
    uiState.screen = "ballot";
    renderApp();
  } catch (error) {
    uiState.sessionNotice = "Nao foi possivel liberar a urna no Firestore.";
    console.error(error);
    renderApp();
  }
}

async function submitAccessForm(formData) {
  const editing = getActiveAccessEdit();
  const accessKind = String(formData.get("accessKind") || "MESARIO");
  const payload = {
    name: String(formData.get("name") || "").trim(),
    email: String(formData.get("email") || "").trim().toLowerCase(),
    password: String(formData.get("password") || "").trim(),
    accessKind,
    unitId: String(formData.get("unitId") || ""),
    active: formData.get("active") === "on",
  };

  if (!payload.name || !payload.email || !payload.password) {
    uiState.accessNotice = "Preencha nome, e-mail e senha.";
    renderApp();
    return;
  }

  if (payload.accessKind === "MESARIO" && !payload.unitId) {
    uiState.accessNotice = "Selecione a unidade escolar do mesário.";
    renderApp();
    return;
  }

  const duplicate = appState.accessAccounts.find(
    (account) => account.email.toLowerCase() === payload.email && account.id !== (editing && editing.id),
  );

  if (duplicate) {
    uiState.accessNotice = "Já existe um acesso com este e-mail.";
    renderApp();
    return;
  }

  try {
    const result = await runElectionStateTransaction((draftState) => {
      const latestEditing = editing
        ? draftState.accessAccounts.find((account) => account.id === editing.id) || null
        : null;
      const latestDuplicate = draftState.accessAccounts.find(
        (account) => account.email.toLowerCase() === payload.email && account.id !== (latestEditing && latestEditing.id),
      );

      if (latestDuplicate) {
        return { status: "duplicate" };
      }

      if (editing && !latestEditing) {
        return { status: "missing" };
      }

      if (latestEditing) {
        latestEditing.name = payload.name;
        latestEditing.email = payload.email;
        latestEditing.password = payload.password;
        latestEditing.accessKind = payload.accessKind;
        latestEditing.unitId = payload.accessKind === "MESARIO" ? payload.unitId : "";
        latestEditing.active = payload.active;
        return { status: "updated" };
      }

      draftState.accessAccounts.unshift({
        id: makeId(),
        createdAt: new Date().toISOString(),
        name: payload.name,
        email: payload.email,
        password: payload.password,
        accessKind: payload.accessKind,
        unitId: payload.accessKind === "MESARIO" ? payload.unitId : "",
        active: payload.active,
      });

      return { status: "created" };
    });

    if (result.status === "duplicate") {
      uiState.accessNotice = "JÃ¡ existe um acesso com este e-mail.";
      renderApp();
      return;
    }

    if (result.status === "missing") {
      uiState.accessNotice = "O acesso em ediÃ§Ã£o nÃ£o foi encontrado.";
      uiState.activeAccessEditId = null;
      renderApp();
      return;
    }

    uiState.accessNotice = result.status === "updated"
      ? "Acesso atualizado com sucesso."
      : "Acesso criado com sucesso.";
    uiState.activeAccessEditId = null;
    renderApp();
  } catch (error) {
    uiState.accessNotice = "Nao foi possivel salvar o acesso no Firestore.";
    console.error(error);
    renderApp();
  }
}

async function submitCandidateForm(formData) {
  const editing = getActiveCandidate();
  const payload = {
    number: String(formData.get("number") || "").trim(),
    name: String(formData.get("name") || "").trim(),
    unitId: String(formData.get("unitId") || ""),
    photoData: uiState.tempCandidatePhoto || (editing ? editing.photoData : ""),
  };

  if (!/^\d{3}$/.test(payload.number)) {
    uiState.candidateNotice = "O número da chapa precisa ter exatamente 3 dígitos.";
    renderApp();
    return;
  }

  if (!payload.name || !payload.unitId) {
    uiState.candidateNotice = "Preencha nome, número e unidade.";
    renderApp();
    return;
  }

  const duplicate = appState.candidates.find(
    (candidate) =>
      candidate.number === payload.number &&
      candidate.unitId === payload.unitId &&
      candidate.id !== (editing && editing.id),
  );

  if (duplicate) {
    uiState.candidateNotice = "Já existe uma chapa com este número nessa unidade.";
    renderApp();
    return;
  }

  try {
    const result = await runElectionStateTransaction((draftState) => {
      const latestEditing = editing
        ? draftState.candidates.find((candidate) => candidate.id === editing.id) || null
        : null;
      const latestDuplicate = draftState.candidates.find(
        (candidate) =>
          candidate.number === payload.number &&
          candidate.unitId === payload.unitId &&
          candidate.id !== (latestEditing && latestEditing.id),
      );

      if (latestDuplicate) {
        return { status: "duplicate" };
      }

      if (editing && !latestEditing) {
        return { status: "missing" };
      }

      if (latestEditing) {
        latestEditing.number = payload.number;
        latestEditing.name = payload.name;
        latestEditing.unitId = payload.unitId;
        latestEditing.photoData = payload.photoData || latestEditing.photoData;
        return { status: "updated" };
      }

      draftState.candidates.unshift({
        id: makeId(),
        createdAt: new Date().toISOString(),
        number: payload.number,
        name: payload.name,
        unitId: payload.unitId,
        photoData: payload.photoData || buildAvatar(payload.name, "#1f6b46"),
      });

      return { status: "created" };
    });

    if (result.status === "duplicate") {
      uiState.candidateNotice = "JÃ¡ existe uma chapa com este nÃºmero nessa unidade.";
      renderApp();
      return;
    }

    if (result.status === "missing") {
      uiState.candidateNotice = "A chapa em ediÃ§Ã£o nÃ£o foi encontrada.";
      uiState.activeCandidateId = null;
      uiState.tempCandidatePhoto = "";
      renderApp();
      return;
    }

    uiState.candidateNotice = result.status === "updated"
      ? "Chapa atualizada com sucesso."
      : "Chapa cadastrada com sucesso.";
    uiState.activeCandidateId = null;
    uiState.tempCandidatePhoto = "";
    renderApp();
  } catch (error) {
    uiState.candidateNotice = "Nao foi possivel salvar a chapa no Firestore.";
    console.error(error);
    renderApp();
  }
}

async function toggleAccessActive(accessId) {
  try {
    const result = await runElectionStateTransaction((draftState) => {
      const account = draftState.accessAccounts.find((item) => item.id === accessId) || null;
      if (!account) {
        return { status: "missing" };
      }

      account.active = !account.active;
      return { status: "updated" };
    });

    if (result.status === "missing") {
      return;
    }

    renderApp();
  } catch (error) {
    uiState.accessNotice = "Nao foi possivel atualizar o acesso no Firestore.";
    console.error(error);
    renderApp();
  }
}

async function deleteCandidate(candidateId) {
  try {
    const result = await runElectionStateTransaction((draftState) => {
      const nextCandidates = draftState.candidates.filter((candidate) => candidate.id !== candidateId);
      if (nextCandidates.length === draftState.candidates.length) {
        return { status: "missing" };
      }

      draftState.candidates = nextCandidates;
      return { status: "deleted" };
    });

    if (result.status === "missing") {
      return;
    }

    if (uiState.activeCandidateId === candidateId) {
      uiState.activeCandidateId = null;
    }

    renderApp();
  } catch (error) {
    uiState.candidateNotice = "Nao foi possivel remover a chapa no Firestore.";
    console.error(error);
    renderApp();
  }
}

function pushDigit(digit) {
  if (uiState.ballotDigits.length >= 3) {
    return;
  }

  uiState.ballotBlank = false;
  uiState.ballotDigits += digit;
  uiState.ballotAlert = "";
  renderApp();
}

function markBlank() {
  if (uiState.ballotDigits.length > 0) {
    uiState.ballotAlert = "Use BRANCO apenas antes de digitar o número.";
    renderApp();
    return;
  }

  uiState.ballotBlank = true;
  uiState.ballotAlert = "";
  renderApp();
}

function clearBallot() {
  resetBallotState();
  renderApp();
}

async function confirmVote() {
  const mesario = getCurrentAccess();
  const session = getActiveSession();
  if (!mesario || mesario.accessKind !== "MESARIO" || !session) {
    returnToMesarioPanel("SessÃ£o de votaÃ§Ã£o indisponÃ­vel. Gere um novo token para continuar.");
    renderApp();
    return;
  }

  if (session.status === "Votou" || appState.votes.some((vote) => vote.sessionId === session.id)) {
    returnToMesarioPanel(`O token ${session.token} jÃ¡ foi utilizado. Gere um novo token para outra votaÃ§Ã£o.`);
    renderApp();
    return;
  }

  const candidate = getCurrentBallotCandidate();
  let voteType = "VÃ¡lido";
  let candidateNumber = uiState.ballotDigits;
  let candidateName = candidate ? candidate.name : "";

  if (uiState.ballotBlank && uiState.ballotDigits.length === 0) {
    voteType = "Em Branco";
    candidateNumber = "";
    candidateName = "";
  } else if (uiState.ballotDigits.length !== 3) {
    uiState.ballotAlert = "Digite os 3 dÃ­gitos do candidato ou escolha BRANCO.";
    renderApp();
    return;
  } else if (!candidate) {
    voteType = "Nulo";
    candidateName = "";
  }

  try {
    const result = await runElectionStateTransaction((draftState) => {
      const latestSession = draftState.votingSessions.find((item) => item.id === session.id) || null;
      if (!latestSession) {
        return { status: "missing" };
      }

      if (latestSession.status === "Votou" || draftState.votes.some((vote) => vote.sessionId === latestSession.id)) {
        return {
          status: "already-used",
          token: latestSession.token,
        };
      }

      const voteTime = new Date().toISOString();
      draftState.votes.unshift({
        id: makeId(),
        sessionId: latestSession.id,
        token: latestSession.token,
        createdAt: voteTime,
        candidateNumber,
        candidateName,
        voteType,
        voterType: latestSession.voterType,
        unitId: latestSession.unitId,
        unitName: latestSession.unitName,
        mesarioName: mesario.name,
        mesarioEmail: mesario.email,
      });

      latestSession.status = "Votou";
      latestSession.usedAt = voteTime;
      draftState.boothAssignments = draftState.boothAssignments.filter(
        (assignment) => assignment.unitId !== latestSession.unitId,
      );

      return {
        status: "success",
        token: latestSession.token,
        voterType: latestSession.voterType,
      };
    });

    if (result.status === "missing") {
      returnToMesarioPanel("SessÃ£o de votaÃ§Ã£o indisponÃ­vel. Gere um novo token para continuar.");
      renderApp();
      return;
    }

    if (result.status === "already-used") {
      returnToMesarioPanel(`O token ${result.token} jÃ¡ foi utilizado. Gere um novo token para outra votaÃ§Ã£o.`);
      renderApp();
      return;
    }

    resetBallotState();
    uiState.screen = "finish";
    renderApp();

    clearTimeout(finishTimer);
    finishTimer = window.setTimeout(() => {
      returnToMesarioPanel(`VotaÃ§Ã£o concluÃ­da. Token ${result.token} finalizado para ${result.voterType}.`);
      renderApp();
    }, FINISH_DELAY_MS);
  } catch (error) {
    uiState.ballotAlert = "Nao foi possivel registrar o voto no Firestore.";
    console.error(error);
    renderApp();
  }
}

function confirmVoteLegacy() {
  const mesario = getCurrentAccess();
  const session = getActiveSession();
  if (!mesario || mesario.accessKind !== "MESARIO" || !session) {
    returnToMesarioPanel("Sessão de votação indisponível. Gere um novo token para continuar.");
    renderApp();
    return;
  }

  if (session.status === "Votou" || appState.votes.some((vote) => vote.sessionId === session.id)) {
    returnToMesarioPanel(`O token ${session.token} já foi utilizado. Gere um novo token para outra votação.`);
    renderApp();
    return;
  }

  const candidate = getCurrentBallotCandidate();
  let voteType = "Válido";
  let candidateNumber = uiState.ballotDigits;
  let candidateName = candidate ? candidate.name : "";

  if (uiState.ballotBlank && uiState.ballotDigits.length === 0) {
    voteType = "Em Branco";
    candidateNumber = "";
    candidateName = "";
  } else if (uiState.ballotDigits.length !== 3) {
    uiState.ballotAlert = "Digite os 3 dígitos do candidato ou escolha BRANCO.";
    renderApp();
    return;
  } else if (!candidate) {
    voteType = "Nulo";
    candidateName = "";
  }

  const voteTime = new Date().toISOString();
  appState.votes.unshift({
    id: makeId(),
    sessionId: session.id,
    token: session.token,
    createdAt: voteTime,
    candidateNumber,
    candidateName,
    voteType,
    voterType: session.voterType,
    unitId: session.unitId,
    unitName: session.unitName,
    mesarioName: mesario.name,
    mesarioEmail: mesario.email,
  });

  session.status = "Votou";
  session.usedAt = voteTime;
  persistState(appState);

  resetBallotState();
  uiState.screen = "finish";
  renderApp();

  clearTimeout(finishTimer);
  finishTimer = window.setTimeout(() => {
    returnToMesarioPanel(`Votação concluída. Token ${session.token} finalizado para ${session.voterType}.`);
    renderApp();
  }, FINISH_DELAY_MS);
}

function returnToMesarioPanel(message = "") {
  clearTimeout(finishTimer);
  finishTimer = null;
  uiState.screen = "mesario";
  uiState.activeSessionId = null;
  uiState.sessionNotice = message;
  resetBallotState();
}

function resumeCurrentSession() {
  const mesario = getCurrentAccess();
  if (!mesario || mesario.accessKind !== "MESARIO") {
    logout();
    return;
  }

  const liveAssignment = getBoothAssignmentForUnit(mesario.unitId);
  const liveSession = liveAssignment
    ? appState.votingSessions.find((session) => session.id === liveAssignment.sessionId) || null
    : null;

  if (!liveSession || liveSession.status !== "Liberado") {
    uiState.sessionNotice = "Nao ha votacao em andamento para retomar.";
    renderApp();
    return;
  }

  uiState.activeSessionId = liveSession.id;
  uiState.sessionNotice = "";
  resetBallotState();
  uiState.screen = "ballot";
  renderApp();
}

function resetBallotState() {
  uiState.ballotDigits = "";
  uiState.ballotBlank = false;
  uiState.ballotAlert = "";
}

function logout() {
  clearTimeout(finishTimer);
  finishTimer = null;
  uiState.screen = "login";
  uiState.currentAccessId = null;
  uiState.activeSessionId = null;
  uiState.loginError = "";
  uiState.sessionNotice = "";
  resetBallotState();
  renderApp();
}

function getCurrentAccess() {
  return appState.accessAccounts.find((account) => account.id === uiState.currentAccessId) || null;
}

function getActiveAccessEdit() {
  return appState.accessAccounts.find((account) => account.id === uiState.activeAccessEditId) || null;
}

function getActiveCandidate() {
  return appState.candidates.find((candidate) => candidate.id === uiState.activeCandidateId) || null;
}

function getActiveSession() {
  return appState.votingSessions.find((session) => session.id === uiState.activeSessionId) || null;
}

function getUnitById(unitId) {
  return appState.units.find((unit) => unit.id === unitId) || null;
}

function getCurrentBallotCandidate() {
  const session = getActiveSession();
  if (!session || uiState.ballotDigits.length !== 3) {
    return null;
  }

  return (
    appState.candidates.find(
      (candidate) => candidate.number === uiState.ballotDigits && candidate.unitId === session.unitId,
    ) || null
  );
}

function getBoothAssignmentForUnit(unitId) {
  return appState.boothAssignments.find((assignment) => assignment.unitId === unitId) || null;
}

function renderApp() {
  appRoot.innerHTML = renderScreen();
}

function renderScreen() {
  if (stateSyncError) {
    return renderAppFrame(renderStatusScreen("Falha na sincronizacao", stateSyncError));
  }
  if (!isStateReady || !isSeedCheckComplete) {
    return renderAppFrame(renderStatusScreen("Conectando ao Firestore", "Carregando a base da votacao em tempo real."));
  }
  if (uiState.screen === "admin") {
    return renderAppFrame(renderAdminScreen());
  }
  if (uiState.screen === "mesario") {
    return renderAppFrame(renderMesarioScreen());
  }
  if (uiState.screen === "ballot") {
    return renderAppFrame(renderBallotScreen());
  }
  if (uiState.screen === "finish") {
    return renderAppFrame(renderFinishScreen());
  }
  return renderLoginScreen();
}

function renderStatusScreen(title, message) {
  return `
    <main class="shell-simple">
      <section class="panel">
        <span class="eyebrow">Sincronizacao de dados</span>
        <h1 class="panel-title">${escapeHtml(title)}</h1>
        <p class="lead">${escapeHtml(message)}</p>
      </section>
    </main>
  `;
}

function renderAppFrame(content) {
  return `
    <div class="brand-frame">
      <header class="brand-header">
        <div class="brand-header-inner">
          <img class="brand-logo municipal" src="${MUNICIPAL_LOGO_URL}" alt="Logotipo Secretaria de Educação de Uberaba">
          <img class="brand-logo tech" src="${TECH_LOGO_URL}" alt="Logotipo Departamento de Educação Tecnológica">
        </div>
      </header>
      ${content}
      <footer class="brand-footer">
        <div class="brand-footer-inner">
          <img class="brand-logo-footer tech" src="${TECH_LOGO_URL}" alt="Logotipo Departamento de Educação Tecnológica">
          <img class="brand-logo-footer municipal" src="${MUNICIPAL_LOGO_URL}" alt="Logotipo Secretaria de Educação de Uberaba">
        </div>
      </footer>
    </div>
  `;
}

function renderLoginScreen() {
  const mesarios = appState.accessAccounts.filter((account) => account.accessKind === "MESARIO");
  const sessions = appState.votingSessions.length;
  const votes = appState.votes.length;

  return `
    <main class="shell">
      <section class="hero-card">
        <div>
          <span class="eyebrow">Sistema de votação escolar</span>
          <h1 class="headline">Acesso ao sistema</h1>
          <p class="lead">Entre com suas credenciais para continuar.</p>
          <div class="hero-stats">
            <article class="stat-card">
              <small>Unidades escolares</small>
              <strong>${appState.units.length}</strong>
              <span class="subtle">Todas as escolas informadas já estão cadastradas na base inicial.</span>
            </article>
            <article class="stat-card">
              <small>Mesários iniciais</small>
              <strong>${mesarios.length}</strong>
              <span class="subtle">Um acesso de mesário de demonstração por unidade escolar.</span>
            </article>
            <article class="stat-card">
              <small>Sessões geradas</small>
              <strong>${sessions}</strong>
              <span class="subtle">${votes} votos já sincronizados com o Firestore deste projeto.</span>
            </article>
          </div>
        </div>
        <aside class="login-card">
          <div>
            <h2>Login do mesário</h2>
            <p class="subtle">Use o acesso administrativo ou entre com o mesário da unidade para iniciar novas votações.</p>
          </div>
          ${uiState.loginError ? `<div class="flash flash-error">${escapeHtml(uiState.loginError)}</div>` : ""}
          <form id="login-form" class="field-grid">
            <div class="field">
              <label for="email">E-mail</label>
              <input id="email" name="email" type="email" autocomplete="username" placeholder="mesario@exemplo.com" value="${escapeHtml(
                uiState.loginEmail,
              )}" required>
            </div>
            <div class="field">
              <label for="password">Senha</label>
              <input id="password" name="password" type="password" autocomplete="current-password" placeholder="Digite a senha" required>
            </div>
            <button class="btn btn-primary" type="submit">Entrar</button>
          </form>
        </aside>
      </section>
    </main>
  `;
}

function renderMesarioScreen() {
  const mesario = getCurrentAccess();
  if (!mesario || mesario.accessKind !== "MESARIO") {
    uiState.screen = "login";
    return renderLoginScreen();
  }

  const unit = getUnitById(mesario.unitId);
  const liveAssignment = getBoothAssignmentForUnit(mesario.unitId);
  const liveSession = liveAssignment
    ? appState.votingSessions.find((session) => session.id === liveAssignment.sessionId) || null
    : null;
  const sessions = appState.votingSessions.filter((session) => session.mesarioId === mesario.id).slice(0, 8);
  const unitCandidates = appState.candidates.filter((candidate) => candidate.unitId === mesario.unitId);

  return `
    <main class="admin-shell">
      <section class="admin-layout">
        <header class="admin-header">
          <div>
            <span class="eyebrow">Tela operacional do mesário</span>
            <h1 class="headline" style="font-size: clamp(2rem, 3.2vw, 3.1rem); margin-bottom: 8px;">Selecione o perfil do votante e inicie a votacao</h1>
            <p class="lead">
              O mesario permanece logado nesta unidade. Depois de cada voto, a aplicacao retorna aqui para comecar um novo processo.
            </p>
          </div>
          <div class="actions-row">
            <div class="badge">${escapeHtml(mesario.name)}</div>
            <div class="badge">${unit ? escapeHtml(unit.name) : "Sem unidade"}</div>
            ${liveSession ? '<button class="btn btn-secondary" type="button" data-action="resume-session">Retomar votacao atual</button>' : ""}
            <button class="btn btn-neutral" type="button" data-action="logout">Sair</button>
          </div>
        </header>

        <section class="summary-grid">
          ${summaryCard("Unidade do mesário", unit ? "1" : "0", unit ? unit.name : "Nenhuma unidade vinculada")}
          ${summaryCard("Chapas desta escola", unitCandidates.length, "A urna exibirá somente essas opções ao digitar o número.")}
          ${summaryCard("Sessões deste mesário", sessions.length, "Últimas sessões abertas por este acesso.")}
          ${summaryCard("Sessao da unidade", liveSession ? liveSession.status : "Pronta", liveSession ? `Token ativo: ${liveSession.token}` : "Nenhuma votacao liberada no momento.")}
        </section>

        <section class="admin-grid">
          <article class="form-card stack">
            <div>
              <h2 class="section-title">Iniciar nova votação</h2>
              <p class="subtle">Escolha o perfil do votante. A urna sera aberta na mesma tela logo apos a liberacao.</p>
            </div>
            ${uiState.sessionNotice ? `<div class="flash flash-success">${escapeHtml(uiState.sessionNotice)}</div>` : ""}
            <form id="session-form" class="field-grid">
              <div class="field field-light">
                <label for="voterType">Perfil do votante</label>
                <select id="voterType" name="voterType">
                  ${VOTER_TYPES.map((type) => optionTag(type, VOTER_TYPES[0], type)).join("")}
                </select>
              </div>
              <div class="status-strip">
                <span>
                  <strong>Filtro automático por unidade</strong><br>
                  <span class="subtle">As chapas da urna serão carregadas somente da escola do mesário logado.</span>
                </span>
              </div>
              <button class="btn btn-primary" type="submit">Iniciar votacao nesta tela</button>
            </form>
            ${
              liveSession
                ? `<div class="flash flash-neutral">Ja existe uma votacao em andamento no token <strong>${escapeHtml(liveSession.token)}</strong> para <strong>${escapeHtml(liveSession.voterType)}</strong>.</div>`
                : ""
            }
            <div class="empty-state">
              <strong>Fluxo da operacao</strong><br>
              1. Login do mesario. 2. Selecione o perfil do votante. 3. A urna abre nesta mesma tela. 4. Confirme o voto e o sistema volta para espera.
            </div>
          </article>

          <article class="table-card stack">
            <div class="status-strip">
              <span>
                <strong>Últimas sessões geradas</strong><br>
                <span class="subtle">Histórico rápido do próprio mesário, com token e situação de cada liberação.</span>
              </span>
            </div>
            ${
              sessions.length
                ? `
                  <div class="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Data/hora</th>
                          <th>Perfil do votante</th>
                          <th>Token</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${sessions
                          .map(
                            (session) => `
                              <tr>
                                <td>${formatDateTime(session.createdAt)}</td>
                                <td>${escapeHtml(session.voterType)}</td>
                                <td><code>${escapeHtml(session.token)}</code></td>
                                <td><span class="pill ${session.status === "Votou" ? "pill-voted" : "pill-awaiting"}">${session.status}</span></td>
                              </tr>
                            `,
                          )
                          .join("")}
                      </tbody>
                    </table>
                  </div>
                `
                : `<div class="empty-state">Nenhuma sessão de votação foi gerada por este mesário ainda.</div>`
            }
          </article>
        </section>
      </section>
    </main>
  `;
}

function renderBallotScreen() {
  const mesario = getCurrentAccess();
  const session = getActiveSession();
  if (!mesario || mesario.accessKind !== "MESARIO" || !session) {
    uiState.screen = "mesario";
    return renderMesarioScreen();
  }

  const unit = getUnitById(session.unitId);
  const candidate = getCurrentBallotCandidate();
  const unitCandidates = appState.candidates
    .filter((item) => item.unitId === session.unitId)
    .sort((left, right) => left.number.localeCompare(right.number));
  const digits = [
    uiState.ballotDigits[0] || "",
    uiState.ballotDigits[1] || "",
    uiState.ballotDigits[2] || "",
  ];

  let candidateContent = `<p class="subtle">Digite os 3 dígitos para localizar a chapa desta unidade escolar.</p>`;

  if (uiState.ballotBlank && uiState.ballotDigits.length === 0) {
    candidateContent = `
      <div class="vote-highlight blank">VOTO EM BRANCO</div>
      <p class="subtle">Ao confirmar agora, o registro será salvo como voto em branco.</p>
    `;
  } else if (uiState.ballotDigits.length === 3 && candidate) {
    candidateContent = `
      <div class="urna-callout">
        <div>
          <p class="subtle">Nome</p>
          <strong>${escapeHtml(candidate.name)}</strong>
          <p class="subtle">Unidade</p>
          <strong>${unit ? escapeHtml(unit.name) : "-"}</strong>
        </div>
        <img class="candidate-photo" src="${candidate.photoData}" alt="Foto da chapa ${escapeHtml(candidate.name)}">
      </div>
    `;
  } else if (uiState.ballotDigits.length === 3 && !candidate) {
    candidateContent = `
      <div class="vote-highlight null">VOTO NULO</div>
      <p class="subtle">Esse número não corresponde a nenhuma chapa desta unidade escolar.</p>
    `;
  }

  return `
    <main class="urna-shell">
      <div class="urna-topbar">
        <div class="badge">Mesário: ${escapeHtml(mesario.name)}</div>
        <div class="actions-row">
          <div class="badge">Perfil do votante: ${escapeHtml(session.voterType)}</div>
          <div class="badge">Token: ${escapeHtml(session.token)}</div>
          <button class="btn btn-neutral" type="button" data-action="return-operator">Voltar à operação</button>
        </div>
      </div>
      <section class="urna-card">
        <aside class="candidate-list-panel">
          <div class="candidate-list-header">
            <strong>Chapas da unidade</strong>
            <span class="subtle">${unit ? escapeHtml(unit.name) : "Unidade não identificada"}</span>
          </div>
          <div class="candidate-list">
            ${unitCandidates
              .map(
                (item) => `
                  <article class="candidate-list-item ${candidate && candidate.id === item.id ? "active" : ""}">
                    <img class="candidate-list-photo" src="${item.photoData}" alt="Foto da chapa ${escapeHtml(item.name)}">
                    <div class="candidate-list-copy">
                      <strong>${escapeHtml(item.number)}</strong>
                      <span>${escapeHtml(item.name)}</span>
                    </div>
                  </article>
                `,
              )
              .join("")}
          </div>
        </aside>
        <div class="urna-display">
          <p class="subtle">SEU VOTO PARA</p>
          <h1 class="panel-title">${unit ? escapeHtml(unit.officeTitle) : "DIRETOR"}</h1>
          <div class="digit-row">
            ${digits
              .map(
                (digit) => `
                  <div class="digit-box ${digit ? "" : "empty"}">${digit || ""}</div>
                `,
              )
              .join("")}
          </div>
          <div class="candidate-meta">${candidateContent}</div>
          ${uiState.ballotAlert ? `<div class="flash flash-neutral">${escapeHtml(uiState.ballotAlert)}</div>` : ""}
          <div class="urna-footer">
            <div>
              <strong>Unidade atual</strong>
              <p class="subtle">${unit ? escapeHtml(unit.name) : "Unidade não identificada"}</p>
            </div>
            <div>
              <strong>Perfil selecionado</strong>
              <p class="subtle">${escapeHtml(session.voterType)}</p>
            </div>
          </div>
        </div>
        <aside class="urna-keypad">
          <p>Teclado numérico</p>
          <div class="keypad-grid">
            ${[1, 2, 3, 4, 5, 6, 7, 8, 9, "", 0, ""]
              .map((value) =>
                value === ""
                  ? `<div></div>`
                  : `<button class="key" type="button" data-action="digit" data-value="${value}">${value}</button>`,
              )
              .join("")}
          </div>
          <div class="action-keys">
            <button class="action-key blank" type="button" data-action="blank">Branco</button>
            <button class="action-key correct" type="button" data-action="correct">Corrige</button>
            <button class="action-key confirm" type="button" data-action="confirm">Confirma</button>
          </div>
          <p class="keyboard-note">A urna aceita o teclado físico para os números e a tecla Enter para confirmar.</p>
        </aside>
      </section>
    </main>
  `;
}

function renderFinishScreen() {
  const session = getActiveSession();
  return `
    <main class="shell-simple">
      <section class="panel">
        <span class="eyebrow">Registro concluído</span>
        <h1 class="panel-title">FIM</h1>
        <p class="lead">
          ${session ? `O token <strong>${escapeHtml(session.token)}</strong> foi utilizado com sucesso.` : "A votação foi finalizada com sucesso."}
          Em instantes a aplicação retorna para a tela do mesário para iniciar um novo processo.
        </p>
        <div class="vote-highlight finish">FIM</div>
      </section>
    </main>
  `;
}

function renderAdminScreen() {
  const currentAccess = getCurrentAccess();
  if (!currentAccess || currentAccess.accessKind !== "ADMINISTRADOR") {
    uiState.screen = "login";
    return renderLoginScreen();
  }

  return `
    <main class="admin-shell">
      <section class="admin-layout">
        <header class="admin-header">
          <div>
            <span class="eyebrow">Área administrativa</span>
            <h1 class="headline" style="font-size: clamp(2rem, 3.2vw, 3.2rem); margin-bottom: 8px;">Gestão de mesários, chapas, tokens e resultados</h1>
            <p class="lead">Controle os acessos por unidade escolar, acompanhe as sessões geradas e consulte a apuração consolidada.</p>
          </div>
          <div class="actions-row">
            <div class="badge">${escapeHtml(currentAccess.email)}</div>
            <button class="btn btn-neutral" type="button" data-action="logout">Sair</button>
          </div>
        </header>

        <section class="summary-grid">
          ${renderAdminSummaryCards()}
        </section>

        <nav class="admin-tabs">
          ${renderTab("access", "Acessos")}
          ${renderTab("candidates", "Chapas")}
          ${renderTab("sessions", "Tokens")}
          ${renderTab("results", "Resultados")}
        </nav>

        ${renderAdminTabBody()}
      </section>
    </main>
  `;
}

function renderAdminSummaryCards() {
  const mesarios = appState.accessAccounts.filter((account) => account.accessKind === "MESARIO");
  const activeMesarios = mesarios.filter((account) => account.active).length;
  const pendingSessions = appState.votingSessions.filter((session) => session.status === "Aguardando").length;
  const usedSessions = appState.votingSessions.filter((session) => session.status === "Votou").length;
  const totalVotes = appState.votes.length;

  return [
    summaryCard("Mesários ativos", activeMesarios, "Acessos operacionais habilitados por unidade escolar."),
    summaryCard("Tokens aguardando", pendingSessions, "Sessões abertas que ainda não foram consumidas."),
    summaryCard("Tokens utilizados", usedSessions, "Sessões que já concluíram uma votação."),
    summaryCard("Votos gravados", totalVotes, "Registros válidos, nulos e em branco."),
  ].join("");
}

function renderTab(tabKey, label) {
  return `<button class="tab ${uiState.adminTab === tabKey ? "active" : ""}" type="button" data-action="open-tab" data-value="${tabKey}">${label}</button>`;
}

function renderAdminTabBody() {
  if (uiState.adminTab === "access") {
    return renderAccessTab();
  }
  if (uiState.adminTab === "candidates") {
    return renderCandidatesTab();
  }
  if (uiState.adminTab === "sessions") {
    return renderSessionsTab();
  }
  return renderResultsTab();
}

function renderAccessTab() {
  const editing = getActiveAccessEdit();
  const accounts = [...appState.accessAccounts].sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));

  return `
    <section class="admin-grid">
      <article class="form-card stack">
        <div>
          <h2 class="section-title">${editing ? "Editar acesso" : "Novo acesso"}</h2>
          <p class="subtle">Cadastre o administrador ou os mesários vinculados às unidades escolares.</p>
        </div>
        ${uiState.accessNotice ? `<div class="flash flash-neutral">${escapeHtml(uiState.accessNotice)}</div>` : ""}
        <form id="access-form" class="field-grid">
          <div class="field field-light">
            <label for="access-name">Nome do acesso</label>
            <input id="access-name" name="name" value="${escapeHtml(editing ? editing.name : "")}" placeholder="Ex.: Mesário 01" required>
          </div>
          <div class="field field-light">
            <label for="access-email">E-mail</label>
            <input id="access-email" name="email" type="email" value="${escapeHtml(editing ? editing.email : "")}" required>
          </div>
          <div class="field field-light">
            <label for="access-password">Senha</label>
            <input id="access-password" name="password" value="${escapeHtml(editing ? editing.password : "")}" required>
          </div>
          <div class="split-fields">
            <div class="field field-light">
              <label for="access-kind">Tipo de acesso</label>
              <select id="access-kind" name="accessKind">
                ${optionTag("ADMINISTRADOR", editing ? editing.accessKind : "MESARIO", "Administrador")}
                ${optionTag("MESARIO", editing ? editing.accessKind : "MESARIO", "Mesário")}
              </select>
            </div>
            <div class="field field-light">
              <label for="access-unit">Unidade escolar</label>
              <select id="access-unit" name="unitId">
                <option value="">Selecione</option>
                ${appState.units.map((unit) => optionTag(unit.id, editing ? editing.unitId : "", unit.name)).join("")}
              </select>
            </div>
          </div>
          <label class="status-strip">
            <span>
              <strong>Acesso ativo</strong><br>
              <span class="subtle">Contas inativas não conseguem entrar no sistema.</span>
            </span>
            <input type="checkbox" name="active" ${editing ? (editing.active ? "checked" : "") : "checked"}>
          </label>
          <div class="actions-row">
            <button class="btn btn-primary" type="submit">${editing ? "Salvar acesso" : "Criar acesso"}</button>
            <button class="btn btn-neutral" type="button" data-action="reset-form" data-value="access">Limpar formulário</button>
          </div>
        </form>
      </article>

      <article class="table-card stack">
        <div class="status-strip">
          <span>
            <strong>Lista de acessos</strong><br>
            <span class="subtle">Cada mesário deve estar vinculado à unidade escolar que filtrará as chapas na urna.</span>
          </span>
          <button class="btn btn-neutral" type="button" data-action="new-access">Novo acesso</button>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Tipo</th>
                <th>Unidade</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              ${accounts
                .map((account) => {
                  const unit = getUnitById(account.unitId);
                  return `
                    <tr>
                      <td><strong>${escapeHtml(account.name)}</strong></td>
                      <td>${escapeHtml(account.email)}</td>
                      <td>${escapeHtml(account.accessKind === "ADMINISTRADOR" ? "Administrador" : "Mesário")}</td>
                      <td>${unit ? escapeHtml(unit.name) : "-"}</td>
                      <td><span class="pill ${account.active ? "pill-voted" : "pill-inactive"}">${account.active ? "Ativo" : "Inativo"}</span></td>
                      <td>
                        <div class="inline-actions">
                          <button class="btn btn-neutral" type="button" data-action="edit-access" data-value="${account.id}">Editar</button>
                          <button class="btn ${account.active ? "btn-danger" : "btn-success"}" type="button" data-action="toggle-access" data-value="${account.id}">
                            ${account.active ? "Desativar" : "Ativar"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  `;
                })
                .join("")}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  `;
}

function renderCandidatesTab() {
  const editing = getActiveCandidate();
  const currentPhoto = uiState.tempCandidatePhoto || (editing ? editing.photoData : "");
  const candidates = [...appState.candidates].sort((left, right) => {
    const unitCompare = (getUnitById(left.unitId)?.name || "").localeCompare(getUnitById(right.unitId)?.name || "", "pt-BR");
    return unitCompare || left.number.localeCompare(right.number);
  });

  return `
    <section class="admin-grid">
      <article class="form-card stack">
        <div>
          <h2 class="section-title">${editing ? "Editar chapa" : "Nova chapa"}</h2>
          <p class="subtle">Cadastre o número de 3 dígitos, nome, unidade escolar e foto da chapa.</p>
        </div>
        ${uiState.candidateNotice ? `<div class="flash flash-neutral">${escapeHtml(uiState.candidateNotice)}</div>` : ""}
        <form id="candidate-form" class="field-grid">
          <div class="split-fields">
            <div class="field field-light">
              <label for="candidate-number">Número</label>
              <input id="candidate-number" name="number" inputmode="numeric" maxlength="3" value="${escapeHtml(editing ? editing.number : "")}" placeholder="101" required>
            </div>
            <div class="field field-light">
              <label for="candidate-unit">Unidade escolar</label>
              <select id="candidate-unit" name="unitId">
                ${appState.units.map((unit) => optionTag(unit.id, editing ? editing.unitId : "", unit.name)).join("")}
              </select>
            </div>
          </div>
          <div class="field field-light">
            <label for="candidate-name">Nome da chapa</label>
            <input id="candidate-name" name="name" value="${escapeHtml(editing ? editing.name : "")}" placeholder="Chapa Exemplo" required>
          </div>
          <div class="field field-light">
            <label for="candidate-photo">Foto da chapa</label>
            <input id="candidate-photo" type="file" accept="image/*">
          </div>
          ${currentPhoto ? `<img class="photo-preview" src="${currentPhoto}" alt="Prévia da chapa">` : ""}
          <div class="actions-row">
            <button class="btn btn-primary" type="submit">${editing ? "Salvar chapa" : "Cadastrar chapa"}</button>
            <button class="btn btn-neutral" type="button" data-action="reset-form" data-value="candidate">Limpar formulário</button>
          </div>
        </form>
      </article>

      <article class="table-card stack">
        <div class="status-strip">
          <span>
            <strong>Chapas cadastradas</strong><br>
            <span class="subtle">A unidade escolar é o filtro que determina quais opções aparecem na urna.</span>
          </span>
          <button class="btn btn-neutral" type="button" data-action="new-candidate">Nova chapa</button>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Unidade</th>
                <th>Número</th>
                <th>Nome</th>
                <th>Foto</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              ${candidates
                .map((candidate) => {
                  const unit = getUnitById(candidate.unitId);
                  return `
                    <tr>
                      <td>${unit ? escapeHtml(unit.name) : "-"}</td>
                      <td><strong>${escapeHtml(candidate.number)}</strong></td>
                      <td>${escapeHtml(candidate.name)}</td>
                      <td><img class="photo-preview" style="max-width: 88px;" src="${candidate.photoData}" alt="Foto da chapa ${escapeHtml(candidate.name)}"></td>
                      <td>
                        <div class="inline-actions">
                          <button class="btn btn-neutral" type="button" data-action="edit-candidate" data-value="${candidate.id}">Editar</button>
                          <button class="btn btn-danger" type="button" data-action="delete-candidate" data-value="${candidate.id}">Remover</button>
                        </div>
                      </td>
                    </tr>
                  `;
                })
                .join("")}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  `;
}

function renderSessionsTab() {
  const sessions = [...appState.votingSessions].sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));

  return `
    <section class="table-card stack">
      <div class="status-strip">
        <span>
          <strong>Controle de tokens gerados</strong><br>
          <span class="subtle">Acompanhe quem gerou a sessão, em qual unidade escolar e se o token já foi consumido.</span>
        </span>
      </div>
      ${
        sessions.length
          ? `
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Data/hora</th>
                    <th>Mesário</th>
                    <th>Unidade</th>
                    <th>Perfil do votante</th>
                    <th>Token</th>
                    <th>Status</th>
                    <th>Uso</th>
                  </tr>
                </thead>
                <tbody>
                  ${sessions
                    .map(
                      (session) => `
                        <tr>
                          <td>${formatDateTime(session.createdAt)}</td>
                          <td>${escapeHtml(session.mesarioName)}<br><span class="subtle">${escapeHtml(session.mesarioEmail)}</span></td>
                          <td>${escapeHtml(session.unitName)}</td>
                          <td>${escapeHtml(session.voterType)}</td>
                          <td><code>${escapeHtml(session.token)}</code></td>
                          <td><span class="pill ${session.status === "Votou" ? "pill-voted" : "pill-awaiting"}">${session.status}</span></td>
                          <td>${session.usedAt ? formatDateTime(session.usedAt) : "-"}</td>
                        </tr>
                      `,
                    )
                    .join("")}
                </tbody>
              </table>
            </div>
          `
          : `<div class="empty-state">Nenhum token foi gerado até o momento.</div>`
      }
    </section>
  `;
}

function renderResultsTab() {
  const filteredVotes = appState.votes.filter((vote) => {
    const unitMatch = !uiState.resultUnitFilter || vote.unitId === uiState.resultUnitFilter;
    const typeMatch = !uiState.resultTypeFilter || vote.voterType === uiState.resultTypeFilter;
    return unitMatch && typeMatch;
  });

  const validVotes = filteredVotes.filter((vote) => vote.voteType === "Válido");
  const blankVotes = filteredVotes.filter((vote) => vote.voteType === "Em Branco").length;
  const nullVotes = filteredVotes.filter((vote) => vote.voteType === "Nulo").length;

  const totals = new Map();
  validVotes.forEach((vote) => {
    const key = `${vote.unitId}:${vote.candidateNumber}`;
    if (!totals.has(key)) {
      totals.set(key, {
        unitId: vote.unitId,
        candidateNumber: vote.candidateNumber,
        candidateName: vote.candidateName,
        count: 0,
      });
    }
    totals.get(key).count += 1;
  });

  const sortedTotals = [...totals.values()].sort(
    (left, right) => right.count - left.count || left.candidateNumber.localeCompare(right.candidateNumber),
  );

  return `
    <section class="stack">
      <article class="table-card stack">
        <div class="status-strip">
          <span>
            <strong>Filtros de apuração</strong><br>
            <span class="subtle">Refine a leitura por unidade escolar e perfil do votante.</span>
          </span>
          <div class="filters-row">
            <div class="field field-light" style="min-width: 220px;">
              <label for="results-unit-filter">Unidade escolar</label>
              <select id="results-unit-filter">
                <option value="">Todas</option>
                ${appState.units.map((unit) => optionTag(unit.id, uiState.resultUnitFilter, unit.name)).join("")}
              </select>
            </div>
            <div class="field field-light" style="min-width: 220px;">
              <label for="results-type-filter">Perfil do votante</label>
              <select id="results-type-filter">
                <option value="">Todos</option>
                ${VOTER_TYPES.map((type) => optionTag(type, uiState.resultTypeFilter, type)).join("")}
              </select>
            </div>
            <button class="btn btn-neutral" type="button" data-action="clear-filters">Limpar filtros</button>
          </div>
        </div>

        <section class="results-grid">
          ${summaryCard("Votos filtrados", filteredVotes.length, "Total de registros dentro dos filtros atuais.")}
          ${summaryCard("Válidos", validVotes.length, "Votos atribuídos a chapas da unidade do mesário.")}
          ${summaryCard("Em branco", blankVotes, "Registros confirmados sem número digitado.")}
          ${summaryCard("Nulos", nullVotes, "Números sem correspondência nas chapas da escola.")}
        </section>
      </article>

      <article class="table-card stack">
        <div>
          <h2 class="section-title">Total por chapa</h2>
          <p class="subtle">Consolidação apenas dos votos válidos por unidade escolar e número da chapa.</p>
        </div>
        ${
          sortedTotals.length
            ? `
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Unidade</th>
                      <th>Número</th>
                      <th>Chapa</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${sortedTotals
                      .map(
                        (item) => `
                          <tr>
                            <td>${escapeHtml(getUnitById(item.unitId)?.name || "-")}</td>
                            <td><strong>${escapeHtml(item.candidateNumber)}</strong></td>
                            <td>${escapeHtml(item.candidateName || "-")}</td>
                            <td><strong>${item.count}</strong></td>
                          </tr>
                        `,
                      )
                      .join("")}
                  </tbody>
                </table>
              </div>
            `
            : `<div class="empty-state">Ainda não há votos válidos dentro dos filtros escolhidos.</div>`
        }
      </article>

      <article class="table-card stack">
        <div>
          <h2 class="section-title">Listagem detalhada de votos</h2>
          <p class="subtle">Cada linha mostra o token, o tipo do voto, a unidade, o perfil do votante e o mesário responsável pela sessão.</p>
        </div>
        ${
          filteredVotes.length
            ? `
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Data/hora</th>
                      <th>Token</th>
                      <th>Tipo do voto</th>
                      <th>Número</th>
                      <th>Chapa</th>
                      <th>Unidade</th>
                      <th>Perfil do votante</th>
                      <th>Mesário</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${filteredVotes
                      .map(
                        (vote) => `
                          <tr>
                            <td>${formatDateTime(vote.createdAt)}</td>
                            <td><code>${escapeHtml(vote.token)}</code></td>
                            <td>${escapeHtml(vote.voteType)}</td>
                            <td>${escapeHtml(vote.candidateNumber || "-")}</td>
                            <td>${escapeHtml(vote.candidateName || "-")}</td>
                            <td>${escapeHtml(vote.unitName)}</td>
                            <td>${escapeHtml(vote.voterType)}</td>
                            <td>${escapeHtml(vote.mesarioName)}<br><span class="subtle">${escapeHtml(vote.mesarioEmail)}</span></td>
                          </tr>
                        `,
                      )
                      .join("")}
                  </tbody>
                </table>
              </div>
            `
            : `<div class="empty-state">Nenhum voto encontrado para os filtros selecionados.</div>`
        }
      </article>
    </section>
  `;
}

function summaryCard(label, value, description) {
  return `
    <article class="summary-card">
      <small>${escapeHtml(label)}</small>
      <strong>${escapeHtml(value)}</strong>
      <span class="subtle">${escapeHtml(description)}</span>
    </article>
  `;
}

function optionTag(value, selectedValue, label) {
  return `<option value="${escapeHtml(value)}" ${value === selectedValue ? "selected" : ""}>${escapeHtml(label)}</option>`;
}

function slugify(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function makeId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function makeUniqueToken() {
  return makeUniqueTokenFromState(appState);
}

function makeUniqueTokenFromState(state) {
  let token = "";
  do {
    token = randomToken();
  } while (state.votingSessions.some((session) => session.token === token));
  return token;
}

function randomToken() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(8);
  if (window.crypto && typeof window.crypto.getRandomValues === "function") {
    window.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 255);
    }
  }

  return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join("");
}

function formatDateTime(isoString) {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "medium",
    }).format(new Date(isoString));
  } catch (error) {
    return isoString;
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
