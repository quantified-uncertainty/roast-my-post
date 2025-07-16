import { createToolRoute } from '@/tools/base/createToolRoute';
import ExtractFactualClaimsTool from '@/tools/extract-factual-claims';

export const POST = createToolRoute(ExtractFactualClaimsTool);