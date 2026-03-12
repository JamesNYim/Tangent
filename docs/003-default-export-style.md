# 003 – Default Export Style for React Modules
Date: 2026-02-24

## Context
In our React codebase, we frequently export components as the module’s default export. There are two common patterns:

Inline default export:

    export default function LoginButton(props) {
        ...
    }

Separate declaration + default export:

    function LoginButton(props) {
        ...
    }

    export default LoginButton;

Both approaches are functionally equivalent. This ADR establishes a consistent export style across the codebase.

## Decision
We will use separate function declarations and export the default at the bottom of the file:

    function LoginButton(props) {
        ...
    }

    export default LoginButton;

We will avoid inline default exports such as:

    export default function LoginButton(props) {
        ...
    }

## Rationale
- Consistency across the repository: A single export pattern reduces stylistic variation and makes files easier to scan.
- Clear module structure: Separating declaration from export improves readability and keeps module structure predictable.
- Scales better for growth: When adding named exports (helpers, hooks, constants), keeping exports grouped at the bottom reduces churn and improves organization.
- Refactor-friendly: Changing export strategy later (e.g., converting to named exports) is simpler when the function declaration is independent.
- Predictable file layout: Establishes a consistent pattern: imports → declarations → exports.

## Tradeoffs
- Slightly more verbose (one additional line).
- Very small single-export files may feel marginally heavier.

## Tradeoff Justification
The additional line of code is negligible compared to the benefits of structural consistency, maintainability, and scalability as the codebase grows.

## Future Considerations
This convention applies to:

- React components
- Custom hooks
- Utility modules
- Any module using a default export


