import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./supabase-config.js";

const STATE_TABLE = "urna_state";
const STATE_ID = "current";
const MAX_TRANSACTION_ATTEMPTS = 8;

let client = null;

function configurationError() {
  const error = new Error(
    "Preencha SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY em supabase-config.js.",
  );
  error.code = "SUPABASE_CONFIG_MISSING";
  return error;
}

function getClient() {
  if (client) {
    return client;
  }

  if (
    !SUPABASE_URL ||
    !SUPABASE_PUBLISHABLE_KEY ||
    SUPABASE_URL.includes("SEU-PROJETO") ||
    SUPABASE_PUBLISHABLE_KEY.includes("SUA-CHAVE")
  ) {
    throw configurationError();
  }

  if (!window.supabase?.createClient) {
    const error = new Error("A biblioteca do Supabase nao foi carregada.");
    error.code = "SUPABASE_CLIENT_MISSING";
    throw error;
  }

  client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  return client;
}

export function createEmptyElectionState() {
  return {
    settings: {
      title: "Urna Escolar",
    },
    units: [],
    accessAccounts: [],
    candidates: [],
    boothAssignments: [],
    votingSessions: [],
    votes: [],
  };
}

function normalizeElectionState(rawState) {
  const emptyState = createEmptyElectionState();
  if (!rawState || typeof rawState !== "object") {
    return emptyState;
  }

  return {
    settings:
      rawState.settings && typeof rawState.settings === "object"
        ? {
            ...emptyState.settings,
            ...rawState.settings,
          }
        : emptyState.settings,
    units: Array.isArray(rawState.units) ? rawState.units : [],
    accessAccounts: Array.isArray(rawState.accessAccounts) ? rawState.accessAccounts : [],
    candidates: Array.isArray(rawState.candidates) ? rawState.candidates : [],
    boothAssignments: Array.isArray(rawState.boothAssignments) ? rawState.boothAssignments : [],
    votingSessions: Array.isArray(rawState.votingSessions) ? rawState.votingSessions : [],
    votes: Array.isArray(rawState.votes) ? rawState.votes : [],
  };
}

function splitElectionState(state) {
  const normalized = normalizeElectionState(state);
  return {
    registry: {
      settings: normalized.settings,
      units: normalized.units,
      accessAccounts: normalized.accessAccounts,
      candidates: normalized.candidates,
    },
    voting: {
      boothAssignments: normalized.boothAssignments,
      votingSessions: normalized.votingSessions,
      votes: normalized.votes,
    },
  };
}

function mergeElectionState(registryState, votingState) {
  return normalizeElectionState({
    ...(registryState && typeof registryState === "object" ? registryState : {}),
    ...(votingState && typeof votingState === "object" ? votingState : {}),
  });
}

function cloneElectionState(state) {
  return JSON.parse(JSON.stringify(state));
}

function throwIfError(error) {
  if (error) {
    throw error;
  }
}

async function readStateRow() {
  const { data, error } = await getClient()
    .from(STATE_TABLE)
    .select("registry,voting,version")
    .eq("id", STATE_ID)
    .maybeSingle();

  throwIfError(error);
  return data;
}

export async function ensureElectionSeed(seedState) {
  const { registry, voting } = splitElectionState(seedState);
  const { error } = await getClient().rpc("ensure_urna_state", {
    p_registry: registry,
    p_voting: voting,
  });
  throwIfError(error);
}

export function subscribeToElectionState({ onChange, onReady, onError }) {
  let active = true;
  let didSignalReady = false;
  let channel = null;

  function emit(row) {
    if (!active || !row) {
      return;
    }

    const nextState = mergeElectionState(row.registry, row.voting);
    onChange(nextState);
    if (!didSignalReady) {
      didSignalReady = true;
      onReady?.(nextState);
    }
  }

  try {
    const supabaseClient = getClient();
    channel = supabaseClient
      .channel("urna-state-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: STATE_TABLE,
          filter: `id=eq.${STATE_ID}`,
        },
        (payload) => emit(payload.new),
      )
      .subscribe((status, error) => {
        if (error) {
          onError?.(error);
          return;
        }
        if (status === "SUBSCRIBED") {
          readStateRow().then(emit).catch((readError) => onError?.(readError));
          return;
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          const subscriptionError = new Error(`Falha no canal Realtime: ${status}`);
          subscriptionError.code = status;
          onError?.(subscriptionError);
        }
      });
  } catch (error) {
    queueMicrotask(() => onError?.(error));
  }

  return () => {
    active = false;
    if (channel && client) {
      client.removeChannel(channel);
    }
  };
}

export async function replaceElectionState(nextState) {
  return runElectionStateTransaction((draftState) => {
    const normalized = normalizeElectionState(nextState);
    Object.keys(draftState).forEach((key) => delete draftState[key]);
    Object.assign(draftState, normalized);
  });
}

export async function runElectionStateTransaction(mutator) {
  for (let attempt = 1; attempt <= MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
    const row = await readStateRow();
    if (!row) {
      const error = new Error("A base inicial do Supabase ainda nao foi criada.");
      error.code = "SUPABASE_STATE_MISSING";
      throw error;
    }

    const currentState = mergeElectionState(row.registry, row.voting);
    const draftState = cloneElectionState(currentState);
    const result = await mutator(draftState, currentState);
    const { registry, voting } = splitElectionState(draftState);
    const { data: updated, error } = await getClient().rpc("compare_and_set_urna_state", {
      p_expected_version: row.version,
      p_registry: registry,
      p_voting: voting,
    });

    throwIfError(error);
    if (updated === true) {
      return result;
    }
  }

  const error = new Error("A base foi alterada simultaneamente. Tente novamente.");
  error.code = "SUPABASE_CONFLICT";
  throw error;
}
