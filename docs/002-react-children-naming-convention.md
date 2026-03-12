## React Children Naming Convention 
**Date:** 2026-02-24

### Context
In React, content nested between component tags is passed via the special prop children. For example, `<Button>Login</Button>` passes "Login" as `props.children`. 

When making our reusable button components, we can either:

Keep the prop named children in the component signature, or

Locally rename it during destructuring (e.g., `({ children: label })`).

Our Button is a general-purpose wrapper and does not have multiple content “slots” (e.g., header/body/footer) or special semantics that would make a different name clearer.

### Decision
We will not locally rename children in our button components. We will consistently use:

`function Button({ children}) {...}`

rather than:

`function Button({ children: label}) {...}`

### Rationale
- Aligns with traditional React conventions: `children` is the standard name for nested content
- Improves readability for contributers: No need to map some name back to `children`
- Avoids misleading semantics: `children` implies any component can be passed on where as if we had something like `label` it is unclear if it is just text or something more.
- Consistency across the repository: by keeping it simple using just `children` we ensure this idea is easy to keep consistent across the code base.

### Tradeoffs
- Slightly less obvious on what exactly is passed into a parent component.

### Tradeoff Justification
- Currently components are simple enough where such definition can lead to confusion.
- Less questions about what can be passed into a component. Allows for more complex components to be passed.

### Future Improvement
- If later we introduce a component where there are specific slots we might need to add specific naming.
- Renaming children may be allowed in components where it materially increases clarity, such as:
- `Components with slot-like semantics (e.g., Tooltip({ children: trigger }))`
- `Components with multiple regions (e.g., Card({ header, children: body, footer }))`

