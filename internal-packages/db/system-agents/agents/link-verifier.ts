import { SystemAgentDefinition } from '../types';
import { PluginType } from '../../../ai/src/analysis-plugins/types/plugin-types';

export const linkVerifierAgent: SystemAgentDefinition = {
  id: 'system-link-verifier',
  name: 'Link Verifier',
  description: 'Validates external links in documents, checking for broken URLs, redirects, and accessibility issues',
  providesGrades: false, // Plugin-based agents don't provide grades
  pluginIds: [PluginType.LINK_ANALYSIS],
  readme: `# Link Verifier

An automated link validation agent that checks all external URLs in documents for accessibility, validity, and potential issues. Provides detailed reporting on broken links, redirects, and connection problems.

## How It Works

Extracts all external URLs from the document and validates each one by checking HTTP status codes and following redirects. The agent identifies broken links (404s), server errors (5xx), excessive redirects, and connection timeouts. Results are provided with exact text locations for easy correction.

## Capabilities

- **Comprehensive URL extraction** - Finds all external links in markdown, HTML, and plain text formats
- **Status code validation** - Checks HTTP/HTTPS responses and categorizes issues
- **Redirect chain analysis** - Follows and reports redirect chains up to reasonable limits
- **Timeout handling** - Gracefully handles slow or unresponsive servers
- **Bulk processing** - Efficiently validates multiple URLs with parallel checking
- **Detailed reporting** - Provides exact link text and surrounding context for each issue

## Technical Details

- **URL limit:** 50 links by default (configurable)
- **Timeout:** 10 seconds per URL check
- **Redirect limit:** Maximum 5 redirects followed
- **Supported protocols:** HTTP, HTTPS
- **Grade calculation:** Based on percentage of working links (100% = grade 100)
- **Error categories:** 404 Not Found, 5xx Server Errors, Connection Timeouts, Too Many Redirects`,
};