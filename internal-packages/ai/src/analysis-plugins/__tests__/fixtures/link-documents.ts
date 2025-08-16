export const linkDocuments = {
  withValidLinks: `# Useful Development Resources

## Documentation

The official React documentation can be found at [https://react.dev/](https://react.dev/). It provides comprehensive guides and API references.

For TypeScript, visit [https://www.typescriptlang.org/](https://www.typescriptlang.org/) for the latest documentation and playground.

## Learning Platforms

GitHub offers excellent resources at [https://github.com/](https://github.com/) for code hosting and collaboration.

Stack Overflow [https://stackoverflow.com/](https://stackoverflow.com/) remains the go-to platform for programming questions.

## Package Managers

NPM registry: [https://www.npmjs.com/](https://www.npmjs.com/)
PyPI for Python: [https://pypi.org/](https://pypi.org/)

## Cloud Providers

AWS Console: [https://aws.amazon.com/](https://aws.amazon.com/)
Google Cloud: [https://cloud.google.com/](https://cloud.google.com/)
Microsoft Azure: [https://azure.microsoft.com/](https://azure.microsoft.com/)`,

  withBrokenLinks: `# Outdated Technical References

## Deprecated Documentation

The old Angular.js documentation was at [https://angularjs.org/docs/oldversion](https://angularjs.org/docs/oldversion) but this page no longer exists.

Check out this tutorial at [https://example-tutorial-site.com/nonexistent-page](https://example-tutorial-site.com/nonexistent-page) for more information.

## Broken Resources

The API documentation is available at [https://api.example.com/v1/docs/missing](https://api.example.com/v1/docs/missing).

Download the SDK from [https://downloads.example.org/sdk-v2.5.tar.gz](https://downloads.example.org/sdk-v2.5.tar.gz).

## Invalid Links

Conference slides: [https://conference2019.invalid/slides/day1/keynote.pdf](https://conference2019.invalid/slides/day1/keynote.pdf)

Research paper: [https://arxiv.org/abs/1234.56789](https://arxiv.org/abs/1234.56789) (invalid arXiv ID format)

## Malformed URLs

Project homepage: [htp://malformed-protocol.com](htp://malformed-protocol.com)
Documentation: [www.missing-protocol-site.com/docs](www.missing-protocol-site.com/docs)
Resource: [https://incomplete-url.](https://incomplete-url.)`,

  withMixedLinks: `# Development Resources Guide

## Working Links

The official Node.js documentation is at [https://nodejs.org/docs/](https://nodejs.org/docs/).

MDN Web Docs provides excellent JavaScript references at [https://developer.mozilla.org/](https://developer.mozilla.org/).

## Potentially Broken Links

Legacy documentation might still be available at [https://legacy.example.com/old-docs](https://legacy.example.com/old-docs).

The archived version can be found at [https://web.archive.org/web/20150101/http://oldsite.com](https://web.archive.org/web/20150101/http://oldsite.com).

## Internal References

See our internal wiki at [https://internal.company.com/wiki](https://internal.company.com/wiki) (requires VPN access).

Development server: [http://localhost:3000/api/docs](http://localhost:3000/api/docs) (only accessible locally).

## External Resources

Python documentation: [https://docs.python.org/3/](https://docs.python.org/3/)
Ruby gems: [https://rubygems.org/](https://rubygems.org/)
Docker Hub: [https://hub.docker.com/](https://hub.docker.com/)`,

  withoutLinks: `# Pure Text Documentation

## Introduction

This document contains important technical information but does not include any external links or URLs.

## Technical Specifications

Our system uses a microservices architecture with the following components:
- API Gateway for request routing
- Authentication service for user management
- Database service for data persistence
- Message queue for asynchronous processing

## Implementation Details

The implementation follows clean architecture principles with clear separation of concerns. Each service is containerized and deployed using Kubernetes for orchestration.

## Performance Metrics

Current system performance:
- Average response time: 200ms
- Throughput: 10,000 requests per second
- Uptime: 99.9%
- Database query time: 50ms average

## Conclusion

This architecture provides scalability, maintainability, and reliability for our production environment.`
};