# FIELD Engineering Guidelines

## Core principle

Prefer the simplest correct solution.

Do not optimize for writing less code at the expense of correctness.
Optimize for avoiding unnecessary code, abstractions, dependencies, and complexity.

Before implementing a solution, understand the existing code and actual data flow first.

## Implementation ladder

Before writing new code, check these options in order:

1. Does this need to exist at all?
2. Is the functionality already implemented somewhere in the codebase?
3. Can an existing component, hook, utility, service, schema, type, or API client be reused?
4. Can the standard library solve it?
5. Can the native browser, React, Next.js, NestJS, Prisma, or platform API solve it?
6. Can an already installed dependency solve it?
7. Can the requirement be implemented directly and clearly without a new abstraction?
8. Only then introduce new code or abstractions.

Stop at the first option that provides a clean and correct solution.

## Avoid over-engineering

Do not introduce abstractions for hypothetical future requirements.

Do not create factories, registries, managers, strategies, adapters, providers,
builders, generic engines, or base classes unless the current requirements
actually justify them.

Do not create an abstraction for a single implementation merely because another
implementation might exist in the future.

Prefer:

- simple functions over unnecessary classes;
- composition over inheritance;
- explicit code over clever generic systems;
- existing project patterns over introducing new architectural patterns;
- a small local solution over a framework built for one feature.

Do not duplicate logic just to preserve an abstraction.

## Reuse before creation

Before creating a new:

- React component;
- hook;
- utility;
- type;
- schema;
- DTO;
- service;
- API client;
- state store;
- helper;
- validation function;

search the repository for an existing implementation.

Extend or reuse existing code when doing so remains clear.

Do not create near-duplicate components or utilities.

## Dependencies

Do not install a new dependency unless it provides meaningful value that cannot
reasonably be achieved with:

1. the platform;
2. the framework;
3. an existing dependency;
4. a small maintainable implementation.

Before adding a dependency, explain why the existing stack is insufficient.

## Architecture

Preserve the existing architecture unless the task requires changing it.

Do not perform unrelated refactoring while implementing a feature.

Do not move files, rename modules, introduce new layers, or reorganize folders
unless necessary for the requested change.

Keep changes focused on the task.

## React / Next.js

Prefer built-in React and Next.js capabilities before introducing custom
infrastructure.

Avoid:

- unnecessary wrapper components;
- unnecessary context providers;
- state duplication;
- storing derived state;
- effects that can be replaced with direct computation;
- premature memoization;
- generic components created for one use case.

Keep server/client boundaries intentional.

Do not mark components with "use client" unless client-side behavior requires it.

## Backend / NestJS / Prisma

Keep controllers, services, DTOs, schemas, and database access straightforward.

Do not introduce repository layers or domain abstractions solely to wrap Prisma
unless there is a concrete architectural requirement.

Do not create service layers that merely forward arguments without adding
business logic.

Reuse existing validation and authorization mechanisms.

## Safety and correctness

Never remove or weaken the following merely to reduce code:

- authentication;
- authorization;
- input validation;
- error handling;
- data integrity protections;
- security checks;
- accessibility;
- required tests.

Simple does not mean careless.

## Testing

Test behavior that matters.

Prefer focused tests covering meaningful behavior and regressions.

Do not create tests whose only purpose is reproducing implementation details.

When modifying existing behavior, update relevant tests instead of duplicating
the test suite.

## Before finishing a task

Review the complete diff.

Check for:

1. code that is no longer needed;
2. duplicate logic;
3. unnecessary abstractions;
4. unnecessary files;
5. unnecessary dependencies;
6. unnecessary wrappers or indirection;
7. speculative future-proofing;
8. unrelated changes;
9. dead code;
10. debug code or temporary workarounds.

Simplify anything that can be simplified without reducing correctness,
maintainability, security, accessibility, or test coverage.

## Code review rule

When asked to review code or a diff, explicitly look for over-engineering.

Identify:

- what can be deleted;
- what can be replaced by existing code;
- abstractions that currently have no value;
- unnecessary dependencies;
- unnecessary layers of indirection;
- duplicate implementations;
- complexity introduced for hypothetical future requirements.

Do not propose rewrites merely for stylistic preference.