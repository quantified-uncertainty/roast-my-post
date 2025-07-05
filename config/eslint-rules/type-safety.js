/**
 * ESLint rules for enhanced type safety based on codebase analysis
 */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce strict type safety patterns',
      category: 'Type Safety',
    },
    fixable: null,
    schema: [],
    messages: {
      unsafeTypeAssertion: 'Type assertion without runtime validation. Add Zod schema validation before assertion.',
      missingReturnType: 'Function missing explicit return type. Add return type annotation for better type safety.',
      bannedTsIgnore: 'Use of @ts-ignore bypasses type safety. Fix the type issue instead or use @ts-expect-error with explanation.',
      anyTypeUsage: 'Usage of "any" type defeats TypeScript benefits. Use specific types or unknown instead.',
      unsafeOptionalChaining: 'Optional chaining without null check may hide runtime errors. Add explicit null checks.',
    },
  },

  create(context) {
    return {
      // Ban unsafe type assertions
      TSTypeAssertion(node) {
        // Look for type assertions not preceded by validation
        const parent = node.parent;
        const grandParent = parent?.parent;
        
        // Check if there's a Zod parse/validation nearby
        const hasValidation = this.hasNearbyValidation(node, context);
        
        if (!hasValidation) {
          context.report({
            node,
            messageId: 'unsafeTypeAssertion',
          });
        }
      },

      // Alternative syntax for type assertions
      TSAsExpression(node) {
        const hasValidation = this.hasNearbyValidation(node, context);
        
        if (!hasValidation) {
          context.report({
            node,
            messageId: 'unsafeTypeAssertion',
          });
        }
      },

      // Check for missing return types on functions
      FunctionDeclaration(node) {
        if (!node.returnType && node.id && node.id.name) {
          // Skip if it's a React component (returns JSX)
          const isReactComponent = node.id.name[0] === node.id.name[0].toUpperCase();
          if (!isReactComponent) {
            context.report({
              node: node.id,
              messageId: 'missingReturnType',
            });
          }
        }
      },

      // Check arrow functions for return types
      VariableDeclarator(node) {
        if (
          node.init &&
          node.init.type === 'ArrowFunctionExpression' &&
          !node.init.returnType &&
          node.id.type === 'Identifier'
        ) {
          // Skip React components and simple inline functions
          const isReactComponent = node.id.name[0] === node.id.name[0].toUpperCase();
          const isSimpleExpression = node.init.body.type !== 'BlockStatement';
          
          if (!isReactComponent && !isSimpleExpression) {
            context.report({
              node: node.id,
              messageId: 'missingReturnType',
            });
          }
        }
      },

      // Ban @ts-ignore comments
      Program(node) {
        const sourceCode = context.getSourceCode();
        const comments = sourceCode.getAllComments();
        
        comments.forEach(comment => {
          if (comment.value.trim().startsWith('@ts-ignore')) {
            context.report({
              loc: comment.loc,
              messageId: 'bannedTsIgnore',
            });
          }
        });
      },

      // Enhanced any type detection
      TSAnyKeyword(node) {
        context.report({
          node,
          messageId: 'anyTypeUsage',
        });
      },
    };
  },

  // Helper method to check for nearby validation
  hasNearbyValidation(node, context) {
    const sourceCode = context.getSourceCode();
    const text = sourceCode.getText();
    
    // Look for Zod validation patterns near the assertion
    const nodeStart = node.range[0];
    const contextText = text.slice(Math.max(0, nodeStart - 200), nodeStart + 200);
    
    return (
      contextText.includes('.parse(') ||
      contextText.includes('.safeParse(') ||
      contextText.includes('Schema.parse') ||
      contextText.includes('z.') ||
      contextText.includes('zod')
    );
  },
};