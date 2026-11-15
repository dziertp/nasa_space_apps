# NASA Space Apps Submission — Draft

**Working project name:** Health Monitoring Software  
**Status:** Draft; not submitted. Replace every TODO and verify the current submission form before use.

## Project summary

Health Monitoring Software is a local-first prototype for helping astronaut crews review health-related measurements and daily wellbeing records. Its current personal panel demonstrates how readings, trends, timestamps, data sources, and missing or stale data could be presented together. The demonstration uses a fictional crew member and synthetic data; it does not provide medical advice or clinical monitoring.

## Problem and intended users

During a space mission, crew members need practical ways to record and review health-related information and understand what data are available. This project is intended primarily for astronaut crew members working in mission environments where local access to information is valuable. Mission support teams may also be relevant users; confirm the intended audience with the team.

## Solution and functions

### Implemented in the current working branch

- A personal panel loads local demonstration scenarios through a FastAPI API.
- The panel displays three simulated measurements (heart rate, SpO2, and temperature) with units, timestamps, sources, and separate availability states: available, stale, or missing.
- A seven-day simulated sleep and perceived-fatigue history is shown alongside the measurements.
- Users can switch among three scenarios: **Stable readings**, **Reduced sleep and increasing fatigue**, and **Sensor signal loss**.
- API connectivity is shown independently from sensor-data availability. Missing readings remain null rather than being presented as zero.
- Local educational context links sleep and fatigue to NASA Risks and the local-first design choice to NASA Hazards.

The interface and scenario names are currently in Spanish. **TODO:** confirm the language and any subtitle requirements for the final presentation.

### Reported verification and remaining review

Project documentation reports a successful TypeScript/Vite build and seven passing backend tests covering the API and scenario data. These checks are recorded in the project documentation and were not rerun while preparing this draft. Visual review of the panel and accessibility review remain pending.

### Planned or out of scope for this prototype milestone

Guided measurement instructions, editable personal records, reminders, real sensor connections, real-time monitoring, and reviewed emergency guidance are not implemented in the current panel. Their scope and evidence should be updated if the project changes.

## Data and NASA sources

- **Synthetic demonstration data:** The three scenarios use a fictional crew member and mission. Their values were authored for demonstration with AI assistance; they are not NASA measurements, connected-sensor readings, or clinically validated thresholds.
- **NASA Risks of Human Spaceflight:** [https://www.nasa.gov/hrp/risks/](https://www.nasa.gov/hrp/risks/) informs the local educational context about sleep and fatigue. The choice of fields and their presentation are team design decisions.
- **NASA 5 Hazards of Human Spaceflight:** [https://www.nasa.gov/hrp/hazards/](https://www.nasa.gov/hrp/hazards/) informs the team's local-first design rationale. This is a design interpretation, not a NASA endorsement or certification.
- **OSD-575, SpaceX Inspiration4:** [NASA OSDR study page](https://osdr.nasa.gov/bio/repo/data/studies/OSD-575) is an additional scientific source. Its ISA metadata and CMP transformed CSV are available locally, but the results are not integrated into or displayed by this panel. Laboratory results are not continuous sensor telemetry.

**TODO:** Verify that at least one cited NASA page is included in the selected challenge's official Resources list, and confirm the applicable eligibility and citation requirements before submission.  
**TODO:** Add any other sources actually used and confirm the final data provenance with the team.

## Use of AI

The current project record identifies **ChatGPT**, **OpenAI Codex**, and **GitHub Copilot** as AI tools used. ChatGPT supported challenge interpretation, source discovery, planning, troubleshooting, and documentation drafting. OpenAI Codex assisted with the application code, tests, synthetic scenario data, and project documentation. GitHub Copilot reviewed project and submission documentation and prepared `docs/SUBMISSION_DRAFT.md` and `docs/DEMO_SCRIPT_DRAFT.md`. The scenario data record identifies AI assistance and describes the data as manually written synthetic fixtures.

**TODO:** Confirm this summary with all team members, add any other tools or AI-assisted materials, and complete any required submission metadata. Do not imply that AI-generated work received human review beyond what the team can verify.

## Limitations

This is a prototype and has no clinical validation. It does not diagnose, assess medical risk, or generate clinical alerts. All readings and histories in the panel are simulated. The stale-data rule and fatigue scale are demonstration choices, not clinical thresholds. No real sensors are connected, and the panel does not use OSD-575 laboratory results. The prototype does not replace professional medical judgment or mission-specific, approved protocols.

## Submission details to complete

- **TODO — Team members and required acknowledgements:** [names and required details]
- **TODO — Public project/repository URL accessible to judges:** [URL]
- **TODO — Demo video or presentation URL:** [URL]
- **TODO — Final submission URL and any required form fields:** [URL/details]
- **TODO — Final human review:** confirm application behavior, sources, AI disclosure, accessibility, and all claims against the submitted build.
