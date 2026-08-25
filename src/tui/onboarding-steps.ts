export interface OnboardingInput {
  models: readonly { model: string; health: string; verifiedAt: string | null }[];
  tasks: readonly unknown[];
  strategyItems: readonly unknown[];
  artifacts: readonly unknown[];
}

export interface OnboardingStep {
  label: string;
  done: boolean;
  hint: string;
}

export function onboardingSteps(data: OnboardingInput): OnboardingStep[] {
  const configuredModels = data.models.filter(({ model }) => model !== "unconfigured");
  const verifiedModels = data.models.filter(
    ({ health, verifiedAt }) => health === "healthy" && verifiedAt !== null,
  );
  const hasWork = data.tasks.length > 0 || data.strategyItems.length > 0;
  return [
    {
      label: "Configure a model",
      done: configuredModels.length > 0,
      hint: "Models & engines · n",
    },
    {
      label: "Verify the model",
      done: verifiedModels.length > 0,
      hint: "select it · v",
    },
    {
      label: "Describe work",
      done: hasWork,
      hint: "Objectives or Tasks · n",
    },
    {
      label: "Run a task and inspect its deliverable",
      done: data.artifacts.length > 0,
      hint: "Tasks · select · r",
    },
  ];
}

export function onboardingComplete(steps: OnboardingStep[]): boolean {
  return steps.every(({ done }) => done);
}
