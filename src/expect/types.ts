// === Test plan types ===

export type TestAction =
  | "navigate"
  | "click"
  | "fill"
  | "assert"
  | "wait"
  | "screenshot"
  | "hover"
  | "select";

export type TestStep = {
  id: string;
  description: string;
  action: TestAction;
  target?: string;
  value?: string;
  timeout?: number;
};

export type TestPlan = {
  id: string;
  title: string;
  description: string;
  steps: TestStep[];
  baseUrl: string;
  createdAt: number;
};

// === Execution results ===

export type StepResult = {
  stepId: string;
  status: "passed" | "failed" | "skipped";
  duration: number;
  error?: string;
  screenshot?: string;
};

export type TestReport = {
  planId: string;
  status: "passed" | "failed" | "error";
  results: StepResult[];
  duration: number;
  summary: string;
  timestamp: number;
};

// === Git diff types ===

export type ChangedFile = {
  path: string;
  status: "added" | "modified" | "deleted" | "renamed";
  additions: number;
  deletions: number;
  diff: string;
};

// === Configuration ===

export type ExpectConfig = {
  baseUrl: string;
  timeout: number;
  headless: boolean;
  cookies: boolean;
  recording: boolean;
  provider: "anthropic" | "openai" | "gemini";
  message?: string;
  ci: boolean;
  ciTimeout: number;
};

// === Event emitted to svibe's collector ===

export type ExpectEvent = {
  type: "expect";
  planId: string;
  status: TestReport["status"];
  passed: number;
  failed: number;
  total: number;
  duration: number;
  timestamp: number;
};
