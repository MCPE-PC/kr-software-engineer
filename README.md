# kr-software-engineer

![Maintained as of 2024](https://img.shields.io/maintenance/yes/2024)

:wave: Target: [소프트웨어기술자 경력관리시스템](https://career.sw.or.kr/) (Korean)

## Environment

- Node.js >= 20
- [Puppeteer system requirements](https://pptr.dev/guides/system-requirements)

## Install

```sh
npm install kr-software-engineer
```

## Simple

```typescript
import EngineerAccountController from 'kr-software-engineer';

// Personal account
const account = await EngineerAccountController.start('ID', 'Password');

console.log(
  await account.fetchExpertises(),
  await account.fetchCertificateIssueRequests()
);

await account.finalize();
```

## Enums

- AccountType
- ExpertiseSection
- VerificationStatus
- ProofingMethod
- RegistrationRequestProcess
- CertificateTakeoutMethod
- CertificatePrintStatus

## To-Dos

- [ ] Add validation and better type when fetching
- [ ] Support more API
- [ ] Use REST API for some operations for faster operation
