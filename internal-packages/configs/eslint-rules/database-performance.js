/**
 * ESLint rules for database performance and safety based on codebase analysis
 */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce database performance and safety patterns',
      category: 'Performance',
    },
    fixable: null,
    schema: [],
    messages: {
      newPrismaClient: 'Creating new PrismaClient instances creates connection pool overhead. Import from @/lib/prisma instead.',
      missingPagination: 'findMany() without pagination can cause memory issues. Add take/skip parameters.',
      deepIncludes: 'Deep nested includes (>3 levels) can cause performance issues. Consider separate queries or optimization.',
      missingTransaction: 'Multiple database operations should be wrapped in a transaction for data consistency.',
      unsafeRawQuery: 'Raw SQL queries are dangerous. Use Prisma query builders or add proper sanitization.',
      inefficientQuery: 'Query pattern may be inefficient. Consider using select instead of fetching full objects.',
    },
  },

  create(context) {
    return {
      // Ban new PrismaClient()
      NewExpression(node) {
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'PrismaClient'
        ) {
          context.report({
            node,
            messageId: 'newPrismaClient',
          });
        }
      },

      // Check for findMany without pagination
      CallExpression(node) {
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.property.name === 'findMany'
        ) {
          const args = node.arguments;
          
          if (args.length === 0) {
            context.report({
              node,
              messageId: 'missingPagination',
            });
            return;
          }

          const queryObject = args[0];
          if (queryObject.type === 'ObjectExpression') {
            const hasTake = queryObject.properties.some(prop => 
              prop.type === 'Property' && prop.key.name === 'take'
            );
            const hasSkip = queryObject.properties.some(prop => 
              prop.type === 'Property' && prop.key.name === 'skip'
            );
            
            if (!hasTake && !hasSkip) {
              context.report({
                node,
                messageId: 'missingPagination',
              });
            }

            // Check for deep includes
            const includeProperty = queryObject.properties.find(prop => 
              prop.type === 'Property' && prop.key.name === 'include'
            );
            
            if (includeProperty) {
              const depth = this.calculateIncludeDepth(includeProperty.value);
              if (depth > 3) {
                context.report({
                  node: includeProperty,
                  messageId: 'deepIncludes',
                });
              }
            }
          }
        }

        // Check for raw queries
        if (
          node.callee.type === 'MemberExpression' &&
          (node.callee.property.name === '$queryRaw' || 
           node.callee.property.name === '$executeRaw')
        ) {
          context.report({
            node,
            messageId: 'unsafeRawQuery',
          });
        }

        // Check for inefficient patterns (fetching full objects when only few fields needed)
        if (
          node.callee.type === 'MemberExpression' &&
          (node.callee.property.name === 'findMany' || 
           node.callee.property.name === 'findFirst' ||
           node.callee.property.name === 'findUnique')
        ) {
          const args = node.arguments;
          if (args.length > 0 && args[0].type === 'ObjectExpression') {
            const queryObject = args[0];
            const hasSelect = queryObject.properties.some(prop => 
              prop.type === 'Property' && prop.key.name === 'select'
            );
            const hasInclude = queryObject.properties.some(prop => 
              prop.type === 'Property' && prop.key.name === 'include'
            );
            
            // If using include but not select, suggest optimization
            if (hasInclude && !hasSelect) {
              const includeProperty = queryObject.properties.find(prop => 
                prop.type === 'Property' && prop.key.name === 'include'
              );
              const includeSize = this.getObjectPropertyCount(includeProperty.value);
              
              if (includeSize > 2) {
                context.report({
                  node: includeProperty,
                  messageId: 'inefficientQuery',
                });
              }
            }
          }
        }
      },

      // Check for multiple DB operations that should be in transactions
      BlockStatement(node) {
        const dbOperations = [];
        
        node.body.forEach(statement => {
          if (this.isDbOperation(statement)) {
            dbOperations.push(statement);
          }
        });
        
        // If 3+ DB operations in same block, suggest transaction
        if (dbOperations.length >= 3) {
          const hasTransaction = node.body.some(statement => 
            this.isTransactionBlock(statement)
          );
          
          if (!hasTransaction) {
            context.report({
              node: dbOperations[0],
              messageId: 'missingTransaction',
            });
          }
        }
      },
    };
  },

  // Helper methods
  calculateIncludeDepth(node, currentDepth = 1) {
    if (node.type !== 'ObjectExpression') return currentDepth;
    
    let maxDepth = currentDepth;
    
    node.properties.forEach(prop => {
      if (prop.type === 'Property' && prop.key.name === 'include') {
        const nestedDepth = this.calculateIncludeDepth(prop.value, currentDepth + 1);
        maxDepth = Math.max(maxDepth, nestedDepth);
      }
    });
    
    return maxDepth;
  },

  getObjectPropertyCount(node) {
    if (node.type !== 'ObjectExpression') return 0;
    return node.properties.length;
  },

  isDbOperation(statement) {
    if (statement.type !== 'ExpressionStatement') return false;
    
    const expr = statement.expression;
    if (expr.type === 'AwaitExpression') {
      const awaited = expr.argument;
      if (awaited.type === 'CallExpression' && awaited.callee.type === 'MemberExpression') {
        const objectName = awaited.callee.object.name;
        const methodName = awaited.callee.property.name;
        
        return objectName === 'prisma' && (
          methodName.startsWith('find') ||
          methodName.startsWith('create') ||
          methodName.startsWith('update') ||
          methodName.startsWith('delete') ||
          methodName.startsWith('upsert')
        );
      }
    }
    
    return false;
  },

  isTransactionBlock(statement) {
    if (statement.type !== 'ExpressionStatement') return false;
    
    const expr = statement.expression;
    if (expr.type === 'AwaitExpression') {
      const awaited = expr.argument;
      if (awaited.type === 'CallExpression' && awaited.callee.type === 'MemberExpression') {
        return awaited.callee.property.name === '$transaction';
      }
    }
    
    return false;
  },
};