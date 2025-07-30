/**
 * ESLint rule to enforce consistent authentication in API routes
 * Prevents direct use of auth() in API routes - requires authenticateRequest or withAuth wrapper
 */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce consistent authentication in API routes',
      category: 'Security',
    },
    fixable: null,
    schema: [],
    messages: {
      directAuthUsage: 'Direct usage of auth() in API routes is forbidden. Use authenticateRequest() or withAuth() wrapper instead for consistent API key + session authentication.',
      missingAuth: 'API route exports a handler but has no authentication. Use withAuth() wrapper or authenticateRequest().',
    },
  },

  create(context) {
    let hasDirectAuth = false;
    let hasProperAuth = false;
    let hasExportedHandler = false;
    
    return {
      // Check for direct auth() usage
      CallExpression(node) {
        if (node.callee.name === 'auth' && node.arguments.length === 0) {
          hasDirectAuth = true;
          context.report({
            node,
            messageId: 'directAuthUsage',
          });
        }
      },

      // Check for proper auth patterns
      ImportDeclaration(node) {
        if (node.source.value === '@/lib/auth-helpers' || node.source.value === '@/lib/auth-wrapper') {
          const imports = node.specifiers.map(spec => spec.imported?.name || spec.local.name);
          if (imports.includes('authenticateRequest') || imports.includes('withAuth')) {
            hasProperAuth = true;
          }
        }
      },

      // Check for exported handlers
      ExportNamedDeclaration(node) {
        if (node.declaration && node.declaration.type === 'VariableDeclaration') {
          const declarations = node.declaration.declarations;
          for (const decl of declarations) {
            if (decl.id.name === 'GET' || decl.id.name === 'POST' || 
                decl.id.name === 'PUT' || decl.id.name === 'DELETE' || 
                decl.id.name === 'PATCH') {
              hasExportedHandler = true;
            }
          }
        }
      },

      // Check at end of file
      'Program:exit'() {
        const filename = context.getFilename();
        const isApiRoute = filename.includes('/api/') && filename.endsWith('/route.ts');
        
        if (isApiRoute && hasExportedHandler && !hasProperAuth && !hasDirectAuth) {
          context.report({
            loc: { line: 1, column: 0 },
            messageId: 'missingAuth',
          });
        }
      },
    };
  },
};