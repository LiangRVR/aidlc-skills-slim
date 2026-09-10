export type Risk = 'low' | 'standard' | 'high';

export type Stage =
  | 'requirements'
  | 'design'
  | 'plan'
  | 'implementation'
  | 'review'
  | 'verification'
  | 'final_acceptance'
  | 'complete';

export type Status =
  | 'active'
  | 'awaiting_approval'
  | 'approved_hold'
  | 'blocked'
  | 'awaiting_acceptance'
  | 'complete';

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

export interface AidlcState {
  schema_version: 1;
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

export interface NextDirective {
  stage: Stage;
  status: Status;
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
    | 'complete';
  allowed_events: string[];
  message: string;
}
