import type { Logger } from "@/infrastructure/logging/logger";
import type { Agent, AgentInput, AgentVersion } from "@roast/ai";
import type { AgentReview } from "@/shared/types/evaluationSchema";
import { Result, ValidationError, AppError } from "@roast/domain";
import type { AgentRepository } from "@/infrastructure/database/repositories/AgentRepository";

export interface AgentDocument {
  id: string;
  title: string;
  author: string;
  publishedDate?: Date;
  evaluationId: string;
  evaluationCreatedAt: Date;
  summary?: string;
  analysis?: string;
  grade?: number;
  jobStatus?: string;
  jobCreatedAt?: Date;
  jobCompletedAt?: Date;
  priceInDollars?: string | null;
}

export interface AgentEvaluation {
  id: string;
  evaluationId: string;
  documentId: string;
  documentTitle: string;
  documentAuthor: string;
  agentVersion: number | string;
  agentVersionName?: string;
  evaluationVersion?: number;
  summary?: string | null;
  analysis?: string | null;
  grade?: number | null;
  selfCritique?: string | null;
  createdAt: Date;
  jobStatus?: string;
  jobCreatedAt?: Date | null;
  jobCompletedAt?: Date | null;
  priceInDollars?: string | null;
  comments: any[];
  job?: any;
}

export class AgentService {
  constructor(
    private agentRepository: AgentRepository,
    private logger: Logger
  ) {}

  /**
   * Creates a new agent with validation
   */
  async createAgent(data: AgentInput, userId: string): Promise<Result<Agent, AppError>> {
    try {
      this.logger.info('Creating new agent', { 
        name: data.name, 
        userId,
        hasInstructions: !!data.primaryInstructions 
      });

      // Validate required fields
      if (!data.name?.trim()) {
        return Result.fail(new ValidationError("Agent name is required"));
      }

      if (!data.description?.trim()) {
        return Result.fail(new ValidationError("Agent description is required"));
      }

      if (!data.primaryInstructions?.trim()) {
        return Result.fail(new ValidationError("Primary instructions are required"));
      }

      // Validate name length
      if (data.name.length > 200) {
        return Result.fail(new ValidationError("Agent name must be 200 characters or less"));
      }

      // Validate description length
      if (data.description.length > 1000) {
        return Result.fail(new ValidationError("Agent description must be 1000 characters or less"));
      }

      const agentResult = await this.agentRepository.createAgent(data, userId);
      
      if (agentResult.isError()) {
        return agentResult;
      }

      const agent = agentResult.unwrap();
      
      this.logger.info('Agent created successfully', { 
        agentId: agent.id, 
        name: agent.name,
        userId 
      });

      return Result.ok(agent);
    } catch (error) {
      this.logger.error('Error creating agent', { error, userId, agentName: data.name });
      
      if (error instanceof ValidationError) {
        return Result.fail(error);
      }
      
      return Result.fail(new AppError("Failed to create agent", "AGENT_CREATE_ERROR"));
    }
  }

  /**
   * Updates an existing agent with validation
   */
  async updateAgent(agentId: string, data: AgentInput, userId: string): Promise<Result<Agent, AppError>> {
    try {
      this.logger.info('Updating agent', { agentId, userId });

      // Validate required fields
      if (!data.name?.trim()) {
        return Result.fail(new ValidationError("Agent name is required"));
      }

      if (!data.description?.trim()) {
        return Result.fail(new ValidationError("Agent description is required"));
      }

      if (!data.primaryInstructions?.trim()) {
        return Result.fail(new ValidationError("Primary instructions are required"));
      }

      // Validate name length
      if (data.name.length > 200) {
        return Result.fail(new ValidationError("Agent name must be 200 characters or less"));
      }

      // Validate description length
      if (data.description.length > 1000) {
        return Result.fail(new ValidationError("Agent description must be 1000 characters or less"));
      }

      const agentResult = await this.agentRepository.updateAgent(agentId, data, userId);
      
      if (agentResult.isError()) {
        return agentResult;
      }

      const agent = agentResult.unwrap();
      
      this.logger.info('Agent updated successfully', { 
        agentId, 
        name: agent.name,
        version: agent.version,
        userId 
      });

      return Result.ok(agent);
    } catch (error) {
      this.logger.error('Error updating agent', { error, agentId, userId });
      
      return Result.fail(new AppError("Failed to update agent", "AGENT_UPDATE_ERROR"));
    }
  }

  /**
   * Gets an agent with owner information and permission checking
   */
  async getAgentWithOwner(agentId: string, currentUserId?: string): Promise<Result<Agent | null, AppError>> {
    try {
      this.logger.debug('Fetching agent with owner', { agentId, currentUserId });

      const agentResult = await this.agentRepository.getAgentWithOwner(agentId);
      
      if (agentResult.isError()) {
        return agentResult;
      }

      const agent = agentResult.unwrap();
      
      if (!agent) {
        return Result.ok(null);
      }

      // Add ownership flag if currentUserId is provided
      if (currentUserId && agent && agent.owner) {
        (agent as any).isOwner = currentUserId === agent.owner.id;
      }

      return Result.ok(agent);
    } catch (error) {
      this.logger.error('Error fetching agent', { error, agentId, currentUserId });
      return Result.fail(new AppError("Failed to fetch agent", "AGENT_FETCH_ERROR"));
    }
  }

  /**
   * Gets all versions of an agent
   */
  async getAgentVersions(agentId: string): Promise<Result<AgentVersion[], AppError>> {
    try {
      this.logger.debug('Fetching agent versions', { agentId });

      const versionsResult = await this.agentRepository.getAgentVersions(agentId);
      
      if (versionsResult.isError()) {
        return versionsResult;
      }

      return Result.ok(versionsResult.unwrap());
    } catch (error) {
      this.logger.error('Error fetching agent versions', { error, agentId });
      return Result.fail(new AppError("Failed to fetch agent versions", "AGENT_VERSIONS_FETCH_ERROR"));
    }
  }

  /**
   * Gets the latest review for an agent
   */
  async getAgentReview(agentId: string): Promise<Result<AgentReview | null, AppError>> {
    try {
      this.logger.debug('Fetching agent review', { agentId });

      const reviewResult = await this.agentRepository.getAgentReview(agentId);
      
      if (reviewResult.isError()) {
        return reviewResult;
      }

      return Result.ok(reviewResult.unwrap());
    } catch (error) {
      this.logger.error('Error fetching agent review', { error, agentId });
      return Result.fail(new AppError("Failed to fetch agent review", "AGENT_REVIEW_FETCH_ERROR"));
    }
  }

  /**
   * Gets documents evaluated by an agent
   */
  async getAgentDocuments(agentId: string, limit: number = 40): Promise<Result<AgentDocument[], AppError>> {
    try {
      this.logger.debug('Fetching agent documents', { agentId, limit });

      const documentsResult = await this.agentRepository.getAgentDocuments(agentId, limit);
      
      if (documentsResult.isError()) {
        return documentsResult;
      }

      return Result.ok(documentsResult.unwrap());
    } catch (error) {
      this.logger.error('Error fetching agent documents', { error, agentId, limit });
      return Result.fail(new AppError("Failed to fetch agent documents", "AGENT_DOCUMENTS_FETCH_ERROR"));
    }
  }

  /**
   * Gets all non-ephemeral agents
   */
  async getAllAgents(): Promise<Result<Array<{ 
    id: string; 
    name: string; 
    version: string; 
    description: string;
    isRecommended: boolean;
    isDeprecated: boolean;
    isSystemManaged: boolean;
    providesGrades: boolean;
  }>, AppError>> {
    try {
      this.logger.debug('Fetching all agents');

      const agentsResult = await this.agentRepository.getAllAgents();
      
      if (agentsResult.isError()) {
        return agentsResult;
      }

      return Result.ok(agentsResult.unwrap());
    } catch (error) {
      this.logger.error('Error fetching all agents', { error });
      return Result.fail(new AppError("Failed to fetch agents", "AGENTS_FETCH_ERROR"));
    }
  }

  /**
   * Gets evaluations performed by an agent
   */
  async getAgentEvaluations(
    agentId: string, 
    options?: { limit?: number; batchId?: string }
  ): Promise<Result<AgentEvaluation[], AppError>> {
    try {
      this.logger.debug('Fetching agent evaluations', { agentId, options });

      const evaluationsResult = await this.agentRepository.getAgentEvaluations(agentId, options);
      
      if (evaluationsResult.isError()) {
        return evaluationsResult;
      }

      return Result.ok(evaluationsResult.unwrap());
    } catch (error) {
      this.logger.error('Error fetching agent evaluations', { error, agentId, options });
      return Result.fail(new AppError("Failed to fetch agent evaluations", "AGENT_EVALUATIONS_FETCH_ERROR"));
    }
  }
}