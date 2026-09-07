# Security Policy

Xurface sits between AI agents and real-world consequences, so we take security
seriously and appreciate responsible disclosure.

## Reporting a vulnerability

**Please do not open a public issue for security vulnerabilities.**

Email `digital@500xlaunch.com` with:

- a description of the issue and its impact,
- steps to reproduce (a proof of concept if possible),
- any suggested remediation.

We will acknowledge your report, keep you updated on progress, and credit you once a
fix ships, unless you prefer to remain anonymous.

## Scope

This repository holds the public interface: SDKs, the Discernment Event
specification, skills and examples. Reports about the hosted Horizon platform,
Xurface Discern, or the infrastructure are equally welcome at the same address.

## Principles

- No raw secret should ever be required by, or committed to, this repository.
- Decision tokens are audience-bound, key-bound and short-lived.
- Every discernment is a signed, hash-chained audit event that can be verified
  independently.
