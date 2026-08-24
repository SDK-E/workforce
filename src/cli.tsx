import React from "react";
import { render } from "ink";
import { dockerStatus } from "./docker-runtime.js";
import { StateStore } from "./storage/state-store.js";
import { WorkforceApp } from "./tui/workforce-app.js";

const store = new StateStore();
await store.initialize();

const company =
  store.companies()[0] ??
  store.createCompany({
    id: "default",
    name: "Default Company",
    mission: "Build a dependable company with verified outcomes.",
  });

render(<WorkforceApp store={store} docker={await dockerStatus()} initialCompany={company} />);
