# Smart Roster Management System

DataStraw internship assessment by Raj Verma.

A browser app for planning a monthly operations roster. It shows who is working and which brand processes are short, and rechecks coverage when someone takes leave.

## Run it

1. Install Node.js 20 or newer.
2. Run `node serve.cjs` from the repository root.
3. Open [http://localhost:4173](http://localhost:4173).
4. Run `node --test engine.test.cjs` to verify the scheduler.

There are no package installs, API keys, build commands, or environment variables. To host it on a static host, publish the contents of `dist/`.

The Node server stores master data and plans in a central JSON file, `roster-data.json`. Open two tabs at the local URL to use the same saved roster. Revision checks prevent an older tab from overwriting a newer save. This server binds to the local machine and is intended for assessment.

On static hosting or when opening the portable HTML file, the demo uses localStorage. Each browser starts with its own fictional dataset and keeps its own draft and publish status. Settings  Reset sample data restores the December 2026 scenario. Use the demo with fictional information.

## Try it

1. Generate December 2026. Open **Pod** to see a pod lead and its team, and **Employee** to see individual availability.
2. In **Brand**, compare **True North** (Customer Support on Sundays and Christmas) with **Fern & Fig** (closed on both). Select **Olive Room** to see a Monday staffing minimum of two.
3. Select **Demonstrate leave change** from the Company view and save Meera Rao's leave for December 8. The Issues view shows gaps for Urban Loom Customer Support and Retention. Publish is disabled.
4. Review staffing for each gap. Select **Sana Ali (trained backup)** and save manual staffing for each process. The processes are in different windows, so one person can cover both. Blocking issues clear and Publish is enabled.
5. To try an overlap, assign Sana to another AM process in Settings, then manually schedule her on both AM processes for the same day. The validation view reports the overlap and any resulting shortage.

## Assumptions

- The fictional team has 32 employees, 25 brands, 5 pods and 4 process types. Twenty brands have one primary employee. Five brands have two or three primary employees. One of the single-primary brands also has a trained backup, who works primarily on another brand.
- A pod is an employee's home team and a brand belongs to one pod. A qualified employee can cover a brand in another pod. Pod leads are employees.
- Work is planned in two fixed half-day windows. Each person can cover one process in each window. A person doing two processes on the same day needs different windows. The tool does not model hourly intervals or workload within a half-day.
- A fixed weekly off, approved leave, approved comp-off, and an unavailable date all block assignment. A preferred extra day off is advisory. A public holiday closes only processes whose operating rules exclude it.
- A weekday override replaces the default minimum on an operating day. Zero closes that weekday. Holiday or Sunday closures take precedence.
- Designated backups need manager approval through manual staffing. Eligible, free backups appear on shortage rows. Preference ordering and reuse of prior staffing are heuristics within the coverage match.

## How I approached the problem

1. **Data model.** Employees and brands point to their pods. Rules link brands to process types and define calendars, working windows and minimum staffing. Resource assignments link employees to rules. Date overrides hold availability and monthly plans hold manual staffing choices and results.
2. **Generation and validation.** For each date and window the engine expands minimum coverage into staffing positions. It uses augmenting-path matching to fill as many automatic positions as possible using eligible primary employees. Manual choices are validated first and reserve their positions. The result checks every process minimum and reports preference warnings separately.
3. **Single and shared brands.** Both use the same rules. One person can cover several processes across two windows. Shared brands can spread distinct processes among employees or assign multiple qualified people to one rule with a larger minimum.
4. **Absent sole employee.** The system recalculates that date and flags every affected process. It shows the absence and any free trained backup. If no backup exists, a manager can add an eligible assignment or renegotiate the requirement.
5. **Infeasible staffing.** The engine leaves unmatched positions visible with assigned employees' absence or booking details. The browser prevents publishing as long as blocking issues remain.
6. **Automation and judgment.** Generation, coverage checks, and date rechecks run automatically. Managers control rules, bookings, backup use and publishing because those choices affect client commitments and staff workload.
7. **Twice the team size.** I would replace the JSON file with a relational database, index assignments by window and rule, paginate the roster, and move authoritative validation to the server.
8. **One more week.** I would build shared drafts with an edit history first. A pod lead and operations manager could then review the same version and see which change reopened a published roster.


