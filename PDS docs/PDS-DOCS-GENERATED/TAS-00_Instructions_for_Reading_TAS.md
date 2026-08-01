# Instructions for Reading TAS Documents

The Technical Architecture Specification (TAS) is the official architectural blueprint for TenoPilot.

Please read each TAS chapter sequentially and treat every approved chapter as a permanent architectural decision.

Important Guidelines:

- Do not implement code while reading TAS documents.
- Use these documents only to understand and lock the architecture.
- Each chapter builds upon previously approved chapters.
- Never contradict or redesign decisions made in earlier chapters unless explicitly instructed.
- If a future chapter references an earlier decision, always follow the earlier approved architecture.
- Treat all approved architecture decisions as the source of truth for future implementation.

The purpose of TAS is to establish:

- Overall application architecture
- Module boundaries
- Folder organization
- Layer responsibilities
- Communication between modules
- Scalability strategy
- Performance strategy
- Security foundation
- Development standards

Do not suggest alternative architectures unless a significant scalability, security, maintainability, or performance issue is identified.

After all TAS chapters are completed and approved, the architecture should be considered LOCKED and all future development must strictly follow it.
