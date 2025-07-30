/**
 * ESLint rules for API route security based on codebase analysis
 */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce security patterns in API routes',
      category: 'Security',
    },
    fixable: null,
    schema: [],
    messages: {
      missingInputValidation: 'API route uses request.json() without Zod validation. Add schema validation before parsing.',
      rawErrorExposure: 'Raw error message exposed to client. Use sanitized error helpers from @/lib/api-response-helpers.',
      unsafeComparison: 'Security-sensitive comparison should use crypto.timingSafeEqual() to prevent timing attacks.',
      missingRateLimit: 'Public API route missing rate limiting. Add rate limit protection.',
      exposeSensitiveData: 'API route may expose sensitive data. Ensure proper filtering of response fields.',
    },
  },

  create(context) {
    const filename = context.getFilename();
    const isApiRoute = filename.includes('/api/') && filename.endsWith('/route.ts');
    
    if (!isApiRoute) return {};

    let hasRequestJsonCall = false;
    let hasZodValidation = false;
    let hasImportFromApiHelpers = false;

    return {
      // Check for Zod imports
      ImportDeclaration(node) {
        if (node.source.value === 'zod') {
          hasZodValidation = true;
        }
        if (node.source.value === '@/lib/api-response-helpers') {
          hasImportFromApiHelpers = true;
        }
      },

      // Check for request.json() calls
      CallExpression(node) {
        // Check for request.json() without validation
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.property.name === 'json' &&
          node.callee.object.name === 'request'
        ) {
          hasRequestJsonCall = true;
        }

        // Check for raw error exposure
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.object.name === 'NextResponse' &&
          node.callee.property.name === 'json' &&
          node.arguments.length > 0
        ) {
          const firstArg = node.arguments[0];
          if (
            firstArg.type === 'ObjectExpression' &&
            firstArg.properties.some(prop => 
              prop.type === 'Property' && 
              prop.key.name === 'error' &&
              prop.value.type === 'ConditionalExpression' &&
              prop.value.test.type === 'BinaryExpression' &&
              prop.value.test.left.type === 'BinaryExpression' &&
              prop.value.test.left.left.name === 'error'
            )
          ) {
            context.report({
              node,
              messageId: 'rawErrorExposure',
            });
          }
        }

        // Check for unsafe string comparisons in security contexts
        if (
          node.callee.type === 'BinaryExpression' &&
          node.callee.operator === '===' &&
          node.callee.left.type === 'MemberExpression' &&
          (node.callee.left.property.name === 'key' || 
           node.callee.left.property.name === 'password' ||
           node.callee.left.property.name === 'token')
        ) {
          context.report({
            node,
            messageId: 'unsafeComparison',
          });
        }
      },

      // Check for binary expressions (unsafe comparisons)
      BinaryExpression(node) {
        if (
          node.operator === '===' &&
          ((node.left.type === 'Identifier' && 
            (node.left.name.includes('key') || node.left.name.includes('password'))) ||
           (node.right.type === 'Identifier' && 
            (node.right.name.includes('key') || node.right.name.includes('password'))))
        ) {
          context.report({
            node,
            messageId: 'unsafeComparison',
          });
        }
      },

      // Check at end of file
      'Program:exit'() {
        if (hasRequestJsonCall && !hasZodValidation) {
          context.report({
            loc: { line: 1, column: 0 },
            messageId: 'missingInputValidation',
          });
        }
      },
    };
  },
};