## API Client Design
**Date:** 2026-02-19

### Context
We need a simple frontend API wrapper to reduce repeated code 

### Decision
We use a generic `api(url, options)` wrapper instead of method specific functions

### Design Decision
- We allow a `...options` to support flexible request configurations

### Rationale
- This allows us to be flexible in the type of options we are able to pass in using `api()`
- It also allows us to move quickly as the current goal is to get a simple frontend running
- Also allows me to learn more about basic `fetch()` mechanics

### Tradeoffs
- Allows weird options to be passed into `fetch()`
- Hides bugs where a silent continue may happen (misspelled keys leading to default options)
- Missleading mental model (options that are valid may be passed where they aren't needed)

### Tradeoff Justification
- I am in control of all the calls, so I should be aware of what is needed
- This is not a inherit security issue, Weird keys do not get sent to the backend or modify anything.

### Future Improvement
- Should revisit when API gets confusing on what is allowed to be passed
- Consider refactoring `...options` to use explicit types.

