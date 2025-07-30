/**
 * ESLint rules for consistent error handling based on codebase analysis
 */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce consistent error handling patterns',
      category: 'Error Handling',
    },
    fixable: null,
    schema: [],
    messages: {
      emptyCatchBlock: 'Empty catch block hides errors. Add proper error handling or logging.',
      inconsistentErrorResponse: 'Use standardized error helpers from @/lib/api-response-helpers instead of manual NextResponse.json.',
      consoleLogInProduction: 'Console.log statements should not be in production code. Use structured logging instead.',
      missingErrorBoundary: 'Component should be wrapped in error boundary or have error handling.',
      unhandledPromise: 'Promise without .catch() handler can cause unhandled rejections.',
      genericErrorMessage: 'Generic error messages provide no debugging value. Include specific error context.',
    },
  },

  create(context) {
    const filename = context.getFilename();
    const isApiRoute = filename.includes('/api/') && filename.endsWith('/route.ts');
    const isComponent = filename.includes('/components/') || filename.includes('/app/');

    return {
      // Check for empty catch blocks
      CatchClause(node) {
        if (
          node.body.type === 'BlockStatement' &&
          node.body.body.length === 0
        ) {
          context.report({
            node,
            messageId: 'emptyCatchBlock',
          });
        }

        // Check for generic error messages
        if (node.body.type === 'BlockStatement') {
          node.body.body.forEach(statement => {
            if (this.hasGenericErrorMessage(statement)) {
              context.report({
                node: statement,
                messageId: 'genericErrorMessage',
              });
            }
          });
        }
      },

      // Check for inconsistent error responses in API routes
      CallExpression(node) {
        if (isApiRoute && this.isManualErrorResponse(node)) {
          context.report({
            node,
            messageId: 'inconsistentErrorResponse',
          });
        }

        // Check for console.log usage
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.object.name === 'console' &&
          (node.callee.property.name === 'log' || node.callee.property.name === 'error')
        ) {
          // Allow console.error in catch blocks for debugging
          const inCatchBlock = this.isInCatchBlock(node);
          const inDevelopment = this.isDevelopmentOnly(node);
          
          if (!inCatchBlock && !inDevelopment) {
            context.report({
              node,
              messageId: 'consoleLogInProduction',
            });
          }
        }

        // Check for unhandled promises
        if (
          node.callee.type === 'MemberExpression' &&
          (node.callee.property.name === 'then' || 
           node.callee.property.name === 'catch')
        ) {
          const hasErrorHandler = this.hasChainedCatch(node);
          
          if (node.callee.property.name === 'then' && !hasErrorHandler) {
            context.report({
              node,
              messageId: 'unhandledPromise',
            });
          }
        }
      },

      // Check for missing error boundaries in components
      FunctionDeclaration(node) {
        if (isComponent && this.isReactComponent(node)) {
          const hasErrorHandling = this.hasErrorHandling(node);
          
          if (!hasErrorHandling) {
            context.report({
              node: node.id,
              messageId: 'missingErrorBoundary',
            });
          }
        }
      },

      // Check arrow function components
      VariableDeclarator(node) {
        if (
          isComponent &&
          node.init &&
          node.init.type === 'ArrowFunctionExpression' &&
          this.isReactComponent(node)
        ) {
          const hasErrorHandling = this.hasErrorHandling(node.init);
          
          if (!hasErrorHandling) {
            context.report({
              node: node.id,
              messageId: 'missingErrorBoundary',
            });
          }
        }
      },
    };
  },

  // Helper methods
  isManualErrorResponse(node) {
    return (
      node.callee.type === 'MemberExpression' &&
      node.callee.object.name === 'NextResponse' &&
      node.callee.property.name === 'json' &&
      node.arguments.length > 0 &&
      node.arguments[0].type === 'ObjectExpression' &&
      node.arguments[0].properties.some(prop => 
        prop.type === 'Property' && prop.key.name === 'error'
      )
    );
  },

  hasGenericErrorMessage(statement) {
    if (statement.type !== 'ExpressionStatement') return false;
    
    const sourceCode = statement.parent.parent.parent.getSourceCode();
    const text = sourceCode.getText(statement);
    
    const genericMessages = [
      '"An error occurred"',
      '"Something went wrong"',
      '"Error"',
      '"Internal server error"',
      '"Unknown error"'
    ];
    
    return genericMessages.some(msg => text.includes(msg));
  },

  isInCatchBlock(node) {
    let parent = node.parent;
    while (parent) {
      if (parent.type === 'CatchClause') {
        return true;
      }
      parent = parent.parent;
    }
    return false;
  },

  isDevelopmentOnly(node) {
    const sourceCode = node.parent.parent.parent.getSourceCode();
    const text = sourceCode.getText();
    
    // Look for development environment checks
    return (
      text.includes('process.env.NODE_ENV === "development"') ||
      text.includes('__DEV__') ||
      text.includes('development')
    );
  },

  hasChainedCatch(node) {
    let current = node.parent;
    while (current && current.type === 'CallExpression') {
      if (
        current.callee.type === 'MemberExpression' &&
        current.callee.property.name === 'catch'
      ) {
        return true;
      }
      current = current.parent;
    }
    return false;
  },

  isReactComponent(node) {
    if (node.type === 'FunctionDeclaration') {
      return node.id && node.id.name[0] === node.id.name[0].toUpperCase();
    }
    if (node.type === 'VariableDeclarator') {
      return node.id.name[0] === node.id.name[0].toUpperCase();
    }
    return false;
  },

  hasErrorHandling(node) {
    const sourceCode = node.parent.parent.parent.getSourceCode();
    const text = sourceCode.getText(node);
    
    return (
      text.includes('try') ||
      text.includes('catch') ||
      text.includes('ErrorBoundary') ||
      text.includes('error') ||
      text.includes('Error')
    );
  },
};