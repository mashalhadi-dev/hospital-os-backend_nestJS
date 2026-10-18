<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## HealthNode backend configuration

The API reads configuration through NestJS `ConfigService`. Set these values in
the deployment environment (or a local, uncommitted `.env` file); do not commit
secrets:

| Variable                                        | Required         | Purpose                                                                                              |
| ----------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------- |
| `PORT`                                          | Yes              | HTTP listener port                                                                                   |
| `CORS_ORIGINS`                                  | Yes              | Comma-separated explicit frontend origins, for example `http://localhost:3001` for local development |
| `DATABASE_URL`                                  | Yes              | Prisma PostgreSQL connection URL                                                                     |
| `DIRECT_URL`                                    | Yes              | Direct PostgreSQL connection URL for Prisma migrations                                               |
| `JWT_SECRET`                                    | Yes              | Signing key with at least 32 UTF-8 bytes                                                             |
| `JWT_EXPIRES_IN_SECONDS`                        | No               | Token lifetime; defaults to 3600 seconds                                                             |
| `REDIS_URL`                                     | One Redis option | Redis connection URL (`redis:` or `rediss:`)                                                         |
| `REDIS_HOST`, `REDIS_PORT`                      | One Redis option | Host and port when `REDIS_URL` is not set                                                            |
| `REDIS_USERNAME`, `REDIS_PASSWORD`, `REDIS_TLS` | No               | Credentials and TLS option for host/port connections                                                 |
| `STAFF_REGISTRATION_SECRET`                     | For staff signup | Shared secret required to register doctors, nurses, and receptionists                                |
| `GEMINI_API_KEY`, `GEMINI_MODEL`                | For AI endpoints | Google Gemini SDK credentials and model name                                                         |
| `API_BASE_URL`, `E2E_TEST_PASSWORD`             | E2E script only  | Backend URL and disposable password for synthetic role accounts                                      |
| `E2E_ALLOW_DATABASE_WRITES`                     | E2E script only  | Must be explicitly set to `true` before the script writes synthetic users and clinical test records  |
| `RUN_GEMINI_E2E`                                | E2E script only  | Set to `true` to send synthetic prompts to Gemini; otherwise only AI role restrictions are checked   |

Redis connections retry in the background and do not prevent the HTTP server
from starting when Redis is temporarily unavailable. `rediss://` URLs and
`*.upstash.io` hosts automatically enable TLS.

Patient self-registration creates a linked patient profile. Doctor, nurse, and
receptionist registration also creates the corresponding linked profile and
requires `STAFF_REGISTRATION_SECRET`; public administrator registration is
rejected. Provision administrator accounts through a trusted process. JWT
authentication and role checks protect profile, appointment, billing,
pharmacy, prescription, and AI endpoints. AI output is a clinical drafting aid
and must be reviewed by a qualified clinician.

The API exposes `/auth/register` and `/auth/login`; role profiles at
`/doctors`, `/nurses`, `/receptionists`, and `/patients`; appointment workflows
at `/appointments`; patient-scoped invoice reads and billing desk actions at
`/billing`; medicines and prescriptions at `/medicines` and `/prescriptions`;
nurse-recorded vitals and medication administration at `/nurses/vitals`,
`/nurses/medication-orders`, and `/nurses/medication-administrations`; public
doctor booking choices at `/doctors/availability`; and authorized medical-history synthesis at
`/ai/summarize`, clinical-note drafting at `/ai/clinical-draft`, and
patient-scoped co-pilot chat at `/ai/copilot`. Nurses can use `/ai/nurse-copilot`
only for patients with their own documented vitals or medication-administration
record; its context is limited to nursing workflows. Receptionists can use
`/ai/receptionist-copilot` with predefined administrative template tasks only;
that endpoint accepts no patient ID or free-text prompt. Configure `GEMINI_MODEL` to a
model currently enabled for the configured Gemini API key; model availability
can change independently of the SDK.

Run the role integration test from the backend directory with
`node scripts/e2e-roles-test.mjs`. It requires the backend to be running and
valid `DATABASE_URL`, `STAFF_REGISTRATION_SECRET`, `API_BASE_URL`, and
`E2E_TEST_PASSWORD` values. The script will refuse to write any records unless
`E2E_ALLOW_DATABASE_WRITES=true`; it creates timestamped synthetic accounts,
an appointment, invoice, medicine, prescription, vitals, and administration
event and does not clean them up. Set
`RUN_GEMINI_E2E=true` to also make live Gemini requests.
Deleting a linked patient, doctor, nurse, or receptionist profile also deletes
its user account only when no protected clinical audit record prevents it.
Patient records with appointment, prescription, billing, or vitals history
cannot be deleted, and prescription items with administration records cannot
be replaced or deleted.

Apply checked-in PostgreSQL schema updates before deploying the backend:
`npx prisma migrate deploy`.

### Synthetic dashboard seed

From the backend directory (Node.js 22.6 or newer), run
`npx prisma db seed` against a non-production database to create deterministic,
repeatable demo accounts and dashboard data.
The seed refuses `NODE_ENV=production`, uses the demo password
`Password123!` (bcrypt cost 10), and prints a Markdown login table.
`FRONTEND_BASE_URL` controls the dashboard links and defaults to
`http://localhost:3001`. It refuses to take over an existing account or
inventory item that has a matching email/name but a different ID. Re-running
updates only records owned by this seed. These shared credentials are for
non-production testing only.

The current Prisma schema does not have `IN_QUEUE` or `IN_CONSULTATION`
appointment states; the seed represents those dashboard workflow buckets with
`CONFIRMED` (three patients) and `PENDING` (two patients), respectively. The
schema has no blood-group, medicine-expiry, dosage-unit, or appointment-to-bill
fields; blood group is included in the synthetic patient's medical-history
text, available medicine details are stored in description/name, and billing is
linked to each patient with itemized charges. `PENDING` billing represents both
unpaid and partially paid balances; `PAID` requires paidAmount to equal the
invoice total. Medication administration is represented by persisted
administration events, as the schema has no separate administered status.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Auto-instrument your application with [NestJS Observe](https://observe.nestjs.com). Distributed tracing, metrics, and logging made easy. Error tracking and performance monitoring for your NestJS applications.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
