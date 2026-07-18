"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { OperationsCompany } from "@/lib/operations/command-center";
import {
  saveOperationsCompanyAction,
  saveOperationsContentAction,
  saveOperationsEventAction,
  saveOperationsTaskAction,
  updateOperationsAlertAction,
  type OperationsActionState,
} from "@/lib/operations/actions";

function SubmitButton({ children }: { children: React.ReactNode }) {
  const status = useFormStatus();
  return (
    <button
      type="submit"
      disabled={status.pending}
      className="min-h-11 rounded-full bg-[#1B2F5B] px-5 text-sm font-black text-white hover:bg-[#16284d] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {status.pending ? "Salvando..." : children}
    </button>
  );
}

function ActionFeedback({ state }: { state: OperationsActionState }) {
  if (state.ok && state.message)
    return <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-800">{state.message}</p>;
  if (!state.ok && state.error)
    return <p className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{state.error}</p>;
  return null;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1 text-sm font-bold text-slate-600">
      <span>{label}</span>
      {children}
    </label>
  );
}

const inputClass = "min-h-11 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-[#1B2F5B] outline-none focus:border-[#2ABFAB]";

export function CompanyOperationsForm({ company }: { company: OperationsCompany }) {
  const [state, action] = useActionState(saveOperationsCompanyAction, { ok: true } as OperationsActionState);
  return (
    <form action={action} className="grid gap-4 rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
      <input type="hidden" name="companySlug" value={company.slug} />
      <div>
        <p className="font-black text-[#1B2F5B]">Configuração operacional</p>
        <p className="mt-1 text-sm text-slate-500">Edita apenas campos não sensíveis da empresa interna.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Status interno">
          <select name="status" defaultValue={company.organizationStatus || "active"} className={inputClass}>
            <option value="active">Ativa</option>
            <option value="inactive">Inativa</option>
            <option value="suspended">Suspensa</option>
            <option value="archived">Arquivada</option>
          </select>
        </Field>
        <Field label="Responsável">
          <input name="responsible" className={inputClass} placeholder="Nome do responsável" />
        </Field>
        <Field label="E-mail público">
          <input name="email" className={inputClass} placeholder="contato@empresa.com" />
        </Field>
        <Field label="Telefone público">
          <input name="phone" className={inputClass} placeholder="(21) 99999-9999" />
        </Field>
        <Field label="Site público">
          <input name="websiteUrl" className={inputClass} placeholder="https://..." />
        </Field>
        <Field label="Horários">
          <input name="businessHours" className={inputClass} placeholder="Seg a sex, 9h às 18h" />
        </Field>
      </div>
      <Field label="Descrição operacional">
        <textarea name="description" className={inputClass} rows={3} placeholder="Resumo operacional para o Centro de Comando" />
      </Field>
      <Field label="Configurações operacionais não sensíveis">
        <textarea name="operationalSettings" className={inputClass} rows={3} placeholder="Regras internas, observações e preferências sem tokens" />
      </Field>
      <ActionFeedback state={state} />
      <SubmitButton>Salvar empresa</SubmitButton>
    </form>
  );
}

export function TaskOperationsForm({ companies }: { companies: OperationsCompany[] }) {
  const [state, action] = useActionState(saveOperationsTaskAction, { ok: true } as OperationsActionState);
  return (
    <form action={action} className="grid gap-4 rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
      <p className="font-black text-[#1B2F5B]">Nova tarefa</p>
      <div className="grid gap-3 md:grid-cols-2">
        <CompanySelect companies={companies} />
        <Field label="Título"><input name="title" required className={inputClass} /></Field>
        <Field label="Responsável"><input name="assignedTo" className={inputClass} /></Field>
        <Field label="Prioridade"><select name="priority" className={inputClass}><option value="normal">Normal</option><option value="high">Alta</option><option value="urgent">Urgente</option><option value="low">Baixa</option></select></Field>
        <Field label="Prazo"><input name="dueAt" type="datetime-local" className={inputClass} /></Field>
        <Field label="Status"><select name="status" className={inputClass}><option value="pending">Pendente</option><option value="in_progress">Iniciada</option><option value="blocked">Bloqueada</option><option value="completed">Concluída</option><option value="cancelled">Cancelada</option></select></Field>
      </div>
      <Field label="Descrição"><textarea name="description" className={inputClass} rows={3} /></Field>
      <ActionFeedback state={state} />
      <SubmitButton>Criar tarefa</SubmitButton>
    </form>
  );
}

export function EventOperationsForm({ companies }: { companies: OperationsCompany[] }) {
  const [state, action] = useActionState(saveOperationsEventAction, { ok: true } as OperationsActionState);
  return (
    <form action={action} className="grid gap-4 rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
      <p className="font-black text-[#1B2F5B]">Novo evento</p>
      <div className="grid gap-3 md:grid-cols-2">
        <CompanySelect companies={companies} />
        <Field label="Título"><input name="title" required className={inputClass} /></Field>
        <Field label="Tipo"><select name="eventType" className={inputClass}><option value="follow_up">Follow-up</option><option value="meeting">Reunião</option><option value="content">Conteúdo</option><option value="task">Tarefa</option><option value="internal">Interno</option></select></Field>
        <Field label="Responsável"><input name="assignedTo" className={inputClass} /></Field>
        <Field label="Início"><input name="startsAt" required type="datetime-local" className={inputClass} /></Field>
        <Field label="Fim"><input name="endsAt" type="datetime-local" className={inputClass} /></Field>
        <Field label="Local"><input name="location" className={inputClass} /></Field>
        <Field label="Status"><select name="status" className={inputClass}><option value="scheduled">Agendado</option><option value="in_progress">Em andamento</option><option value="completed">Concluído</option><option value="cancelled">Cancelado</option></select></Field>
      </div>
      <Field label="Descrição"><textarea name="description" className={inputClass} rows={3} /></Field>
      <ActionFeedback state={state} />
      <SubmitButton>Criar evento</SubmitButton>
    </form>
  );
}

export function ContentOperationsForm({ companies }: { companies: OperationsCompany[] }) {
  const [state, action] = useActionState(saveOperationsContentAction, { ok: true } as OperationsActionState);
  return (
    <form action={action} className="grid gap-4 rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
      <p className="font-black text-[#1B2F5B]">Conteúdo interno</p>
      <div className="grid gap-3 md:grid-cols-2">
        <CompanySelect companies={companies} />
        <Field label="Título"><input name="title" required className={inputClass} /></Field>
        <Field label="Fluxo"><select name="transition" className={inputClass}><option value="draft">Salvar rascunho</option><option value="review">Enviar para revisão</option><option value="approve">Aprovar internamente</option><option value="reject">Reprovar</option><option value="schedule">Programar internamente</option><option value="cancel_schedule">Cancelar programação</option></select></Field>
        <Field label="Programar para"><input name="scheduledAt" type="datetime-local" className={inputClass} /></Field>
      </div>
      <Field label="Texto"><textarea name="messageText" required className={inputClass} rows={4} /></Field>
      <Field label="Motivo da reprovação"><input name="reason" className={inputClass} /></Field>
      <ActionFeedback state={state} />
      <SubmitButton>Salvar conteúdo</SubmitButton>
    </form>
  );
}

export function AlertOperationsForm({ alertId }: { alertId: string }) {
  const [state, action] = useActionState(updateOperationsAlertAction, { ok: true } as OperationsActionState);
  return (
    <form action={action} className="mt-3 grid gap-2 rounded-2xl bg-slate-50 p-3">
      <input type="hidden" name="id" value={alertId} />
      <select name="status" className={inputClass}>
        <option value="acknowledged">Reconhecer</option>
        <option value="in_progress">Em tratamento</option>
        <option value="resolved">Resolver</option>
      </select>
      <input name="note" className={inputClass} placeholder="Observação sanitizada" />
      <ActionFeedback state={state} />
      <SubmitButton>Atualizar alerta</SubmitButton>
    </form>
  );
}

function CompanySelect({ companies }: { companies: OperationsCompany[] }) {
  return (
    <Field label="Empresa">
      <select name="companySlug" required className={inputClass}>
        {companies.filter((company) => company.organizationId).map((company) => <option key={company.slug} value={company.slug}>{company.name}</option>)}
      </select>
    </Field>
  );
}
