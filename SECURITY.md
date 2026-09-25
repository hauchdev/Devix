# Security Policy

## Supported versions

The project is under active pre-1.0 development. Vulnerabilities are only fixed on the latest version of `main`.

| Version         | Supported |
| --------------- | --------- |
| `main` (latest) | ✅        |
| Other           | ❌        |

## Reporting a vulnerability

If you find a vulnerability in Devix or any of its packages:

1. **Do not open a public issue.**
2. Use the **Security → Report a vulnerability** tab (private advisory) on [hauchdev/Devix](https://github.com/hauchdev/Devix/security/advisories), or email **hauch8bingo@proton.me**.
3. Include: description, reproduction steps, impact and, if possible, a proof of concept.

## What to expect

- **Acknowledgment:** within 72 hours.
- **Assessment and fix plan:** in about a week.
- **Publication:** the fix will be released and the vulnerability documented (with credit to the reporter, if desired) once resolved.

## Scope

In scope: unexpected code execution, information disclosure, external process manipulation (`@devix-cli/shell`), path traversal (`@devix-cli/filesystem`), injection through config files (`@devix-cli/config`), and any bypass of the documented security guarantees of the packages.

Out of scope: vulnerabilities in dependencies without concrete exploitation through Devix, hardening issues with no demonstrable impact, and attacks that require prior control of the user's environment.
