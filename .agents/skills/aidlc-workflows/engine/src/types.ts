export const ENGINE_VERSION = '0.2.0';

export type Risk = 'low' | 'standard' | 'high';

export type Stage =
  | 'requirements'
  | 'design'
  | 'plan'
  | 'implementation'
  | 'review'
  | 'verification'
  | 'final_acceptance'
  | 'complete'
  | 'cancelled';

export type Status =
  | 'active'
  | 'awaiting_approval'
  | 'approved_hold'
  | 'blocked'
  | 'awaiting_acceptance'
  | 'complete'
  | 'cancelled';

export type ProgressState = 'pending' | 'active' | 'complete' | 'skipped' | 'not_applicable';

export type GateType = 'planning' | 'final_acceptance';
export type GateStatus = 'open' | 'approved_hold' | 'satisfied' | 'rejected';

export interface WorkflowFlags {
  design_required: boolean;
  planning_gate_required: boolean;
  review_required: boolean;
  final_acceptance_required: boolean;
  security_required: boolean;
}

export interface Gate {
  type: GateType;
  status: GateStatus;
}

export interface Artifacts {
  request: string | null;
  requirements: string | null;
  design: string | null;
  plan: string | null;
  review: string | null;
  verification: string | null;
}

export interface Progress {
  requirements: ProgressState;
  design: ProgressState;
  plan: ProgressState;
  implementation: ProgressState;
  review: ProgressState;
  verification: ProgressState;
  final_acceptance: ProgressState;
}

export interface RequirementsReceipt {
  request_sha256: string;
  requirements_sha256: string;
  bundle_sha256: string;
  completed_at: string;
}

export interface DesignReceipt {
  requirements_sha256: string;
  design_sha256: string;
  bundle_sha256: string;
  completed_at: string;
}

export interface PlanReceipt {
  requirements_sha256: string;
  design_sha256: string | null;
  plan_sha256: string;
  bundle_sha256: string;
  completed_at: string;
}

export interface PlanningApprovalReceipt {
  plan_bundle_sha256: string;
  approved_at: string;
  continued_at: string | null;
}

export interface ImplementationReceipt {
  plan_bundle_sha256: string;
  source_digest: string;
  source_manifest_digest: string;
  captured_at: string;
}

export interface ReviewReceipt {
  source_digest: string;
  review_sha256: string;
  reviewed_at: string;
}

export type VerificationOutcome = 'PASS' | 'NOT_VERIFIED';

export interface VerificationReceipt {
  source_digest: string;
  verification_sha256: string;
  checks_config_sha256: string | null;
  evidence_digest: string;
  check_receipt_ids: string[];
  outcome: VerificationOutcome;
  verified_at: string;
}

export interface FinalAcceptanceReceipt {
  source_digest: string;
  verification_evidence_digest: string;
  accepted_at: string;
}

export interface FreshnessReceipts {
  requirements: RequirementsReceipt | null;
  design: DesignReceipt | null;
  plan: PlanReceipt | null;
  planning_approval: PlanningApprovalReceipt | null;
  implementation: ImplementationReceipt | null;
  review: ReviewReceipt | null;
  verification: VerificationReceipt | null;
  final_acceptance: FinalAcceptanceReceipt | null;
}

export interface AidlcState {
  schema_version: 3;
  engine_version: string;
  revision: number;
  active_change: string | null;
  risk: Risk;
  risk_rationale: string;
  workflow: WorkflowFlags;
  stage: Stage;
  status: Status;
  gate: Gate | null;
  artifacts: Artifacts;
  progress: Progress;
  blockers: string[];
  evidence_path: string | null;
  freshness: FreshnessReceipts;
}

export type LifecycleEvent =
  | 'requirements_complete'
  | 'design_complete'
  | 'plan_complete'
  | 'approve'
  | 'continue'
  | 'request_changes'
  | 'implementation_complete'
  | 'review_pass'
  | 'review_fail'
  | 'verification_complete'
  | 'accept';

export interface InitInput {
  active_change: string;
  risk: Risk;
  risk_rationale: string;
  workflow: WorkflowFlags;
  request: string;
}

export interface FreshnessIssue {
  dependency: 'requirements' | 'design' | 'plan' | 'planning_approval' | 'implementation' | 'review' | 'verification' | 'final_acceptance';
  message: string;
}

export interface NextDirective {
  stage: Stage;
  status: Status;
  revision: number;
  action:
    | 'write_requirements'
    | 'write_design'
    | 'write_plan'
    | 'await_planning_decision'
    | 'await_continue'
    | 'implement_plan'
    | 'perform_review'
    | 'verify_change'
    | 'await_final_acceptance'
    | 'resolve_blockers'
    | 'reconcile_freshness'
    | 'complete'
    | 'cancelled';
  allowed_events: string[];
  message: string;
  freshness_issues?: FreshnessIssue[];
}

export interface SourceRecord {
  status: string;
  path: string;
  previous_path: string | null;
  sha256: string | null;
}

export interface SourceSnapshot {
  snapshot_version: 1;
  mode: 'git';
  captured_at: string;
  base_tree: string;
  digest: string;
  records: SourceRecord[];
}

export interface SourceManifestEntry {
  status: 'added' | 'modified' | 'deleted' | 'renamed' | 'changed';
  path: string;
  previous_path: string | null;
  sha256: string | null;
}

export interface CheckDefinition {
  command: string[];
  required: boolean;
  timeout_ms?: number;
  cwd?: string;
}

export interface ChecksConfig {
  schema_version: 1;
  checks: Record<string, CheckDefinition>;
}

export type CheckResult = 'PASS' | 'FAIL' | 'STALE';

export interface CheckReceipt {
  receipt_id: string;
  name: string;
  command: string[];
  cwd: string;
  started_at: string;
  duration_ms: number;
  exit_code: number | null;
  timed_out: boolean;
  result: CheckResult;
  source_digest_before: string;
  source_digest_after: string;
  stdout_sha256: string;
  stderr_sha256: string;
  stdout_bytes: number;
  stderr_bytes: number;
}

export interface EvidenceDocument {
  evidence_version: 1;
  active_change: string;
  source: {
    baseline: SourceSnapshot | null;
    latest: SourceSnapshot | null;
    manifest: SourceManifestEntry[];
    manifest_digest: string | null;
    unavailable_reason: string | null;
  };
  checks: CheckReceipt[];
}

export interface DoctorCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
}

export interface DoctorReport {
  ok: boolean;
  engine_version: string;
  repaired: string[];
  checks: DoctorCheck[];
  state?: {
    schema_version: number;
    revision?: number;
    active_change?: string | null;
    stage?: string;
    status?: string;
  };
}
