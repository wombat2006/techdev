# Tech Stack Decision: AWS for Peripheral Services

**Status**: Accepted (direction) — implementation TBD  
**Date**: 2026-06-17  
**Deciders**: TechSapo Development Team  
**Workspace ID**: TS-13

---

## Context

Surrounding / platform capabilities (email, object storage, secret and key management) need a consistent cloud baseline. Core Wall-Bounce and LLM orchestration remain on existing CLI/SDK patterns; **peripheral features standardize on AWS**.

Related: [TECH_STACK_WORKSPACE.md](../TECH_STACK_WORKSPACE.md)

---

## AS-IS

| Capability | AS-IS | Notes |
|------------|-------|-------|
| Email | Not integrated | No transactional mail service |
| Object storage | Local / Google Drive (RAG) | No S3 usage in app code |
| Secrets | Env vars, CLI auth for LLMs | LLM API keys forbidden in code/env by policy |
| Key management | None centralized | — |
| Deployment | systemd on host | AWS compute model TBD (TS-08) |

---

## Decision

**Peripheral / surrounding features use AWS by default.**

| Capability | AWS service | Scope |
|------------|-------------|--------|
| **Email** | **Amazon SES** | Transactional mail, alerts, notifications |
| **Object storage** | **Amazon S3** | Exports, artifacts, static assets, backup blobs; optional RAG document staging |
| **Secrets** | **AWS Secrets Manager** | App config secrets (DB URLs, webhook tokens, third-party non-LLM credentials) |
| **Encryption keys** | **AWS KMS** | Encrypt Secrets Manager secrets, S3 SSE-KMS where required |

### Boundaries (unchanged)

- **LLM providers**: Antigravity CLI (`agy`), Codex CLI, Anthropic SDK — **no LLM API keys in Secrets Manager for direct inference**
- **Wall-Bounce core**: Runs in application runtime; AWS is not a replacement for multi-LLM orchestration
- **Redis / session cache**: Remains separate decision (TS-03); may be ElastiCache later but not part of this ADR

### SDK / access pattern (target)

- Use AWS SDK v3 (`@aws-sdk/client-*`) with IAM roles (EC2/ECS/Lambda) or named profiles in dev
- Prefer **IAM least privilege** per service (SES send, S3 bucket prefix, `secretsmanager:GetSecretValue`, `kms:Decrypt`)
- **Primary region (placeholder):** `ap-northeast-1` (Asia Pacific — Tokyo). All peripheral AWS resources default to this region until TS-14 is fully finalized.

### Placeholders (2026-06-17)

| Item | Placeholder value | Notes |
|------|-------------------|--------|
| AWS region | `ap-northeast-1` | Tokyo — provisional; change via TS-14 ADR if needed |
| SES sending domain | `notify.techsapo.example` | **Virtual** domain (RFC 2606 `.example`); not for production mail |
| Default From address | `noreply@notify.techsapo.example` | Replace with verified domain before go-live |
| Configuration env | `AWS_REGION=ap-northeast-1` | App config when SDK is added |
| SES config env | `SES_FROM_ADDRESS=noreply@notify.techsapo.example` | App config when SES is integrated |

S3 bucket names and KMS key aliases remain TBD (TS-16). Use region prefix in names when defined, e.g. `techsapo-ap-northeast-1-artifacts` (placeholder pattern only).

---

## Options Considered

| Option | Pros | Cons |
|--------|------|------|
| **AWS peripheral (chosen)** | Single vendor for mail/storage/secrets; KMS integration; enterprise familiarity | Vendor lock-in for peripherals; IAM setup required |
| Self-hosted (Postfix, MinIO, Vault) | Full control | Ops burden; diverges from team direction |
| Multi-cloud | Flexibility | Complexity; not requested |

---

## Consequences

### Positive

- Unified ops model for notifications, files, and non-LLM secrets
- Aligns with KMS-backed encryption for compliance-sensitive deployments
- Clear split: **AWS = platform peripherals**, **CLI/SDK = LLM**

### Negative / trade-offs

- AWS account, IAM, and SES sandbox/production setup required before go-live
- Local dev needs LocalStack or scoped dev buckets/roles (TBD in TS-14)
- `@aws-sdk/*` dependencies not yet in `package.json`

### Follow-up tasks

- [ ] TS-08: Compute/deployment on AWS vs hybrid with existing systemd
- [x] TS-14 (partial): Primary region **`ap-northeast-1` (Tokyo)** — placeholder; IAM roles / account layout still TBD
- [x] TS-15 (partial): SES From domain **`notify.techsapo.example`** — virtual placeholder; DKIM / bounce handling before production
- [ ] TS-16: S3 bucket layout, lifecycle, SSE-KMS policy
- [ ] Add `@aws-sdk/client-s3`, `client-ses`, `client-secrets-manager` when implementing
- [ ] Update DEPLOYMENT_GUIDE with AWS prerequisites

---

## Sync Required

- [x] `docs/TECH_STACK_WORKSPACE.md` — AWS peripheral section + backlog
- [ ] `docs/ARCHITECTURE.md` — peripheral services diagram (stub added)
- [ ] `README.md` + `README_ja.md` — when implementation starts
- [ ] `CLAUDE.md` — if security rule text changes

---

## References

- [SECURITY.md](../SECURITY.md) — LLM CLI/SDK-only policy
- [ARCHITECTURE.md](../ARCHITECTURE.md)
- [Amazon SES](https://docs.aws.amazon.com/ses/)
- [Amazon S3](https://docs.aws.amazon.com/s3/)
- [AWS Secrets Manager](https://docs.aws.amazon.com/secretsmanager/)
- [AWS KMS](https://docs.aws.amazon.com/kms/)
