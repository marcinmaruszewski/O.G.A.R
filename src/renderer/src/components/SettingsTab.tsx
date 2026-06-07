import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface SectionStatus {
  saved: boolean;
  saving: boolean;
  validating: boolean;
  validateResult: { ok: boolean; error?: string } | null;
}

function useSectionStatus(): [SectionStatus, {
  setSaving: (v: boolean) => void;
  setSaved: (v: boolean) => void;
  setValidating: (v: boolean) => void;
  setValidateResult: (v: { ok: boolean; error?: string } | null) => void;
}] {
  const [status, setStatus] = useState<SectionStatus>({
    saved: false,
    saving: false,
    validating: false,
    validateResult: null,
  });
  return [
    status,
    {
      setSaving: (v) => setStatus((s) => ({ ...s, saving: v })),
      setSaved: (v) => setStatus((s) => ({ ...s, saved: v })),
      setValidating: (v) => setStatus((s) => ({ ...s, validating: v })),
      setValidateResult: (v) => setStatus((s) => ({ ...s, validateResult: v })),
    },
  ];
}

function SettingField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "password" | "url";
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded border border-border bg-background px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
      />
    </label>
  );
}

function SectionFooter({
  status,
  onSave,
  onValidate,
}: {
  status: SectionStatus;
  onSave: () => Promise<void>;
  onValidate?: () => Promise<void>;
}) {
  return (
    <div className="flex items-center gap-3 pt-1">
      <Button
        size="sm"
        disabled={status.saving}
        onClick={() => void onSave()}
      >
        {status.saving ? "Saving…" : "Save"}
      </Button>
      {onValidate && (
        <Button
          size="sm"
          variant="outline"
          disabled={status.validating}
          onClick={() => void onValidate()}
        >
          {status.validating ? "Validating…" : "Validate"}
        </Button>
      )}
      {status.saved && !status.saving && (
        <span className="text-xs text-green-600">Saved</span>
      )}
      {status.validateResult && (
        <span className={`text-xs ${status.validateResult.ok ? "text-green-600" : "text-destructive"}`}>
          {status.validateResult.ok ? "Connection OK" : (status.validateResult.error ?? "Connection failed")}
        </span>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}

async function saveSettings(pairs: Array<["setting" | "secret", string, string]>) {
  for (const [kind, key, value] of pairs) {
    if (kind === "setting") {
      await window.ogar.setSetting(key, value);
    } else {
      await window.ogar.setSecret(key, value);
    }
  }
}

export function SettingsTab() {
  const [jira, setJira] = useState({ baseUrl: "", email: "", token: "" });
  const [confluence, setConfluence] = useState({ baseUrl: "", email: "", token: "" });
  const [tempo, setTempo] = useState({ baseUrl: "", token: "" });
  const [git, setGit] = useState({ repoPath: "" });
  const [obsidian, setObsidian] = useState({ vaultPath: "" });
  const [llm, setLlm] = useState({ baseUrl: "", model: "" });

  const [jiraStatus, jiraActions] = useSectionStatus();
  const [confluenceStatus, confluenceActions] = useSectionStatus();
  const [tempoStatus, tempoActions] = useSectionStatus();
  const [gitStatus, gitActions] = useSectionStatus();
  const [obsidianStatus, obsidianActions] = useSectionStatus();
  const [llmStatus, llmActions] = useSectionStatus();

  useEffect(() => {
    void (async () => {
      const [
        jiraBaseUrl, jiraEmail, jiraToken,
        confluenceBaseUrl, confluenceEmail, confluenceToken,
        tempoBaseUrl, tempoToken,
        gitRepoPath,
        obsidianVaultPath,
        llmBaseUrl, llmModel,
      ] = await Promise.all([
        window.ogar.getSetting("jiraBaseUrl"),
        window.ogar.getSecret("jiraEmail"),
        window.ogar.getSecret("jiraToken"),
        window.ogar.getSetting("confluenceBaseUrl"),
        window.ogar.getSecret("confluenceEmail"),
        window.ogar.getSecret("confluenceToken"),
        window.ogar.getSetting("tempoBaseUrl"),
        window.ogar.getSecret("tempoToken"),
        window.ogar.getSetting("gitRepoPath"),
        window.ogar.getSetting("obsidianVaultPath"),
        window.ogar.getSetting("llmBaseUrl"),
        window.ogar.getSetting("llmModel"),
      ]);
      setJira({ baseUrl: jiraBaseUrl ?? "", email: jiraEmail ?? "", token: jiraToken ?? "" });
      setConfluence({ baseUrl: confluenceBaseUrl ?? "", email: confluenceEmail ?? "", token: confluenceToken ?? "" });
      setTempo({ baseUrl: tempoBaseUrl ?? "", token: tempoToken ?? "" });
      setGit({ repoPath: gitRepoPath ?? "" });
      setObsidian({ vaultPath: obsidianVaultPath ?? "" });
      setLlm({ baseUrl: llmBaseUrl ?? "", model: llmModel ?? "" });
    })();
  }, []);

  const saveJira = async () => {
    jiraActions.setSaving(true);
    jiraActions.setValidateResult(null);
    await saveSettings([
      ["setting", "jiraBaseUrl", jira.baseUrl],
      ["secret", "jiraEmail", jira.email],
      ["secret", "jiraToken", jira.token],
    ]);
    jiraActions.setSaving(false);
    jiraActions.setSaved(true);
  };

  const validateJira = async () => {
    jiraActions.setValidating(true);
    jiraActions.setValidateResult(null);
    try {
      await window.ogar.getMyOpenTickets();
      jiraActions.setValidateResult({ ok: true });
    } catch (e) {
      jiraActions.setValidateResult({ ok: false, error: e instanceof Error ? e.message : String(e) });
    } finally {
      jiraActions.setValidating(false);
    }
  };

  const saveConfluence = async () => {
    confluenceActions.setSaving(true);
    confluenceActions.setValidateResult(null);
    await saveSettings([
      ["setting", "confluenceBaseUrl", confluence.baseUrl],
      ["secret", "confluenceEmail", confluence.email],
      ["secret", "confluenceToken", confluence.token],
    ]);
    confluenceActions.setSaving(false);
    confluenceActions.setSaved(true);
  };

  const validateConfluence = async () => {
    confluenceActions.setValidating(true);
    confluenceActions.setValidateResult(null);
    try {
      await window.ogar.confluenceSearch("type=page order by lastmodified desc");
      confluenceActions.setValidateResult({ ok: true });
    } catch (e) {
      confluenceActions.setValidateResult({ ok: false, error: e instanceof Error ? e.message : String(e) });
    } finally {
      confluenceActions.setValidating(false);
    }
  };

  const saveTempo = async () => {
    tempoActions.setSaving(true);
    tempoActions.setValidateResult(null);
    await saveSettings([
      ["setting", "tempoBaseUrl", tempo.baseUrl],
      ["secret", "tempoToken", tempo.token],
    ]);
    tempoActions.setSaving(false);
    tempoActions.setSaved(true);
  };

  const validateTempo = async () => {
    tempoActions.setValidating(true);
    tempoActions.setValidateResult(null);
    const result = await window.ogar.tempoValidate();
    tempoActions.setValidateResult(result);
    tempoActions.setValidating(false);
  };

  const saveGit = async () => {
    gitActions.setSaving(true);
    await saveSettings([["setting", "gitRepoPath", git.repoPath]]);
    gitActions.setSaving(false);
    gitActions.setSaved(true);
  };

  const saveObsidian = async () => {
    obsidianActions.setSaving(true);
    await saveSettings([["setting", "obsidianVaultPath", obsidian.vaultPath]]);
    obsidianActions.setSaving(false);
    obsidianActions.setSaved(true);
  };

  const saveLlm = async () => {
    llmActions.setSaving(true);
    llmActions.setValidateResult(null);
    await saveSettings([
      ["setting", "llmBaseUrl", llm.baseUrl],
      ["setting", "llmModel", llm.model],
    ]);
    llmActions.setSaving(false);
    llmActions.setSaved(true);
  };

  const validateLlm = async () => {
    llmActions.setValidating(true);
    llmActions.setValidateResult(null);
    const result = await window.ogar.llmHealth();
    llmActions.setValidateResult(result.reachable ? { ok: true } : { ok: false, error: result.error });
    llmActions.setValidating(false);
  };

  return (
    <div className="flex w-full max-w-lg flex-col gap-4">
      <Section title="Jira">
        <SettingField label="Base URL" value={jira.baseUrl} onChange={(v) => setJira((s) => ({ ...s, baseUrl: v }))} type="url" placeholder="https://yourcompany.atlassian.net" />
        <SettingField label="Email" value={jira.email} onChange={(v) => setJira((s) => ({ ...s, email: v }))} placeholder="you@company.com" />
        <SettingField label="API Token" value={jira.token} onChange={(v) => setJira((s) => ({ ...s, token: v }))} type="password" placeholder="••••••••" />
        <SectionFooter status={jiraStatus} onSave={saveJira} onValidate={validateJira} />
      </Section>

      <Section title="Confluence">
        <SettingField label="Base URL" value={confluence.baseUrl} onChange={(v) => setConfluence((s) => ({ ...s, baseUrl: v }))} type="url" placeholder="https://yourcompany.atlassian.net/wiki" />
        <SettingField label="Email" value={confluence.email} onChange={(v) => setConfluence((s) => ({ ...s, email: v }))} placeholder="you@company.com" />
        <SettingField label="API Token" value={confluence.token} onChange={(v) => setConfluence((s) => ({ ...s, token: v }))} type="password" placeholder="••••••••" />
        <SectionFooter status={confluenceStatus} onSave={saveConfluence} onValidate={validateConfluence} />
      </Section>

      <Section title="Tempo">
        <SettingField label="Base URL" value={tempo.baseUrl} onChange={(v) => setTempo((s) => ({ ...s, baseUrl: v }))} type="url" placeholder="https://api.tempo.io/4" />
        <SettingField label="API Token" value={tempo.token} onChange={(v) => setTempo((s) => ({ ...s, token: v }))} type="password" placeholder="••••••••" />
        <SectionFooter status={tempoStatus} onSave={saveTempo} onValidate={validateTempo} />
      </Section>

      <Section title="Git">
        <SettingField label="Repository path" value={git.repoPath} onChange={(v) => setGit({ repoPath: v })} placeholder="/home/user/myproject" />
        <SectionFooter status={gitStatus} onSave={saveGit} />
      </Section>

      <Section title="Obsidian">
        <SettingField label="Vault path" value={obsidian.vaultPath} onChange={(v) => setObsidian({ vaultPath: v })} placeholder="/home/user/vault" />
        <SectionFooter status={obsidianStatus} onSave={saveObsidian} />
      </Section>

      <Section title="LLM">
        <SettingField label="Base URL" value={llm.baseUrl} onChange={(v) => setLlm((s) => ({ ...s, baseUrl: v }))} type="url" placeholder="http://localhost:11434" />
        <SettingField label="Model" value={llm.model} onChange={(v) => setLlm((s) => ({ ...s, model: v }))} placeholder="llama3.2" />
        <SectionFooter status={llmStatus} onSave={saveLlm} onValidate={validateLlm} />
      </Section>
    </div>
  );
}
