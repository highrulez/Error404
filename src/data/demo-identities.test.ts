import { strict as assert } from "node:assert";
import { DEMO_USERS } from "./auth-accounts";
import { DEFAULT_ASSIGNMENT_RULES, RESPONSIBLE_TEAMS } from "./checklist";
import { ADMIN_PROFILE, HIRING_MANAGER_PROFILE, profileForTeam } from "./demo-profiles";
import { createSeedStore } from "./seed";

assert.equal(ADMIN_PROFILE.name, "Goh, Shing Yee");
assert.equal(ADMIN_PROFILE.position, "Finance and Office Manager");
assert.equal(ADMIN_PROFILE.department, "Req Bus Sup MY Fin CR");
assert.equal(HIRING_MANAGER_PROFILE.name, "Suib, Ammar Zahiruddin");
assert.equal(HIRING_MANAGER_PROFILE.position, "IT Infrastructure Manager APAC - South");
assert.equal(HIRING_MANAGER_PROFILE.department, "IT Infrastructure Services");

assert.equal(profileForTeam("IT Security")?.name, "Mohd Azli, Amirul Mukhlis");
assert.equal(profileForTeam("Onsite IT Support")?.name, "Zulfikar Zikri, Nuqman Haziq");
assert.equal(profileForTeam("Hiring Manager")?.name, "Suib, Ammar Zahiruddin");

for (const rule of DEFAULT_ASSIGNMENT_RULES.filter((rule) => rule.assignedEmail)) {
  assert.notEqual(rule.assignedPersonName, rule.responsibleTeam);
}
assert.equal(
  DEFAULT_ASSIGNMENT_RULES.find((rule) => rule.taskName === "Create Network ID")?.assignedPersonName,
  "Mohd Azli, Amirul Mukhlis"
);
assert.equal(
  DEFAULT_ASSIGNMENT_RULES.find((rule) => rule.taskName === "Laptop Assigned")?.assignedPersonName,
  "Zulfikar Zikri, Nuqman Haziq"
);
assert.equal(DEMO_USERS.find((user) => user.role === "Admin")?.name, "Goh, Shing Yee");
assert.equal(
  DEMO_USERS.find((user) => user.role === "HIRING_MANAGER")?.name,
  "Suib, Ammar Zahiruddin"
);
assert.equal(DEMO_USERS.length, 10, "Only active demo accounts must be available for login");
assert.equal(RESPONSIBLE_TEAMS.length, 8, "Only active task-routing teams must be configured");

const obsolete = /Siti Aminah|Zulkarnain|Ariff bin Razak|Roslan bin Omar|Sarah Tan/;
assert.equal(DEMO_USERS.some((user) => obsolete.test(user.name)), false);
assert.equal(DEFAULT_ASSIGNMENT_RULES.some((rule) => obsolete.test(rule.assignedPersonName)), false);

const seed = createSeedStore();
assert.equal(
  seed.tasks.some((task) => task.assignedPersonName === task.responsibleTeam),
  false,
  "Seeded tasks must never use their responsible-team label as the assignee"
);
assert.equal(
  seed.tasks.find((task) => task.title === "Create Network ID")?.assignedPersonName,
  "Mohd Azli, Amirul Mukhlis"
);
assert.equal(
  seed.tasks.find((task) => task.title === "Laptop Assigned")?.assignedPersonName,
  "Zulfikar Zikri, Nuqman Haziq"
);
assert.equal(
  seed.tasks.find((task) => task.responsibleTeam === "Hiring Manager")?.assignedPersonName,
  "Suib, Ammar Zahiruddin"
);
assert.equal(
  seed.tasks.every((task) => RESPONSIBLE_TEAMS.includes(task.responsibleTeam)),
  true,
  "Every seeded task must route to an active team"
);

console.log("demo identity mapping tests passed");
